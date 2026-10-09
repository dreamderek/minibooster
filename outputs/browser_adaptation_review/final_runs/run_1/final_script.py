from pathlib import Path
from playwright.sync_api import sync_playwright


URL = "https://minibooster.metamath.com.tw/"
RUN_DIR = Path(__file__).resolve().parent
SCREENSHOTS = RUN_DIR / "screenshots"
LOG = RUN_DIR / "final_script_log.txt"
VIEWPORTS = {
    "desktop": {"width": 1440, "height": 1000},
    "tablet": {"width": 768, "height": 1024},
    "mobile": {"width": 390, "height": 844},
}


def log(message: str) -> None:
    with LOG.open("a", encoding="utf-8") as handle:
        handle.write(message + "\n")


def main() -> None:
    LOG.write_text("", encoding="utf-8")
    console_errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.firefox.launch(headless=True)
        for step, (name, viewport) in enumerate(VIEWPORTS.items(), start=1):
            page = browser.new_page(viewport=viewport, device_scale_factor=1)
            page.on("console", lambda message: console_errors.append(message.text)
                    if message.type == "error" else None)
            page.goto(URL, wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(1500)
            metrics = page.evaluate("""() => ({
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
                title: document.title,
                navCount: document.querySelectorAll('nav, [role="navigation"]').length,
                linkCount: document.querySelectorAll('a').length,
                buttonCount: document.querySelectorAll('button').length,
                bodyTextLength: document.body.innerText.trim().length
            })""")
            overflow = metrics["scrollWidth"] > metrics["clientWidth"] + 1
            page.screenshot(path=str(SCREENSHOTS / f"final_execution_{step}_{name}.png"))
            log(
                f"step {step} action: loaded {name} {viewport['width']}x{viewport['height']}; "
                f"title={metrics['title']!r}; overflow={overflow}; "
                f"scrollWidth={metrics['scrollWidth']}; clientWidth={metrics['clientWidth']}; "
                f"navCount={metrics['navCount']}; links={metrics['linkCount']}; "
                f"buttons={metrics['buttonCount']}; bodyTextLength={metrics['bodyTextLength']}"
            )
            page.close()
        browser.close()
    log(f"final datum: Firefox console errors={len(console_errors)}")
    for error in console_errors:
        log(f"console error: {error}")


if __name__ == "__main__":
    main()
