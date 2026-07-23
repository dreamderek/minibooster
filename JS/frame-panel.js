(function () {
    const STYLE_ID = "frame-panel-styles";
    const STYLE_TEXT = `
frame-panel,
.frame-panel {
    display: flex;
    min-height: 0;
    height: 100%;
}

.frame-panel-shell {
    display: flex;
    flex-direction: column;
    min-height: 0;
    width: 100%;
    height: 100%;
    position: relative;
}

.frame-panel-head {
    position: relative;
    z-index: 2;
    align-self: flex-start;
    margin: 0 12px -12px 12px;
    padding: 0 10px;
    max-width: calc(100% - 24px);
    border-radius: 999px;
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.72),
        0 6px 16px rgba(54, 74, 35, 0.08);
    backdrop-filter: blur(12px) saturate(1.1);
    -webkit-backdrop-filter: blur(12px) saturate(1.1);
    isolation: isolate;
}

.frame-panel-title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.06em;
    color: var(--text, #1d1d1d);
    text-transform: uppercase;
    line-height: 1.3;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
}

.frame-panel-subtitle {
    display: block;
    margin-top: 2px;
    font-size: 10px;
    line-height: 1.4;
    color: var(--muted, rgba(29, 29, 29, 0.68));
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
}

.frame-panel-body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 12px;
    box-shadow: 0 8px 18px rgba(54, 74, 35, 0.08), inset 0 0 0 1px rgba(255,255,255,0.8);
}

.frame-panel-body > * {
    min-height: 0;
}

.panel-scroll {
    height: 100%;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
}

.panel-scroll::-webkit-scrollbar {
    display: none;
}

.panel-pad {
    min-height: 100%;
    padding: 14px 14px 20px;
}

@media (max-width: 520px) {
    .panel-pad {
        padding: 12px 12px 14px;
    }
}

frame-panel[data-theme="question"] {
    --panel-head-start: rgba(214, 226, 242, 0.96);
    --panel-head-end: rgba(148, 171, 204, 0.58);
    --panel-border: rgba(93, 116, 152, 0.84);
    --panel-body-start: rgba(251, 253, 255, 0.99);
    --panel-body-end: rgba(231, 238, 249, 0.95);
    --panel-title: #223b60;
}

frame-panel[data-theme="options"] {
    --panel-head-start: rgba(255, 232, 185, 0.95);
    --panel-head-end: rgba(226, 178, 92, 0.56);
    --panel-border: rgba(199, 141, 47, 0.84);
    --panel-body-start: rgba(255, 252, 244, 0.98);
    --panel-body-end: rgba(252, 240, 212, 0.94);
    --panel-title: #6b4b13;
}

frame-panel[data-theme="review"] {
    --panel-head-start: rgba(197, 227, 255, 0.95);
    --panel-head-end: rgba(120, 171, 230, 0.56);
    --panel-border: rgba(95, 137, 196, 0.84);
    --panel-body-start: rgba(251, 253, 255, 0.98);
    --panel-body-end: rgba(227, 239, 252, 0.94);
    --panel-title: #244b73;
}

frame-panel[data-theme="ad"] {
    --panel-head-start: rgba(233, 218, 255, 0.95);
    --panel-head-end: rgba(172, 143, 220, 0.56);
    --panel-border: rgba(131, 104, 189, 0.84);
    --panel-body-start: rgba(255, 252, 255, 0.98);
    --panel-body-end: rgba(240, 232, 250, 0.96);
    --panel-title: #533882;
}

.frame-panel-head {
    background: linear-gradient(180deg, var(--panel-head-start, rgba(248, 245, 230, 0.72)), var(--panel-head-end, rgba(241, 235, 218, 0.38)));
}

.frame-panel-title {
    color: var(--panel-title, var(--text, #1d1d1d));
}

.frame-panel-body {
    border: 2px solid var(--panel-border, rgba(52, 73, 31, 0.9));
    background: linear-gradient(180deg, var(--panel-body-start, #fffef9), var(--panel-body-end, #f7f4ea));
}
`;

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = STYLE_TEXT;
        document.head.appendChild(style);
    }

    class FramePanel extends HTMLElement {
        connectedCallback() {
            if (this.dataset.framePanelReady === "true") return;
            this.dataset.framePanelReady = "true";

            const title = this.getAttribute("title") || "";
            const subtitle = this.getAttribute("subtitle") || "";

            const shell = document.createElement("div");
            shell.className = "frame-panel-shell";

            const head = document.createElement("div");
            head.className = "frame-panel-head";

            if (title) {
                const label = document.createElement("div");
                label.className = "frame-panel-title";
                label.textContent = title;
                head.appendChild(label);
            }

            if (subtitle) {
                const sub = document.createElement("div");
                sub.className = "frame-panel-subtitle";
                sub.textContent = subtitle;
                head.appendChild(sub);
            }

            const body = document.createElement("div");
            body.className = "frame-panel-body";

            if (head.childNodes.length > 0) {
                shell.appendChild(head);
            }
            shell.appendChild(body);
            this.appendChild(shell);

            requestAnimationFrame(() => {
                const contentNodes = Array.from(this.childNodes).filter((node) => {
                    if (node === shell) return false;
                    if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return false;
                    return true;
                });

                contentNodes.forEach((node) => {
                    node.remove();
                    body.appendChild(node);
                });
            });
        }
    }

    ensureStyles();

    if (!customElements.get("frame-panel")) {
        customElements.define("frame-panel", FramePanel);
    }
})();
