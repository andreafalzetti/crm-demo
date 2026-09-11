# CRM Kit

Scaffold modulare per realizzare piccoli CRM verticali, uno per cliente, con PocketBase come backend e React + shadcn/ui come frontend. Il repository include un'app dimostrativa italiana con cinque moduli funzionanti e due anteprime concettuali.

## Cosa include

- autenticazione PocketBase per gli utenti applicativi;
- RBAC configurabile con ruoli e permessi granulari;
- anagrafiche cliente con contatti, storico, note e documenti protetti;
- personale, presenze, ferie e assenze con flusso di approvazione;
- incarichi/interventi assegnabili e collegati ai clienti;
- agenda settimanale che compone appuntamenti, interventi e disponibilità;
- preventivi a righe con calcolo importi e PDF archiviato nello storage protetto;
- mock del verticale medico con tipi di appuntamento, disponibilità e regole di distribuzione;
- mock del modulo pagamenti, collegabile agli appuntamenti e predisposto per canali online e fisici;
- audit trail per le modifiche alle collezioni operative e amministrative;
- meteo per luogo con geocodifica degli indirizzi, previsioni a sette giorni e allerte a soglia;
- assistente AI interno con strumenti CRM, delega RBAC e conferma umana delle scritture;
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
- `quotes`: preventivi e generazione PDF;
- `weather`: meteo, previsioni e allerte, opt-in perché richiede un geocoder e un User-Agent MET.
- `assistant`: assistente AI n8n/OpenRouter, opt-in perché richiede il servizio esterno e i secret runtime; include una prova voce GPT-Live opzionale.

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
modules/weather/               geocodifica, previsioni MET Norway e allerte a soglia
modules/assistant/             pannello AI, API delegate, strumenti e proposte di modifica
modules/quotes/                preventivi, righe e generatore PDF
modules/appointments/web/      anteprima UX per prenotazioni e distribuzione
modules/payments/web/          anteprima UX per incassi online e fisici
internal/platform/            runtime comune, autorizzazione e audit
internal/migrations/          schema e seed del nucleo CRM
tools/create-crm.mjs          generatore di nuove istanze
```

Ogni istanza possiede un `client.ts` che compone i moduli e definisce nome, sigla,
colore e timezone IANA. La timezone predefinita è `Europe/Rome`; viene usata per
mostrare e raggruppare date e orari e viene passata all'assistente per interpretare
espressioni come “oggi” e “domani”. Un modulo frontend può contribuire navigazione,
route, widget di panoramica, tab nella scheda cliente e pannelli globali della shell.
La controparte Go espone permessi e hook; le migrazioni definiscono lo schema
PocketBase. `server/modules.go` è il registro backend corrispondente e viene
generato insieme al manifest React.

### Assistente AI

La demo include il modulo `assistant`, collegato all'istanza n8n indipendente. Il
browser parla soltanto con PocketBase; il backend firma una delega breve per
l'utente autenticato e inoltra il messaggio al webhook privato. Gli strumenti
n8n possono leggere solo le operazioni di dominio allow-listate e ogni controllo
riusa i permessi RBAC correnti.

Le azioni di scrittura non modificano subito i dati: creano un record
`assistant_actions` con scadenza. Soltanto il pulsante **Conferma** nella UI può
eseguire la proposta; conferma, modifica finale e target vengono registrati
nell'audit trail. L'assistente può creare e aggiornare clienti, contatti, note,
attività, interventi, agenda, personale, presenze/ferie e preventivi usando una
allow-list di campi per ogni entità; non espone alcuna operazione di eliminazione.
La rete Docker `crm-assistant` collega i soli container
applicativi senza esporre PocketBase, n8n o PostgreSQL su nuove porte.

Variabili runtime richieste:

```text
CRM_ASSISTANT_SHARED_SECRET
CRM_ASSISTANT_N8N_URL
```

#### Prova voce (sperimentale)

Il modulo `assistant` espone anche la pagina `/voce`, che collega il browser a
GPT-Live via WebRTC. La sessione nasce sul server PocketBase, che possiede la
API key; il browser scambia solo l'offerta SDP. Il ragionamento è delegato a un
modello backend, ma ogni chiamata di funzione rientra nel CRM e passa dalla
stessa allow-list e dagli stessi permessi RBAC dell'assistente testuale. Le
scritture restano proposte in attesa di conferma e compaiono nella pagina.

Serve una `OPENAI_API_KEY` nel processo Go (non una variabile Vite):

```bash
OPENAI_API_KEY=sk-... mise exec -- pnpm dev:demo
```

Variabili opzionali: `CRM_VOICE_MODEL` (default `gpt-live-1`),
`CRM_VOICE_BACKEND_MODEL` (default `gpt-5.6-terra`) e `CRM_VOICE_API_URL`
(default `https://api.openai.com/v1`, utile per test o proxy). Il microfono
richiede `localhost` o HTTPS. La sessione è fatturata da OpenAI al minuto, più
il modello backend, quindi per ora è una prova e non un canale produttivo: il
centralino telefonico richiederà il percorso SIP.

