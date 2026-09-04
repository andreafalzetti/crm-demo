"""Focused headless check for the authenticated CRM assistant panel."""

import os

from playwright.sync_api import expect, sync_playwright


def main() -> None:
    base_url = os.environ.get("E2E_BASE_URL", "http://localhost:5173").rstrip("/")
    email = os.environ.get("E2E_EMAIL")
    password = os.environ.get("E2E_PASSWORD")
    screenshot = os.environ.get(
        "E2E_SCREENSHOT", "/tmp/crm-assistant-panel.png"
    )
    if not email or not password:
        raise RuntimeError("Imposta E2E_EMAIL ed E2E_PASSWORD")

    browser_errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on(
            "console",
            lambda message: browser_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: browser_errors.append(str(error)))

        page.goto(base_url, wait_until="networkidle")
        page.get_by_label("Email").fill(email)
        page.get_by_label("Password", exact=True).fill(password)
        page.get_by_role("button", name="Accedi").click()
        page.wait_for_url(f"{base_url}/")
        page.wait_for_load_state("networkidle")

        page.get_by_role("button", name="Assistente").click()
        panel = page.get_by_role("dialog")
        expect(panel.get_by_role("heading", name="Taccuino di studio")).to_be_visible()
        expect(panel.get_by_text("Da dove iniziamo?")).to_be_visible()
        panel.get_by_label("Messaggio per l’assistente").fill(
            "Cerca Officine Aurora e dammi il link alla scheda cliente."
        )
        panel.get_by_role("button", name="Invia").click()
        expect(panel.get_by_role("link", name="Officine Aurora")).to_be_visible(
            timeout=90_000
        )
        panel.get_by_label("Messaggio per l’assistente").fill(
            "Prepara una nota per Officine Aurora con testo: proposta UI da annullare."
        )
        panel.get_by_role("button", name="Invia").click()
        expect(panel.get_by_text("Conferma richiesta")).to_be_visible(
            timeout=90_000
        )
        panel.get_by_role("button", name="Annulla").click()
        expect(panel.get_by_text("Annullata")).to_be_visible(timeout=10_000)
        page.screenshot(path=screenshot, full_page=True)

        mobile = browser.new_page(viewport={"width": 390, "height": 844})
        mobile.goto(f"{base_url}/login", wait_until="networkidle")
        mobile.get_by_label("Email").fill(email)
        mobile.get_by_label("Password", exact=True).fill(password)
        mobile.get_by_role("button", name="Accedi").click()
        mobile.wait_for_url(f"{base_url}/")
        mobile.get_by_role("button", name="Assistente").click()
        mobile_panel = mobile.get_by_role("dialog")
        expect(
            mobile_panel.get_by_role("heading", name="Taccuino di studio")
        ).to_be_visible()
        overflow = mobile.evaluate(
            "document.documentElement.scrollWidth - document.documentElement.clientWidth"
        )
        if overflow > 1:
            raise RuntimeError(f"Overflow orizzontale mobile: {overflow}px")
        mobile.screenshot(path="/tmp/crm-assistant-mobile.png", full_page=True)
        browser.close()

    if browser_errors:
        raise RuntimeError("Browser errors: " + " | ".join(browser_errors))
    print(f"assistant UI verified: {screenshot}")


if __name__ == "__main__":
    main()
