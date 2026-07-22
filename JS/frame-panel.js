class FramePanel extends HTMLElement {
    static observedAttributes = ["title", "subtitle", "variant"];

    constructor() {
        super();
        this.attachShadow({ mode: "open" }).innerHTML = `
            <style>
                :host {
                    display: block;
                    min-height: 0;
                    overflow: visible;
                    --accent: #5d8f44;
                    --accent-soft: rgba(93, 143, 68, 0.15);
                    --accent-strong: rgba(93, 143, 68, 0.3);
                }

                :host([variant="question"]) {
                    --accent: #5d8f44;
                    --accent-soft: rgba(93, 143, 68, 0.15);
                    --accent-strong: rgba(93, 143, 68, 0.3);
                }

                :host([variant="choice"]) {
                    --accent: #b07424;
                    --accent-soft: rgba(176, 116, 36, 0.15);
                    --accent-strong: rgba(176, 116, 36, 0.3);
                }

                :host([variant="review"]) {
                    --accent: #347c74;
                    --accent-soft: rgba(52, 124, 116, 0.15);
                    --accent-strong: rgba(52, 124, 116, 0.3);
                }

                .shell {
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    height: 100%;
                    border: 3px solid var(--line);
                    border-radius: 18px;
                    overflow: hidden;
                    background: var(--panel);
                    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.08);
                }

                .head {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px 10px 14px;
                    background:
                        linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.98)),
                        linear-gradient(90deg, var(--accent-soft), transparent 60%);
                    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
                }

                .head::before {
                    content: "";
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 6px;
                    background: linear-gradient(180deg, var(--accent), var(--accent-strong));
                }

                .kicker {
                    flex: 0 0 auto;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 3px 8px;
                    border-radius: 999px;
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    background: rgba(255, 255, 255, 0.92);
                    color: var(--accent);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                }

                .head-copy {
                    flex: 1 1 auto;
                    min-width: 0;
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                }

                .title {
                    margin: 0;
                    color: var(--text);
                    font-size: 16px;
                    line-height: 1.1;
                    font-weight: 900;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .subtitle {
                    margin: 0;
                    color: var(--muted);
                    font-size: 11px;
                    line-height: 1.2;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    min-width: 0;
                }

                .body {
                    flex: 1 1 auto;
                    min-height: 0;
                    background: var(--panel);
                }

                slot {
                    display: block;
                    min-height: 0;
                    height: 100%;
                }

                :host(.shake) {
                    animation: shake 260ms ease-in-out;
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-4px); }
                    40% { transform: translateX(4px); }
                    60% { transform: translateX(-3px); }
                    80% { transform: translateX(3px); }
                }

                @media (max-width: 520px) {
                    .head {
                        gap: 8px;
                        padding: 8px 10px 8px 12px;
                    }

                    .kicker {
                        padding: 2px 6px;
                        font-size: 9px;
                        letter-spacing: 0.05em;
                    }

                    .title {
                        font-size: 15px;
                    }

                    .subtitle {
                        font-size: 10px;
                    }
                }

                @media (max-width: 390px) {
                    .subtitle {
                        display: none;
                    }
                }
            </style>
            <div class="shell">
                <div class="head">
                    <div class="kicker"></div>
                    <div class="head-copy">
                        <h2 class="title"></h2>
                        <p class="subtitle"></p>
                    </div>
                </div>
                <div class="body"><slot></slot></div>
            </div>
        `;

        this._kicker = this.shadowRoot.querySelector(".kicker");
        this._title = this.shadowRoot.querySelector(".title");
        this._subtitle = this.shadowRoot.querySelector(".subtitle");
    }

    connectedCallback() {
        this._sync();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this._sync();
        }
    }

    _sync() {
        if (!this._kicker) return;

        const title = this.getAttribute("title") ?? "";
        const subtitle = this.getAttribute("subtitle") ?? "";
        const variant = this.getAttribute("variant") ?? "";

        this._title.textContent = title;
        this._subtitle.textContent = subtitle;
        this._subtitle.hidden = subtitle.trim().length === 0;

        const labels = {
            question: "題目區",
            choice: "作答區",
            review: "檢討區",
        };

        this._kicker.textContent = labels[variant] ?? "區塊";
    }
}

if (!customElements.get("frame-panel")) {
    customElements.define("frame-panel", FramePanel);
}
