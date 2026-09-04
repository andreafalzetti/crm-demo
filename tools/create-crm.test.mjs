import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { createCrm, parseArgs } from "./create-crm.mjs"

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "crm-scaffold-"))
  const demo = path.join(root, "apps", "demo")
  await mkdir(path.join(demo, "src"), { recursive: true })
  await mkdir(path.join(demo, "server", "pb_data"), { recursive: true })
  await mkdir(path.join(demo, "e2e"), { recursive: true })
  await mkdir(path.join(demo, ".turbo"), { recursive: true })
  await writeFile(
    path.join(demo, "package.json"),
    `${JSON.stringify({
      name: "@crm/demo",
      private: true,
      dependencies: {
        "@crm/address-book": "workspace:*",
        "@crm/agenda": "workspace:*",
        "@crm/app-core": "workspace:*",
        "@crm/personnel": "workspace:*",
        "@crm/quotes": "workspace:*",
        "@crm/work-items": "workspace:*",
      },
    })}\n`
  )
  await writeFile(
    path.join(demo, "index.html"),
    "<html><head><title>Demo · CRM</title></head></html>\n"
  )
  await writeFile(path.join(demo, "src", "client.ts"), "template\n")
  await writeFile(
    path.join(demo, "server", "main.go"),
    "package main\n\nfunc main() {\n\tregisterDemoSeedCommand(app)\n}\n"
  )
  await writeFile(path.join(demo, "server", "modules.go"), "package main\n")
  await writeFile(path.join(demo, "server", "seed.go"), "package main\n")
  await writeFile(
    path.join(demo, "e2e", "auth.spec.ts"),
    'const EXPECTED_MODULES = ["address-book", "agenda", "personnel", "quotes", "work-items"]\n'
  )
  await writeFile(path.join(demo, "server", "pb_data", "data.db"), "ignored")
  await writeFile(path.join(demo, ".turbo", "build.log"), "ignored")
  return root
}

test("legge le opzioni CLI", () => {
  assert.deepEqual(parseArgs(["--", "--slug", "acme", "--name", "Acme"]), {
    slug: "acme",
    name: "Acme",
  })
})

test("crea un'app client dal template senza copiare i dati runtime", async () => {
  const root = await fixture()
  const result = await createCrm(
    { slug: "acme", name: "Acme S.r.l.", accent: "#123456" },
    root
  )

  const packageJson = JSON.parse(
    await readFile(path.join(result.destination, "package.json"), "utf8")
  )
  const manifest = await readFile(
    path.join(result.destination, "src", "client.ts"),
    "utf8"
  )
  const html = await readFile(
    path.join(result.destination, "index.html"),
    "utf8"
  )
  const serverModules = await readFile(
    path.join(result.destination, "server", "modules.go"),
    "utf8"
  )
  const e2eTest = await readFile(
    path.join(result.destination, "e2e", "auth.spec.ts"),
    "utf8"
  )
  const serverMain = await readFile(
    path.join(result.destination, "server", "main.go"),
    "utf8"
  )

  assert.equal(packageJson.name, "@crm/acme")
  assert.match(manifest, /name: "Acme S\.r\.l\."/)
  assert.match(manifest, /accent: "#123456"/)
  assert.match(manifest, /addressBookModule/)
  assert.match(manifest, /agendaModule/)
  assert.match(manifest, /quotesModule/)
  assert.match(serverModules, /addressbook\.Module/)
  assert.match(serverModules, /agenda\.Module/)
  assert.match(serverModules, /quotes\.Module/)
  assert.match(
    serverModules,
    /quotes\.Module\{IssuerName: "Acme S\.r\.l\.", AccentHex: "#123456"\}/
  )
  assert.match(
    e2eTest,
    /"address-book","agenda","personnel","quotes","work-items"/
  )
  assert.doesNotMatch(serverMain, /registerDemoSeedCommand/)
  assert.match(html, /<title>Acme S\.r\.l\. · CRM<\/title>/)
  await assert.rejects(
    readFile(path.join(result.destination, "server", "pb_data", "data.db"))
  )
  await assert.rejects(
    readFile(path.join(result.destination, ".turbo", "build.log"))
  )
  await assert.rejects(
    readFile(path.join(result.destination, "server", "seed.go"))
  )
  await assert.rejects(
    createCrm({ slug: "acme", name: "Duplicato" }, root),
    /esiste già/
  )
})

test("compone un sottoinsieme coerente di moduli frontend e backend", async () => {
  const root = await fixture()
  const result = await createCrm(
    {
      slug: "people",
      name: "People CRM",
      modules: "personnel,address-book",
    },
    root
  )
  const packageJson = JSON.parse(
    await readFile(path.join(result.destination, "package.json"), "utf8")
  )
  const manifest = await readFile(
    path.join(result.destination, "src", "client.ts"),
    "utf8"
  )
  const serverModules = await readFile(
    path.join(result.destination, "server", "modules.go"),
    "utf8"
  )
  const e2eTest = await readFile(
    path.join(result.destination, "e2e", "auth.spec.ts"),
    "utf8"
  )

  assert.deepEqual(result.modules, ["address-book", "personnel"])
  assert.match(manifest, /modules: \[addressBookModule, personnelModule\]/)
  assert.doesNotMatch(manifest, /agendaModule/)
  assert.match(serverModules, /addressbook\.Module/)
  assert.match(serverModules, /personnel\.Module/)
  assert.doesNotMatch(serverModules, /agenda\.Module/)
  assert.match(e2eTest, /\["address-book","personnel"\]/)
  assert.equal(packageJson.dependencies["@crm/agenda"], undefined)
  assert.equal(packageJson.dependencies["@crm/app-core"], "workspace:*")
})

test("rifiuta slug e moduli non validi", async () => {
  const root = await fixture()
  await assert.rejects(
    createCrm({ slug: "Acme!", name: "Acme" }, root),
    /--slug/
  )
  await assert.rejects(
    createCrm({ slug: "acme", name: "Acme", modules: "fatture" }, root),
    /non supportati/
  )
  await assert.rejects(
    createCrm({ slug: "acme", name: "Acme", modules: "agenda" }, root),
    /richiede/
  )
})
