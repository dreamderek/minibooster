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
    padding: 0 8px;
    background: linear-gradient(180deg, #f8f5e6, #f1ebda);
    border: 1px solid rgba(52, 73, 31, 0.35);
    border-radius: 999px;
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
}

.frame-panel-subtitle {
    display: block;
    margin-top: 2px;
    font-size: 10px;
    line-height: 1.4;
    color: var(--muted, rgba(29, 29, 29, 0.68));
}

.frame-panel-body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 2px solid rgba(52, 73, 31, 0.9);
    border-radius: 18px;
    background: linear-gradient(180deg, #fffef9, #f7f4ea);
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

            const label = document.createElement("div");
            label.className = "frame-panel-title";
            label.textContent = title;
            head.appendChild(label);

            if (subtitle) {
                const sub = document.createElement("div");
                sub.className = "frame-panel-subtitle";
                sub.textContent = subtitle;
                head.appendChild(sub);
            }

            const body = document.createElement("div");
            body.className = "frame-panel-body";

            shell.appendChild(head);
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
