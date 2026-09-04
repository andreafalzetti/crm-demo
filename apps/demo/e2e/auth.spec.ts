import { expect, test } from "@playwright/test"

const EXPECTED_MODULES = [
  "address-book",
  "agenda",
  "personnel",
  "quotes",
  "work-items",
]

test("mostra la schermata di accesso e il backend è raggiungibile", async ({
  page,
  request,
}) => {
  const health = await request.get("/api/crm/health")
  expect(health.ok()).toBeTruthy()
  await expect(health.json()).resolves.toMatchObject({
    status: "ok",
    modules: EXPECTED_MODULES,
  })

  await page.goto("/")
  await expect(page).toHaveTitle("Ferri & Co. · CRM")
  await expect(
    page.getByRole("heading", { name: "Entra nel CRM" })
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Accedi" })).toBeVisible()
})

test("accede alla dashboard con un utente applicativo", async ({ page }) => {
  const email = process.env.E2E_EMAIL
  const password = process.env.E2E_PASSWORD
  test.skip(
    !email || !password,
    "Imposta E2E_EMAIL ed E2E_PASSWORD per il flusso autenticato"
  )

  await page.goto("/login")
  await page.getByLabel("Email").fill(email!)
  await page.getByLabel("Password", { exact: true }).fill(password!)
  await page.getByRole("button", { name: "Accedi" }).click()

  await expect(page).toHaveURL("/")
  await expect(page.getByRole("heading", { name: /Buon lavoro/ })).toBeVisible()
  await expect(
    page.getByRole("navigation").getByText("Panoramica")
  ).toBeVisible()
})
