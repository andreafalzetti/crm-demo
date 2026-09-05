#!/usr/bin/env node

import { cp, mkdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SCRIPT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const MODULE_CATALOG = {
  "address-book": {
    package: "@crm/address-book",
    symbol: "addressBookModule",
    goAlias: "addressbook",
    goPath: "address-book",
    dependencies: [],
  },
  personnel: {
    package: "@crm/personnel",
    symbol: "personnelModule",
    goAlias: "personnel",
    goPath: "personnel",
    dependencies: [],
  },
  "work-items": {
    package: "@crm/work-items",
    symbol: "workItemsModule",
    goAlias: "workitems",
    goPath: "work-items",
    dependencies: ["address-book", "personnel"],
  },
  agenda: {
    package: "@crm/agenda",
    symbol: "agendaModule",
    goAlias: "agenda",
    goPath: "agenda",
    dependencies: ["address-book", "personnel", "work-items"],
  },
  quotes: {
    package: "@crm/quotes",
    symbol: "quotesModule",
    goAlias: "quotes",
    goPath: "quotes",
    dependencies: ["address-book", "work-items"],
  },
  assistant: {
    package: "@crm/assistant",
    symbol: "assistantModule",
    goAlias: "assistant",
    goPath: "assistant",
    dependencies: [],
    optIn: true,
  },
}
const AVAILABLE_MODULES = new Set(Object.keys(MODULE_CATALOG))
const DEFAULT_MODULES = Object.keys(MODULE_CATALOG).filter(
  (module) => !MODULE_CATALOG[module].optIn
)

export function parseArgs(argv) {
  const values = {}

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === "--") continue
    if (!token.startsWith("--"))
      throw new Error(`Argomento non riconosciuto: ${token}`)
    const key = token.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith("--"))
      throw new Error(`Valore mancante per --${key}`)
    values[key] = value
    index += 1
  }

  return values
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toLocaleUpperCase("it-IT"))
    .join("")
}

function validate(options) {
  const slug = options.slug?.trim()
  const name = options.name?.trim()
  const accent = options.accent?.trim() || "#087f48"
  const timeZone = options.timezone?.trim() || "Europe/Rome"
  const requestedModules = (options.modules || DEFAULT_MODULES.join(","))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
    throw new Error(
      "--slug è obbligatorio e deve usare lettere minuscole, numeri e trattini"
    )
  }
  if (!name) throw new Error("--name è obbligatorio")
  if (!/^#[0-9a-f]{6}$/i.test(accent))
    throw new Error(
      "--accent deve essere un colore esadecimale, per esempio #087f48"
    )
  try {
    new Intl.DateTimeFormat("it-IT", { timeZone }).format()
  } catch {
    throw new Error(`--timezone non valida: ${timeZone}`)
  }
  if (
    requestedModules.length === 0 ||
    requestedModules.some((module) => !AVAILABLE_MODULES.has(module))
  ) {
    throw new Error(
      `Moduli non supportati: ${requestedModules.filter((module) => !AVAILABLE_MODULES.has(module)).join(", ") || "nessuno"}`
    )
  }
  const requested = new Set(requestedModules)
  for (const module of requested) {
    const missing = MODULE_CATALOG[module].dependencies.filter(
      (dependency) => !requested.has(dependency)
    )
    if (missing.length > 0) {
      throw new Error(`Il modulo ${module} richiede: ${missing.join(", ")}`)
    }
  }
  const modules = Object.keys(MODULE_CATALOG).filter((module) =>
    requested.has(module)
  )

  return {
    slug,
    name,
    accent,
    timeZone,
    modules,
    shortName: options["short-name"]?.trim() || initials(name),
  }
}

async function replaceInFile(file, transform) {
  const source = await readFile(file, "utf8")
  await writeFile(file, transform(source), "utf8")
}

function clientManifest(options) {
  const imports = options.modules.map((module) => {
    const definition = MODULE_CATALOG[module]
    return `import { ${definition.symbol} } from "${definition.package}"`
  })
  const symbols = options.modules.map((module) => MODULE_CATALOG[module].symbol)

  return `${imports.join("\n")}\nimport { defineClientManifest } from "@crm/app-core"\n\nexport const clientManifest = defineClientManifest({\n  slug: ${JSON.stringify(options.slug)},\n  name: ${JSON.stringify(options.name)},\n  shortName: ${JSON.stringify(options.shortName)},\n  locale: "it-IT",\n  timeZone: ${JSON.stringify(options.timeZone)},\n  accent: ${JSON.stringify(options.accent)},\n  modules: [${symbols.join(", ")}],\n})\n`
}

