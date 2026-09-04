# CRM Kit

Scaffold modulare per realizzare piccoli CRM verticali, uno per cliente, con PocketBase come backend e React + shadcn/ui come frontend. Il repository include un'app dimostrativa italiana con cinque moduli componibili.

## Cosa include

- autenticazione PocketBase per gli utenti applicativi;
- RBAC configurabile con ruoli e permessi granulari;
- anagrafiche cliente con contatti, storico, note e documenti protetti;
- personale, presenze, ferie e assenze con flusso di approvazione;
- incarichi/interventi assegnabili e collegati ai clienti;
- agenda settimanale che compone appuntamenti, interventi e disponibilità;
- preventivi a righe con calcolo importi e PDF archiviato nello storage protetto;
- audit trail per le modifiche alle collezioni operative e amministrative;
- UI responsive, tema chiaro/scuro e design system condiviso basato su shadcn/ui;
- migrazioni Go versionate e hook backend per le regole non esprimibili nel solo schema;
- generatore CLI per derivare una nuova istanza cliente dal template demo.

## Avvio locale

Prerequisiti: [mise](https://mise.jdx.dev/) e un browser Chromium. Le versioni di Node, pnpm e Go sono fissate in `.mise.toml`.

```bash
mise trust
mise install
mise exec -- pnpm install
```

Crea il primo utente applicativo; il comando inizializza automaticamente database e migrazioni:

```bash
mise exec -- pnpm crm:user:create admin@example.test 'UnaPasswordLunga!' --name 'Amministratore'
```

Avvia frontend e PocketBase con un solo comando:

```bash
mise exec -- pnpm dev:demo
```

Apri `http://localhost:5173`. L'API risponde su `http://127.0.0.1:8090`; Vite inoltra `/api` al backend, quindi in produzione possono essere pubblicati sotto lo stesso dominio.

Per popolare la demo con clienti, personale, interventi, agenda e un preventivo collegati tra loro:

```bash
mise exec -- pnpm crm:demo:seed -- admin@example.test
```

Il seed è idempotente e usa l'utente indicato come autore dei record.

I dati locali e gli allegati sono salvati in `apps/demo/server/pb_data/`, esclusa da Git. La console di sistema PocketBase rimane separata dagli utenti CRM.

## Creare un CRM cliente

```bash
mise exec -- pnpm crm:new --slug acme --name 'Acme S.r.l.' --short-name AC --accent '#1f6d5a'
mise exec -- pnpm install
mise exec -- pnpm --filter @crm/acme dev
```

Il generatore copia l'app demo senza dati runtime o seed dimostrativi, modifica package, titolo e registri frontend/backend, e rifiuta di sovrascrivere una destinazione esistente. Nome e colore cliente vengono applicati anche ai PDF dei preventivi. Senza `--modules` abilita tutti i moduli disponibili:

- `address-book`: anagrafiche, contatti, note, storico e documenti;
- `personnel`: collaboratori, presenze, ferie e assenze;
- `work-items`: incarichi, interventi, eventi o sedute;
- `agenda`: calendario condiviso;
- `quotes`: preventivi e generazione PDF.

È possibile creare una variante più piccola, per esempio:

```bash
mise exec -- pnpm crm:new --slug people --name 'People CRM' --modules address-book,personnel
```

Il generatore ordina i moduli e verifica le dipendenze. `work-items` richiede `address-book` e `personnel`; `agenda` richiede anche `work-items`; `quotes` richiede `address-book` e `work-items`.

Per creare l'amministratore della nuova istanza:

```bash
mise exec -- pnpm --filter @crm/acme user:create admin@acme.test 'UnaPasswordLunga!' --name 'Amministratore'
```

## Architettura

```text
apps/demo/                    istanza cliente: manifest, router e processo PocketBase
packages/app-core/            shell, login, sessione, RBAC, utenti, ruoli e audit
packages/ui/                  design system shadcn/ui e tema Tailwind condiviso
modules/address-book/web/     pagine e componenti del modulo rubrica
modules/address-book/backend/ hook, permission catalog e migrazioni del modulo
modules/personnel/             personale, presenze, ferie e assenze
modules/work-items/            incarichi/interventi e assegnazioni
modules/agenda/                calendario operativo condiviso
modules/quotes/                preventivi, righe e generatore PDF
internal/platform/            runtime comune, autorizzazione e audit
internal/migrations/          schema e seed del nucleo CRM
tools/create-crm.mjs          generatore di nuove istanze
```

Ogni istanza possiede un `client.ts` che compone i moduli e definisce nome, sigla e colore. Un modulo frontend può contribuire navigazione, route, widget di panoramica e tab nella scheda cliente. La controparte Go espone permessi e hook; le migrazioni definiscono lo schema PocketBase. `server/modules.go` è il registro backend corrispondente e viene generato insieme al manifest React.

La visibilità dei comandi nella UI migliora l'esperienza, ma non è un confine di sicurezza. Ogni lettura e mutazione viene autorizzata dalle API rules PocketBase; gli hook Go applicano inoltre proprietà come autore/uploader e protezioni sugli account di sistema.

## Verifiche

```bash
mise exec -- pnpm typecheck
mise exec -- pnpm lint
mise exec -- pnpm test
mise exec -- pnpm build
mise exec -- pnpm test:e2e
```

Il test E2E pubblico verifica avvio, health check e login screen. Per includere il flusso autenticato:

```bash
mise exec -- pnpm --filter @crm/demo exec playwright install chromium
E2E_EMAIL=admin@example.test E2E_PASSWORD='UnaPasswordLunga!' mise exec -- pnpm test:e2e
```

Con l'app già avviata, `scripts/ui_smoke.py` verifica inoltre i cinque moduli, le relazioni tra cliente/interventi/preventivi e il download del PDF generato lato server.

## Produzione

- servi Vite come asset statici e il binario Go/PocketBase dietro lo stesso reverse proxy;
- usa HTTPS, backup periodici di database e storage, e una password distinta per il superuser PocketBase;
- configura lo storage S3-compatible dalle impostazioni PocketBase se non vuoi usare il filesystem locale;
- conserva una directory dati separata per ciascun cliente e applica le migrazioni prima di instradare traffico;
- non esporre pubblicamente la console PocketBase senza adeguate restrizioni di rete.

Il modello previsto è **un'istanza per cliente**: isolamento semplice, personalizzazioni indipendenti e deploy/backup separati. Non è uno schema multi-tenant condiviso.
