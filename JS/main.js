window.onload = () => {
    const pages = document.getElementById("pages");
    const tabs = [...document.querySelectorAll(".tab")];
    const questionPanel = document.getElementById("questionPanel");
    const optionPanel = document.getElementById("optionPanel");
    const submitBtn = document.getElementById("submitBtn");
    const questionHost = document.getElementById("questionHost");
    const choicesHost = document.getElementById("choices");
    const reviewList = document.getElementById("reviewList");
    const feedbackText = document.getElementById("feedbackText");

    let quizData = null;

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
                <label class="choice">
                    <input type="checkbox" name="answer" value="${escapeHtml(option.id)}" />
                    <div class="choice-copy">
                        <div class="choice-text">(${escapeHtml(option.id)})  ${mathInline(option.text)}</div>
                    </div>
                </label>
            `).join("");
    }

    function getSelections() {
        return [...document.querySelectorAll('input[name="answer"]:checked')].map((el) => el.value);
    }

    function pageStep() {
        return pages.clientWidth;
    }

    function snapTo(index) {
        pages.scrollTo({ left: index * pageStep(), behavior: "smooth" });
        tabs.forEach((tab, i) => tab.classList.toggle("active", i === index));
    }

    function getCombinationKey(selected) {
        return [...selected].sort().join("");
    }

    function getDefaultFeedback(selected) {
        const comboKey = getCombinationKey(selected);
        if (quizData?.grading && typeof quizData.grading === "object" && !("correctAnswers" in quizData.grading) && !("tiers" in quizData.grading) && !("optionFeedback" in quizData.grading)) {
            return quizData.grading[comboKey] || "此組合尚未提供預設批改內容。";
        }
        return "此題目前採用逐項判定與預設回饋內容。";
    }

    function renderReview(selected) {
        const selectedSet = new Set(selected);

        reviewList.innerHTML = quizData.options.map((option) => {
            const isSelected = selectedSet.has(option.id);
            const isCorrect = Boolean(option.correct);

            return `
                    <div class="review-item">
                        <header>
                            <div class="review-name">
                                <span>(${escapeHtml(option.id)})</span>
                                <span class="${isCorrect ? "status-ok" : "status-bad"}">${isCorrect ? "正確" : "錯誤"}</span>
                                &nbsp;|&nbsp;
                                <span class="${isSelected ? "status-ok" : "status-neutral"}">${isSelected ? "已勾選" : "未勾選"}</span>
                            </div>
                        </header>
                        <p>
                            <span>${mathInline(option.text)}</span>
                        </p>
                    </div>
                `;
        }).join("");
    }

    function setInitialState() {
        feedbackText.textContent = "";
        reviewList.innerHTML = "";
    }

    let gestureStart = null;

    function bindTabs() {
        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                snapTo(Number(tab.dataset.go));
            });
        });

        pages.addEventListener("scroll", () => {
            const index = Math.round(pages.scrollLeft / pageStep());
            tabs.forEach((tab, i) => tab.classList.toggle("active", i === index));
        });

        pages.addEventListener("touchstart", (event) => {
            const point = event.changedTouches[0];
            gestureStart = { x: point.clientX, y: point.clientY };
        }, { passive: true });

        pages.addEventListener("touchend", (event) => {
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
        }, { passive: true });
    }

    submitBtn.addEventListener("click", () => {
        const selected = getSelections();

        if (selected.length === 0) {
            optionPanel.classList.remove("shake");
            void optionPanel.offsetWidth;
            optionPanel.classList.add("shake");
            feedbackText.textContent = "請先勾選答案再送出。";
            renderReview([]);
            return;
        }

        feedbackText.innerHTML = `<math-show>${getDefaultFeedback(selected)}</math-show>`;
        renderReview(selected);
        snapTo(1);
    });

    async function loadQuizData() {
        const response = await fetch("./data.json", { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`data.json load failed: HTTP ${response.status}`);
        }
        return await response.json();
    }

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
        snapTo(0);
    })();
}