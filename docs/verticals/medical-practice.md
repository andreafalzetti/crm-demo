# Verticale studio medico: appuntamenti e pagamenti

Stato: decisione architetturale e mock UI, 4 settembre 2026. Non sono ancora
presenti collezioni PocketBase, API di prenotazione o integrazioni di pagamento.

## Decisione

Per il primo verticale costruiamo nel CRM un motore di disponibilità mirato agli
studi medici piccoli e medi. Non self-hostiamo Cal.diy nel primo rilascio.

Il dominio rimane dietro una porta applicativa `SchedulingEngine`, così potremo
sostituire il motore interno con Cal.com commerciale senza riscrivere Personale,
Agenda, Anagrafiche o Pagamenti.

Motivazioni:

- il nuovo Cal.diy community è pensato per uso self-hosted personale e raccomanda
  esplicitamente cautela per la produzione;
- Teams, Organizations, Workflows e le altre funzionalità enterprise sono state
  rimosse da Cal.diy: sono proprio le capacità necessarie per uno studio con più
  professionisti;
- Cal.com commerciale dispone di eventi collettivi, round robin, managed event,
  routing per attributi, pesi e fallback, ma aggiunge dipendenza, licenza e un
  secondo sistema dati;
- per l'MVP ci servono regole più ristrette e fortemente collegate ai dati già
  presenti in PocketBase.

Fonti verificate:

- [Cal.diy README](https://github.com/calcom/cal.diy/blob/main/README.md)
- [Cal.com: event type e assegnazione](https://cal.com/docs/platform/atoms/event-type)
- [Cal.com: routing](https://cal.com/help/routing/routing-overview)
- [Cal.diy con Docker](https://www.cal.diy/docker)

## Confini dei moduli

| Modulo       | Possiede                                                 | Non possiede                |
| ------------ | -------------------------------------------------------- | --------------------------- |
| Anagrafiche  | paziente/cliente, contatti, consensi amministrativi      | dati clinici, disponibilità |
| Personale    | professionisti, competenze, sedi, turni, ferie, assenze  | appuntamenti                |
| Appuntamenti | tipi di visita, regole, slot, prenotazioni, assegnazione | movimenti contabili         |
| Agenda       | proiezione temporale unificata e blocchi manuali         | logica di distribuzione     |
| Pagamenti    | intenti, transazioni, rimborsi, riconciliazione          | dati carta, agenda          |

Il modulo Appuntamenti richiede Anagrafiche, Personale e Agenda. Pagamenti è
opzionale: se non è installato, una prestazione può comunque avere un prezzo
informativo e l'incasso viene gestito fuori dal CRM.

## Flusso di prenotazione

```text
richiesta
  -> tipo di appuntamento
  -> professionisti compatibili per competenza/sede
  -> turni del Personale
  -> meno ferie, assenze e blocchi Agenda
  -> applicazione regola di distribuzione
  -> hold temporaneo dello slot
  -> eventuale intento Pagamento
  -> conferma Appuntamento
  -> proiezione nell'Agenda
```

Ogni assegnazione conserva una `routing_trace`: candidati, esclusioni, regole
applicate e criterio finale. Questo rende spiegabile la distribuzione e aiuta la
segreteria a correggere le eccezioni.

## Modello dati concettuale

### Appuntamenti

- `appointment_types`: nome, durata, sede, modalità di prenotazione, tariffa e
  policy di pagamento;
- `appointment_type_staff`: professionisti abilitati, priorità, peso e
  competenze richieste;
- `availability_templates`: finestre settimanali ricorrenti per persona/sede;
- `availability_exceptions`: indisponibilità o disponibilità straordinarie;
- `routing_rules`: strategia, continuità assistenziale, fallback e limiti;
- `slot_holds`: prenotazioni temporanee con scadenza per evitare doppie
  assegnazioni;
- `appointments`: paziente, tipo, intervallo, stato, sede e canale;
- `appointment_assignments`: professionista assegnato e routing trace.

La creazione dello slot deve essere atomica. Turni e ferie sono input del calcolo,
non copie: una modifica approvata invalida gli slot futuri e segnala le
prenotazioni già in conflitto senza cancellarle automaticamente.

### Pagamenti

- `payment_accounts`: collegamento dello studio al provider, senza credenziali in
  chiaro;
- `payment_intents`: importo richiesto, scadenza, causale e riferimento
  all'appuntamento;
- `payment_transactions`: record immutabile dell'esito restituito dal provider;
- `payment_refunds`: rimborsi parziali o totali;
- `payment_reconciliations`: collegamento tra movimento esterno e operazione CRM;
- `payment_webhook_events`: idempotenza, firma verificata e stato di elaborazione.

Gli appuntamenti conoscono soltanto `payment_intent_id` e uno stato sintetico. Il
modulo Pagamenti conosce l'`appointment_id`, ma resta utilizzabile anche da
preventivi o altri moduli.

## Mollie

Il modello consigliato da validare commercialmente è Mollie Connect for
Platforms: ciascuno studio collega via OAuth il proprio account, incassa a proprio
nome e gestisce rimborsi e contestazioni. Il CRM può uniformare pagamenti online,
terminali fisici e registrazioni manuali senza diventare il titolare del denaro.

Riferimenti:

- [Mollie Connect overview](https://docs.mollie.com/docs/connect-overview)
- [Mollie Connect onboarding](https://docs.mollie.com/docs/connect-onboarding-of-oauth-apps)

Prima dell'implementazione vanno confermati disponibilità commerciale in Italia,
modello commissionale, terminali supportati, responsabilità sui chargeback e
flusso di onboarding dei singoli studi.

## Quando rivalutare Cal.com

Apriamo uno spike Cal.com Platform/Enterprise se entrano almeno due di questi
requisiti:

- prenotazione pubblica multi-timezone e multi-lingua;
- sincronizzazione bidirezionale con più calendari Google/Microsoft per persona;
- regole round robin pesate o routing per molti attributi;
- appuntamenti ricorrenti complessi, gruppi, liste d'attesa o workflow di reminder;
- molte sedi, stanze o risorse con conflitti incrociati;
- necessità di embed pubblico già maturo e personalizzabile.

Lo spike deve verificare licenza, data residency, trattamento dei dati, API,
webhook, SSO e costo operativo. Cal.diy non è il candidato per questo scenario;
la comparazione corretta è motore interno contro Cal.com commerciale.

## Guardrail per il verticale medico

Il CRM amministrativo non deve diventare implicitamente una cartella clinica.
Nel primo rilascio appuntamenti e agenda conservano soltanto informazioni
operative minime. Prima di gestire dati sanitari servono una progettazione
separata di autorizzazioni, audit, retention, backup, accessi di assistenza e
obblighi privacy.
