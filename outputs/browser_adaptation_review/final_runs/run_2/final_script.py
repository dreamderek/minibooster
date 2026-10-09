from pathlib import Path
from playwright.sync_api import sync_playwright


RUN_DIR = Path(__file__).resolve().parent
SCREENSHOTS = RUN_DIR / "screenshots"
LOG = RUN_DIR / "final_script_log.txt"
VIEWPORTS = {"desktop": (1440, 1000), "tablet": (768, 1024), "mobile": (390, 844)}


def main() -> None:
    LOG.write_text("", encoding="utf-8")
    with sync_playwright() as playwright:
        browser = playwright.firefox.launch(headless=True)
        for step, (name, size) in enumerate(VIEWPORTS.items(), start=1):
            page = browser.new_page(viewport={"width": size[0], "height": size[1]})
            page.goto("http://127.0.0.1:4173/", wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(800)
            metrics = page.evaluate("""() => ({
                width: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                viewport: document.querySelector('meta[name=viewport]').content,
                buttonCount: document.querySelectorAll('button').length
            })""")
            page.screenshot(path=str(SCREENSHOTS / f"final_execution_{step}_{name}.png"))
            LOG.open("a", encoding="utf-8").write(
                f"step {step} action: {name}; overflow={metrics['scrollWidth'] > metrics['width'] + 1}; "
                f"viewport={metrics['viewport']!r}; buttons={metrics['buttonCount']}\n"
            )
            page.close()
        browser.close()


if __name__ == "__main__":
    main()
