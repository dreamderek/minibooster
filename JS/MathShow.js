if (!window.MathJax) {
    window.MathJax = {
        tex: {
            inlineMath: [["\\(", "\\)"]],
            displayMath: [["\\[", "\\]"]],
        },
    };
}

if (!document.getElementById("mathjax-lib")) {
    const script = document.createElement("script");
    script.id = "mathjax-lib";
    script.async = true;
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js";
    document.head.appendChild(script);
}

class MathShow extends HTMLElement {
    constructor() {
        super();
        this._pending = false;
        this._observing = false;
        this._observer = new MutationObserver(() => this._scheduleTypeset());
    }

    connectedCallback() {
        this._startObserving();
        this._scheduleTypeset();
    }

    disconnectedCallback() {
        this._stopObserving();
    }

    _startObserving() {
        if (this._observing) return;
        this._observer.observe(this, {
            childList: true,
            characterData: true,
            subtree: true,
        });
        this._observing = true;
    }

    _stopObserving() {
        if (!this._observing) return;
        this._observer.disconnect();
        this._observing = false;
    }

    async _scheduleTypeset() {
        if (this._pending) return;
        this._pending = true;
        this._stopObserving();

        try {
            const MJ = window.MathJax;
            if (!MJ) return;
            if (MJ.startup?.promise) {
                await MJ.startup.promise;
            }
            await MJ.typesetPromise([this]);
        } catch (error) {
            console.warn("Math rendering skipped:", error);
        } finally {
            this._pending = false;
            this._startObserving();
        }
    }
}

if (!customElements.get("math-show")) {
    customElements.define("math-show", MathShow);
}
