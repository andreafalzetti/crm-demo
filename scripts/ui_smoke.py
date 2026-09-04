"""Headless CRM smoke check. Start the app first with `pnpm dev:demo`."""

import os
import re

from playwright.sync_api import expect, sync_playwright


def main() -> None:
    email = os.environ.get("E2E_EMAIL")
    password = os.environ.get("E2E_PASSWORD")
    if not email or not password:
        raise RuntimeError("Imposta E2E_EMAIL ed E2E_PASSWORD")

    errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on(
            "console",
            lambda message: errors.append(message.text)
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: errors.append(str(error)))

        page.goto("http://localhost:5173", wait_until="networkidle")
        page.get_by_label("Email").fill(email)
        page.get_by_label("Password", exact=True).fill(password)
        page.get_by_role("button", name="Accedi").click()
        page.wait_for_url("http://localhost:5173/")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_text("disponibili su 3", exact=True)).to_be_visible()
        expect(
            page.get_by_text("Verifica impianto e messa in servizio", exact=True)
        ).to_be_visible()
        expect(page.get_by_text(re.compile(r"3.?355,00"))).to_be_visible()
        page.screenshot(path="/tmp/crm-modular-dashboard.png", full_page=True)
        print("dashboard_headings:", page.get_by_role("heading").all_inner_texts())

        expect(page.get_by_role("heading", name="Relazioni in archivio")).to_be_visible()
        expect(page.get_by_role("heading", name="Disponibilità")).to_be_visible()
        expect(page.get_by_text("Prossimi interventi", exact=True)).to_be_visible()
        expect(page.get_by_text("Agenda di oggi", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name="Pipeline")).to_be_visible()

        navigation = page.get_by_role("navigation")
        expected_links = [
            "Clienti",
            "Contatti",
            "Collaboratori",
            "Presenze",
            "Interventi",
            "Agenda condivisa",
            "Preventivi PDF",
        ]
        for label in expected_links:
            expect(navigation.get_by_role("link", name=label, exact=True)).to_be_visible()

        navigation.get_by_role("link", name="Collaboratori", exact=True).click()
        expect(page.get_by_role("heading", name="Personale", exact=True)).to_be_visible()
        expect(page.get_by_text("Luca Bianchi", exact=True)).to_be_visible()

        navigation.get_by_role("link", name="Presenze", exact=True).click()
        expect(page.get_by_role("heading", name="Presenze", exact=True)).to_be_visible()
        expect(page.get_by_text("In sede", exact=True)).to_be_visible()

        navigation.get_by_role("link", name="Interventi", exact=True).click()
        expect(page.get_by_role("heading", name="Interventi", exact=True)).to_be_visible()
        expect(
            page.get_by_text("Verifica impianto e messa in servizio", exact=True)
        ).to_be_visible()

        navigation.get_by_role("link", name="Agenda condivisa", exact=True).click()
        expect(page.get_by_role("heading", name="Agenda", exact=True)).to_be_visible()
        expect(page.get_by_text("Allineamento operativo", exact=True)).to_be_visible()
        page.screenshot(path="/tmp/crm-modular-agenda.png", full_page=True)

        navigation.get_by_role("link", name="Clienti", exact=True).click()
        page.get_by_role("link", name="Officine Aurora", exact=True).click()
        expect(page.get_by_role("tab", name="Storico")).to_be_visible()
        expect(page.get_by_role("tab", name="Interventi")).to_be_visible()
        expect(page.get_by_role("tab", name="Preventivi")).to_be_visible()
        page.get_by_role("tab", name="Storico").click()
        expect(page.get_by_text("Nota aggiunta", exact=True)).to_be_visible()
        page.get_by_role("tab", name="Interventi").click()
        expect(page.get_by_text("INT-DEMO-001", exact=True)).to_be_visible()
        page.get_by_role("tab", name="Preventivi").click()
        expect(page.get_by_text("PRE-DEMO-001", exact=True)).to_be_visible()

        navigation.get_by_role("link", name="Preventivi PDF", exact=True).click()
        expect(page.get_by_role("heading", name="Preventivi", exact=True)).to_be_visible()
        row = page.get_by_role("row").filter(has_text="PRE-DEMO-001")
        with page.expect_download() as download_info:
            row.get_by_role(
                "button", name=re.compile(r"Genera PDF|Rigenera")
            ).click()
        download = download_info.value
        if not download.suggested_filename.endswith(".pdf"):
            raise RuntimeError("Il documento generato non è un PDF")
        expect(page.get_by_text("PDF generato e archiviato", exact=True)).to_be_visible()
        page.screenshot(path="/tmp/crm-modular-quotes.png", full_page=True)

        print("dashboard: 5 moduli verificati")
        print("customer: interventi e preventivi collegati")
        print("pdf:", download.suggested_filename)

        mobile = browser.new_page(viewport={"width": 390, "height": 844})
        mobile.goto("http://localhost:5173/login", wait_until="networkidle")
        mobile.get_by_label("Email").fill(email)
        mobile.get_by_label("Password", exact=True).fill(password)
        mobile.get_by_role("button", name="Accedi").click()
        mobile.wait_for_url("http://localhost:5173/")
        expect(mobile.get_by_role("heading", name=re.compile("Buon lavoro"))).to_be_visible()
        mobile.get_by_role("button", name="Apri menu").click()
        menu = mobile.get_by_role("dialog")
        expect(menu.get_by_role("link", name="Preventivi PDF", exact=True)).to_be_visible()
        menu.get_by_role("link", name="Preventivi PDF", exact=True).click()
        expect(mobile.get_by_role("heading", name="Preventivi", exact=True)).to_be_visible()
        mobile.screenshot(path="/tmp/crm-modular-mobile.png", full_page=True)
        overflow = mobile.evaluate(
            "document.documentElement.scrollWidth - document.documentElement.clientWidth"
        )
        if overflow > 1:
            raise RuntimeError(f"Overflow orizzontale mobile: {overflow}px")
        print("mobile: navigazione e layout verificati")
        browser.close()

    if errors:
        raise RuntimeError("Browser errors: " + " | ".join(errors))


if __name__ == "__main__":
    main()