function serverModuleRegistry(options) {
  const imports = options.modules.flatMap((module) => {
    const definition = MODULE_CATALOG[module]
    const base = `github.com/designferri/crm-demo/modules/${definition.goPath}/backend`
    return [`\t${definition.goAlias} "${base}"`, `\t_ "${base}/migrations"`]
  })
  const registrations = options.modules.map((module) => {
    if (module === "quotes") {
      return `\t\tquotes.Module{IssuerName: ${JSON.stringify(options.name)}, AccentHex: ${JSON.stringify(options.accent)}},`
    }
    return `\t\t${MODULE_CATALOG[module].goAlias}.Module{},`
  })

  return `package main\n\nimport (\n\t"github.com/designferri/crm-demo/internal/platform"\n${imports.join("\n")}\n)\n\nfunc crmModules() []platform.Module {\n\treturn []platform.Module{\n${registrations.join("\n")}\n\t}\n}\n`
}

export async function createCrm(
  rawOptions,
  root = process.env.CRM_SCAFFOLD_ROOT || SCRIPT_ROOT
) {
  const options = validate(rawOptions)
  const source = path.join(root, "apps", "demo")
  const destination = path.join(root, "apps", options.slug)

  if (!existsSync(source)) throw new Error(`Template non trovato: ${source}`)
  if (existsSync(destination))
    throw new Error(`La destinazione esiste già: ${destination}`)

  await mkdir(path.dirname(destination), { recursive: true })
  await cp(source, destination, {
    recursive: true,
    filter: (entry) =>
      entry !== path.join(source, "server", "seed.go") &&
      ![
        "node_modules",
        "dist",
        "pb_data",
        ".turbo",
        "test-results",
        "playwright-report",
      ].includes(path.basename(entry)),
  })

  await replaceInFile(path.join(destination, "package.json"), (sourceText) => {
    const packageJson = JSON.parse(sourceText)
    packageJson.name = `@crm/${options.slug}`
    const selectedPackages = new Set(
      options.modules.map((module) => MODULE_CATALOG[module].package)
    )
    for (const packageName of Object.values(MODULE_CATALOG).map(
      (module) => module.package
    )) {
      if (!selectedPackages.has(packageName)) {
        delete packageJson.dependencies?.[packageName]
      }
    }
    return `${JSON.stringify(packageJson, null, 2)}\n`
  })

  await writeFile(
    path.join(destination, "src", "client.ts"),
    clientManifest(options),
    "utf8"
  )
  await writeFile(
    path.join(destination, "server", "modules.go"),
    serverModuleRegistry(options),
    "utf8"
  )
  await replaceInFile(
    path.join(destination, "server", "main.go"),
    (sourceText) =>
      sourceText.replace(/\s*registerDemoSeedCommand\(app\)\n/, "\n")
  )
  const e2eTest = path.join(destination, "e2e", "auth.spec.ts")
  if (existsSync(e2eTest)) {
    await replaceInFile(e2eTest, (sourceText) =>
      sourceText.replace(
        /const EXPECTED_MODULES = \[[\s\S]*?\]\n/,
        `const EXPECTED_MODULES = ${JSON.stringify([...options.modules].sort())}\n`
      )
    )
  }

  await replaceInFile(path.join(destination, "index.html"), (sourceText) =>
    sourceText.replace(
      /<title>.*?<\/title>/,
      `<title>${options.name} · CRM</title>`
    )
  )

  return { destination, ...options }
}

export const usage = `Uso:\n  pnpm crm:new --slug cliente --name "Cliente S.r.l." [--short-name CS] [--accent #087f48] [--timezone Europe/Rome] [--modules address-book,personnel,work-items,agenda,quotes,assistant]`

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = await createCrm(parseArgs(process.argv.slice(2)))
    console.log(`CRM creato in ${result.destination}`)
    console.log(`Avvio: pnpm install && pnpm --filter @crm/${result.slug} dev`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    console.error(usage)
    process.exitCode = 1
  }
}