### Meteo

Il modulo `weather` geolocalizza gli indirizzi già presenti nel gestionale
(`organizations.address`, `work_items.location`), ne conserva le coordinate in
`geo_places` e ci appoggia sopra le previsioni di
[MET Norway](https://api.met.no/). Un luogo è condiviso da tutti i record che
puntano allo stesso indirizzo, quindi dieci cantieri nello stesso comune
costano una sola richiesta.

Tre job schedulati, registrati come cron PocketBase:

| Job | Cadenza | Cosa fa |
| --- | --- | --- |
| `weather-geocode` | ogni 5 min | risolve gli indirizzi in coda tramite Photon |
| `weather-refresh` | ogni 30 min | aggiorna le previsioni dei luoghi attivi |
| `weather-alerts` | 06:00 | valuta le regole a soglia sulle previsioni in cache |

Gli indirizzi già presenti quando il modulo viene installato non passano dagli
hook, quindi vanno collegati una volta:

```bash
mise exec -- go run ./apps/demo/server weather backfill --dir=./apps/demo/server/pb_data
```

Il comando è idempotente. `weather refresh` e `weather alerts` forzano invece i
due job schedulati, utile per provare senza aspettare il cron.

Le allerte compaiono sulla pagina `/meteo`, nella scheda cliente e nel contesto
dell'assistente, che dispone anche degli strumenti `weather_forecast` e
`weather_alerts`. Non esiste una collection di notifiche: il modulo si ferma
alle allerte.

I termini d'uso MET sono vincolanti e implementati nel client: `User-Agent`
identificativo obbligatorio, coordinate troncate a quattro decimali, rispetto di
`Expires` e uso di `If-Modified-Since`. I dati sono CC BY 4.0 e l'attribuzione
è esposta nella UI.

Variabili runtime:

```text
CRM_WEATHER_USER_AGENT   obbligatoria, es. "designferri-crm/0.1 crm@designferri.it"
CRM_GEOCODER_URL         endpoint Photon, es. http://photon:2322
CRM_WEATHER_API_URL      opzionale, per puntare a un'istanza MET diversa nei test
CRM_GEOCODER_COUNTRY     ISO del paese atteso, default IT
CRM_GEOCODER_BBOX        riquadro di ricerca, default l'Italia
```

Le ultime due non sono cosmetiche. Photon risponde sempre col suo miglior
risultato, per quanto scadente: senza vincoli, in produzione il nome "Studio
Lumen" ha restituito una via di Yerevan e "Viale Europa 42, Roma" ha restituito
Scandiano, 400 km più a nord. Il client ora chiede più candidati e scarta quelli
che non concordano con paese e comune richiesti. Un indirizzo non risolto resta
visibile nella UI; uno risolto male mostrerebbe in silenzio il meteo di un'altra
città.

Senza `CRM_WEATHER_USER_AGENT` il client non parte, invece di farsi bloccare da
MET con un 403. Senza `CRM_GEOCODER_URL` gli indirizzi restano in coda e la UI
lo dichiara.

#### Photon self-hosted

Photon non pubblica un'immagine Docker ufficiale: `deploy/private/photon/`
costruisce l'immagine attorno al JAR rilasciato su GitHub. La versione di Photon
e l'indice scaricato da `scripts/photon-bootstrap.sh` sono una **coppia** e vanno
aggiornati insieme, perché il formato dell'indice è legato alla versione:

```text
photon-db-it-250720 (20 lug 2025)  ->  Photon 0.7.2 (3 lug 2025)
```

Due limiti dell'upstream, verificati: l'alias `photon-db-it-latest.tar.bz2`
risponde 404 e va usato il nome datato; l'estratto per l'Italia pesa 2,5 GB
compressi e non viene ripubblicato di frequente. Per la geocodifica di indirizzi
va bene comunque — le strade non si spostano — ma è una scelta da fare
consapevolmente.

Prima del primo deploy che abilita il modulo:

```bash
./scripts/photon-bootstrap.sh
```

Lo script verifica lo spazio libero prima di scaricare, controlla l'MD5
pubblicato ed è idempotente. Il servizio `photon` sta dietro il profilo Compose
`geocoder` e non parte da solo:

```bash
docker compose -f deploy/private/compose.yaml --profile geocoder up -d
```

Serve una macchina capiente: l'indice Italia decompresso occupa diversi GB e
l'Elasticsearch incorporato vuole RAM. Sulla VPS attuale (3,7 GB di RAM,
38 GB di disco) non ci sta, e infatti il deploy punta all'istanza pubblica. Finché l'indice non è pronto si può puntare
`CRM_GEOCODER_URL` all'istanza pubblica `https://photon.komoot.io`, che è fair
use e senza garanzie ma sufficiente per una demo.

