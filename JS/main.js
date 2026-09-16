window.onload = () => {
    const pages = document.getElementById("pages");
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");
    const PAGE_COUNT = 3;
    const optionPanel = document.querySelectorAll("frame-panel")[1];
    const submitBtn = document.getElementById("submitBtn");
    const nextQuestionBtn = document.getElementById("nextQuestionBtn");
    const questionHost = document.getElementById("questionHost");
    const choicesHost = document.getElementById("choices");
    const reviewList = document.getElementById("reviewList");
    const feedbackText = document.getElementById("feedbackText");

    let quizData = null;
    let currentQuestionId = null;
    let reviewUnlocked = false;
    let answersLocked = false;
    let gestureStart = null;
    let gestureAxis = null;
    let expandedReviewId = null;
    let availableQuestionsPromise = null;
    const QUESTION_NUMBER_MAX = 999;
    const QUESTION_BATCH_SIZE = 20;

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function escapeMathText(text) {
        return escapeHtml(text).replace(/&lt;br\s*\/?&gt;/gi, "<br>");
    }

    function mathBlock(text) {
        return `<math-show>${escapeMathText(text)}</math-show>`;
    }

    function mathInline(text) {
        return `<math-show inline>${escapeMathText(text)}</math-show>`;
    }

    function pickRandomQuestion(questions, excludeId = null) {
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error("questions array is empty");
        }

        const pool = excludeId
            ? questions.filter((question) => question?.id !== excludeId)
            : questions;
        const source = pool.length > 0 ? pool : questions;
        const index = Math.floor(Math.random() * source.length);
        return source[index];
    }

    function normalizeQuestion(data, fallback = {}) {
        return {
            ...fallback,
            ...data,
            meta: Array.isArray(data?.meta) ? data.meta : [],
        };
    }

    async function loadAvailableQuestions() {
        if (availableQuestionsPromise) {
            return availableQuestionsPromise;
        }

        availableQuestionsPromise = (async () => {
            const questions = [];
            let networkFailureCount = 0;

            // q000.json 是編輯器的空白範本；q001.json 至 q999.json 可跳號存在。
            for (let start = 1; start <= QUESTION_NUMBER_MAX; start += QUESTION_BATCH_SIZE) {
                const end = Math.min(start + QUESTION_BATCH_SIZE - 1, QUESTION_NUMBER_MAX);
                const batch = Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
                const loadedQuestions = await Promise.all(batch.map(async (number) => {
                    const id = `q${String(number).padStart(3, "0")}`;
                    const path = `./data/questions/${id}.json`;
                    let response;
                    try {
                        response = await fetch(path, { cache: "no-store" });
                    } catch (error) {
                        networkFailureCount += 1;
                        return null;
                    }

                    if (response.status === 404) {
                        return null;
                    }
                    if (!response.ok) {
                        throw new Error(`${path} load failed: HTTP ${response.status}`);
                    }

                    try {
                        const questionData = await response.json();
                        return normalizeQuestion(questionData, { id });
                    } catch (error) {
                        const contentType = response.headers.get("content-type") || "";
                        if (contentType.includes("text/html")) {
                            return null;
                        }
                        throw new Error(`${path} is not valid JSON`);
                    }
                }));

                questions.push(...loadedQuestions.filter(Boolean));
            }

            if (questions.length === 0) {
                if (networkFailureCount > 0) {
                    throw new Error("無法讀取題目檔；請透過 HTTP 網頁伺服器開啟本頁，不可直接以 file:// 開啟 index.html");
                }
                throw new Error("no question files found in data/questions");
            }

            return questions;
        })();

        return availableQuestionsPromise;
    }

    async function loadQuizData(excludeId = null) {
        const questions = await loadAvailableQuestions();
        return pickRandomQuestion(questions, excludeId);
    }

    function renderQuestion(data) {
        questionHost.innerHTML = `
                <div class="problem">${mathBlock(data.title)}</div>
                <br/>
                <div class="meta-row">
                    ${data.meta.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}
                </div>
            `;
    }

    function renderOptions(data) {
        choicesHost.innerHTML = data.options.map((option) => `
                <label class="choice ${answersLocked ? "is-locked" : ""}">
                    <input type="checkbox" name="answer" value="${escapeHtml(option.id)}" ${answersLocked ? "disabled" : ""} />
                    <span class="choice-id">(${escapeHtml(option.id)})</span>
                    <div class="choice-copy">
                        <div class="choice-text">${mathInline(option.text)}</div>
                    </div>
                </label>
            `).join("");
    }

    function lockAnswers() {
        answersLocked = true;
        document.querySelectorAll('input[name="answer"]').forEach((input) => {
            input.disabled = true;
        });
        document.querySelectorAll(".choice").forEach((choice) => {
            choice.classList.add("is-locked");
        });
    }

    function getSelections() {
        return [...document.querySelectorAll('input[name="answer"]:checked')].map((el) => el.value);
    }

    function pageStep() {
        return pages.clientWidth;
    }

    function syncNavigationControls(index) {
        const pageIndex = Math.max(0, Math.min(index, PAGE_COUNT - 1));
        prevPageBtn.disabled = pageIndex === 0;
        nextPageBtn.disabled = pageIndex === PAGE_COUNT - 1 || !reviewUnlocked;
    }

    function updateNavigationState() {
        pages.style.overflowX = reviewUnlocked ? "auto" : "hidden";
    }

    function snapTo(index) {
        if (index > 0 && !reviewUnlocked) {
            pages.scrollTo({ left: 0, behavior: "smooth" });
            syncNavigationControls(0);
            return false;
        }

        pages.scrollTo({ left: index * pageStep(), behavior: "smooth" });
        syncNavigationControls(index);
        return true;
    }

    function revealReviewPage() {
        reviewUnlocked = true;
        updateNavigationState();

        // Defer the scroll so the browser can apply the unlocked state first.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                snapTo(1);
            });
        });
    }

    function getCombinationKey(selected) {
        return [...selected].sort().join("");
    }

    function getDefaultFeedback(selected) {
        const comboKey = getCombinationKey(selected);
        if (
            quizData?.grading &&
            typeof quizData.grading === "object" &&
            !("correctAnswers" in quizData.grading) &&
            !("tiers" in quizData.grading) &&
            !("optionFeedback" in quizData.grading)
        ) {
            return quizData.grading[comboKey] || "請確認作答後再查看解析";
        }

        return "請確認作答後再查看解析";
    }

    function renderReview(selected) {
        const selectedSet = new Set(selected);

        reviewList.innerHTML = quizData.options.map((option) => {
            const isSelected = selectedSet.has(option.id);
            const isCorrect = Boolean(option.correct);
            const isExpanded = expandedReviewId === option.id;

            return `
                    <button class="review-item ${isExpanded ? "is-expanded" : ""}" type="button" data-review-id="${escapeHtml(option.id)}" aria-expanded="${isExpanded ? "true" : "false"}">
                        <div class="review-head">
                            <div class="review-name">
                                <label class="review-check ${isSelected ? "is-selected" : "is-unselected"}" aria-label="${isSelected ? "已勾選" : "未勾選"}">
                                    <input type="checkbox" ${isSelected ? "checked" : ""} disabled tabindex="-1" />
                                </label>
                                <span>(${escapeHtml(option.id)})</span>
                                <span class="${isCorrect ? "status-ok" : "status-bad"}">${isCorrect ? "正確" : "錯誤"}</span>
                            </div>
                            <span class="review-chevron" aria-hidden="true">▾</span>
                        </div>
                        <div class="review-option"><p>${mathInline(option.text)}</p></div>
                        <div class="review-note ${isExpanded ? "is-open" : ""}" aria-hidden="${isExpanded ? "false" : "true"}">
                            <div class="review-note-inner"><p>${mathInline(option.note)}</p></div>
                        </div>
                    </button>
                `;
        }).join("");

        reviewList.querySelectorAll(".review-item[data-review-id]").forEach((button) => {
            button.addEventListener("click", () => {
                const reviewId = button.dataset.reviewId;
                expandedReviewId = expandedReviewId === reviewId ? null : reviewId;
                renderReview(selected);
            });
        });
    }

    function setInitialState() {
        feedbackText.textContent = "";
        reviewList.innerHTML = "";
    }

    function resetQuestionState() {
        reviewUnlocked = false;
        answersLocked = false;
        expandedReviewId = null;
        updateNavigationState();
        setInitialState();
    }

    async function loadAndRenderQuestion(excludeId = null) {
        quizData = await loadQuizData(excludeId);
        currentQuestionId = quizData?.id || null;
        resetQuestionState();
        renderQuestion(quizData);
        renderOptions(quizData);
        snapTo(0);
    }

    function bindNavigation() {
        pages.addEventListener("scroll", () => {
            const index = Math.round(pages.scrollLeft / pageStep());
            if (!reviewUnlocked && index > 0) {
                pages.scrollLeft = 0;
                syncNavigationControls(0);
                return;
            }

            syncNavigationControls(index);
        });

        pages.addEventListener(
            "touchstart",
            (event) => {
                const point = event.touches[0];
                gestureStart = {
                    x: point.clientX,
                    y: point.clientY,
                    scrollLeft: pages.scrollLeft,
                    time: Date.now(),
                };
                gestureAxis = null;
            },
            { passive: true },
        );

        pages.addEventListener(
            "touchmove",
            (event) => {
                if (!gestureStart) return;

                const point = event.touches[0];
                const dx = point.clientX - gestureStart.x;
                const dy = point.clientY - gestureStart.y;

                if (gestureAxis === null) {
                    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
                    gestureAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
                    if (gestureAxis === "x") {
                        pages.style.scrollSnapType = "none";
                    }
                }

                if (gestureAxis !== "x") return;

                event.preventDefault();
                const maxScroll = reviewUnlocked ? pages.scrollWidth - pages.clientWidth : 0;
                pages.scrollLeft = Math.max(0, Math.min(gestureStart.scrollLeft - dx, maxScroll));
            },
            { passive: false },
        );

        function endGesture(event) {
            if (!gestureStart || gestureAxis !== "x") {
                gestureStart = null;
                gestureAxis = null;
                return;
            }

            const point = event.changedTouches[0];
            const dx = point.clientX - gestureStart.x;
            const elapsed = Date.now() - gestureStart.time;
            const velocity = elapsed > 0 ? dx / elapsed : 0;
            const step = pageStep();
            const startIndex = Math.round(gestureStart.scrollLeft / step);

            let next = startIndex;
            if (Math.abs(dx) > step * 0.2 || Math.abs(velocity) > 0.5) {
                next = dx < 0 ? startIndex + 1 : startIndex - 1;
            }
            next = Math.max(0, Math.min(next, PAGE_COUNT - 1));

            pages.style.scrollSnapType = "x mandatory";
            snapTo(next);

            gestureStart = null;
            gestureAxis = null;
        }

        pages.addEventListener("touchend", endGesture, { passive: true });
        pages.addEventListener("touchcancel", endGesture, { passive: true });

        prevPageBtn.addEventListener("click", () => {
            const current = Math.round(pages.scrollLeft / pageStep());
            snapTo(current - 1);
        });

        nextPageBtn.addEventListener("click", () => {
            const current = Math.round(pages.scrollLeft / pageStep());
            snapTo(current + 1);
        });
    }

    submitBtn.addEventListener("click", () => {
        const selected = getSelections();

        if (selected.length === 0) {
            optionPanel.classList.remove("shake");
            void optionPanel.offsetWidth;
            optionPanel.classList.add("shake");
            feedbackText.textContent = "請先作答後再送出";
            renderReview([]);
            return;
        }

        feedbackText.innerHTML = `<math-show>${getDefaultFeedback(selected)}</math-show>`;
        expandedReviewId = null;
        lockAnswers();
        renderReview(selected);
        revealReviewPage();
    });

    nextQuestionBtn?.addEventListener("click", async () => {
        const originalLabel = nextQuestionBtn.textContent;
        nextQuestionBtn.disabled = true;
        nextQuestionBtn.textContent = "載入中...";

        try {
            await loadAndRenderQuestion(currentQuestionId);
        } catch (error) {
            console.error(error);
            nextQuestionBtn.textContent = "載入失敗";
            setTimeout(() => {
                nextQuestionBtn.textContent = originalLabel;
                nextQuestionBtn.disabled = false;
            }, 1200);
            return;
        }

        nextQuestionBtn.textContent = originalLabel;
        nextQuestionBtn.disabled = false;
    });

    (async () => {
        try {
            await loadAndRenderQuestion();
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? escapeHtml(error.message) : "未知錯誤";
            questionHost.innerHTML = `<div class="analysis-card">題庫載入失敗：${message}</div>`;
            choicesHost.innerHTML = "";
            reviewList.innerHTML = "";
            submitBtn.disabled = true;
            if (nextQuestionBtn) nextQuestionBtn.disabled = true;
            return;
        }

        bindNavigation();
    })();
};
