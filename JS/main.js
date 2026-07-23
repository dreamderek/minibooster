window.onload = () => {
    const pages = document.getElementById("pages");
    const tabs = [...document.querySelectorAll(".tab")];
    const optionPanel = document.querySelectorAll("frame-panel")[1];
    const submitBtn = document.getElementById("submitBtn");
    const questionHost = document.getElementById("questionHost");
    const choicesHost = document.getElementById("choices");
    const reviewList = document.getElementById("reviewList");
    const feedbackText = document.getElementById("feedbackText");

    let quizData = null;
    let reviewUnlocked = false;
    let answersLocked = false;
    let gestureStart = null;
    let expandedReviewId = null;

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function mathBlock(text) {
        return `<math-show>${escapeHtml(text)}</math-show>`;
    }

    function mathInline(text) {
        return `<math-show inline>${escapeHtml(text)}</math-show>`;
    }

    function pickRandomQuestion(questions) {
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error("questions array is empty");
        }

        const index = Math.floor(Math.random() * questions.length);
        return questions[index];
    }

    function normalizeQuestion(data, fallback = {}) {
        return {
            ...fallback,
            ...data,
            meta: Array.isArray(data?.meta) ? data.meta : (fallback.meta || []),
        };
    }

    async function fetchJson(path) {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`${path} load failed: HTTP ${response.status}`);
        }

        return await response.json();
    }

    async function loadQuizData() {
        const manifest = await fetchJson("./data/data.json");

        if (Array.isArray(manifest?.questions) && manifest.questions.length > 0) {
            const picked = pickRandomQuestion(manifest.questions);
            if (!picked?.file) {
                throw new Error("picked question is missing file");
            }

            const questionData = await fetchJson(`./data/${picked.file}`);
            return normalizeQuestion(questionData, picked);
        }

        return manifest;
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

    function syncTabState(index) {
        tabs.forEach((tab, i) => tab.classList.toggle("active", i === index));
    }

    function updateNavigationState() {
        pages.style.overflowX = reviewUnlocked ? "auto" : "hidden";
        tabs.forEach((tab) => {
            const target = Number(tab.dataset.go);
            tab.disabled = target === 1 && !reviewUnlocked;
        });
    }

    function snapTo(index) {
        if (index === 1 && !reviewUnlocked) {
            pages.scrollTo({ left: 0, behavior: "smooth" });
            syncTabState(0);
            return false;
        }

        pages.scrollTo({ left: index * pageStep(), behavior: "smooth" });
        syncTabState(index);
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
                        <div class="review-option">
                            <p>${mathInline(option.text)}</p>
                        </div>
                        <div class="review-note ${isExpanded ? "is-open" : ""}" aria-hidden="${isExpanded ? "false" : "true"}">
                            <div class="review-note-inner">
                                <p>
                                    ${mathInline(option.note)}
                                </p>
                            </div>
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

    function bindTabs() {
        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                snapTo(Number(tab.dataset.go));
            });
        });

        pages.addEventListener("scroll", () => {
            const index = Math.round(pages.scrollLeft / pageStep());
            if (!reviewUnlocked && index > 0) {
                pages.scrollLeft = 0;
                syncTabState(0);
                return;
            }

            syncTabState(index);
        });

        pages.addEventListener(
            "touchstart",
            (event) => {
                const point = event.changedTouches[0];
                gestureStart = { x: point.clientX, y: point.clientY };
            },
            { passive: true },
        );

        pages.addEventListener(
            "touchend",
            (event) => {
                if (!gestureStart) return;

                const point = event.changedTouches[0];
                const dx = point.clientX - gestureStart.x;
                const dy = point.clientY - gestureStart.y;
                const current = Math.round(pages.scrollLeft / pageStep());

                if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) {
                    const next = dx < 0 ? Math.min(current + 1, tabs.length - 1) : Math.max(current - 1, 0);
                    snapTo(next);
                }

                gestureStart = null;
            },
            { passive: true },
        );
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

    (async () => {
        try {
            quizData = await loadQuizData();
        } catch (error) {
            console.error(error);
            questionHost.innerHTML = `<div class="analysis-card">題庫載入失敗，請確認 data.json 是否存在且格式正確。</div>`;
            choicesHost.innerHTML = "";
            reviewList.innerHTML = "";
            submitBtn.disabled = true;
            return;
        }

        renderQuestion(quizData);
        renderOptions(quizData);
        bindTabs();
        setInitialState();
        updateNavigationState();
        snapTo(0);
    })();
};