`appointments` e `payments` sono marcati `preview`: compaiono nella demo con dati mock ma non vengono ancora aggiunti dal generatore, non registrano permessi backend e non persistono dati. La decisione di prodotto e il modello concettuale del verticale medico sono descritti in [`docs/verticals/medical-practice.md`](docs/verticals/medical-practice.md).

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

`scripts/assistant_ui_smoke.py` verifica separatamente apertura del pannello,
invio di un messaggio e rendering del link restituito dall'agente. Accetta
`E2E_BASE_URL` per collaudare anche la demo privata pubblicata via Tailscale.

## Produzione

- servi Vite come asset statici e il binario Go/PocketBase dietro lo stesso reverse proxy;
- usa HTTPS, backup periodici di database e storage, e una password distinta per il superuser PocketBase;
- configura lo storage S3-compatible dalle impostazioni PocketBase se non vuoi usare il filesystem locale;
- conserva una directory dati separata per ciascun cliente e applica le migrazioni prima di instradare traffico;
- non esporre pubblicamente la console PocketBase senza adeguate restrizioni di rete.

Il modello previsto è **un'istanza per cliente**: isolamento semplice, personalizzazioni indipendenti e deploy/backup separati. Non è uno schema multi-tenant condiviso.

### Infrastruttura Hetzner

La directory [`terraform/`](terraform/) contiene il provisioning della VPS
Hetzner dedicata a Docker Compose, n8n e alle demo CRM. Account Hetzner,
tailnet Tailscale e state backend sono intenzionalmente separati
dall'infrastruttura OFC. Consulta [`terraform/README.md`](terraform/README.md)
prima di inizializzare o applicare il modulo.

### Deploy privato della demo

Il deploy privato costruisce il frontend e il server PocketBase in una singola
immagine, applica le migrazioni, crea l'utente demo in modo idempotente e carica
lo scenario dimostrativo. PocketBase resta dietro un gateway locale e la console
`/_/` non viene inoltrata. Il servizio è esposto in HTTPS soltanto tramite
Tailscale Serve.

```bash
make deploy-private
```

I secret vengono letti dal profilo AWS personale `andrea` e trasmessi alla VPS
via SSH; non sono salvati nel repository o negli argomenti dei processi. Per
leggere la password dell'utente `demo@designferri.local` nel proprio terminale:

```bash
aws ssm get-parameter \
  --profile andrea \
  --region eu-central-1 \
  --name /crm-demo/production/demo/app-user/password \
  --with-decryption \
  --query Parameter.Value \
  --output text
```
