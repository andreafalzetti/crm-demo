# Le email del CRM

Le email che il CRM manda hanno tutte la stessa cornice
(`internal/platform/email.go`), presa dal modello delle email di Geenuga e
portata nello stile del CRM:

- in alto il marchio dell'istanza (le iniziali nel cerchio e il nome, come
  `BrandMark`);
- una scheda con la fascia scura della pagina di accesso: l'etichetta
  nell'accento dell'istanza («Accesso», «Sicurezza»), il saluto con il nome,
  il titolo in Newsreader;
- il contenuto, con al più un pulsante (`platform.EmailButton`);
- in fondo perché arriva, il nome dell'istanza e il suo indirizzo.

Tabelle e stili in linea, perché Gmail e Outlook ignorano quasi tutto il
resto; ogni valore passa da `html/template`. Ogni email ha anche la versione
di solo testo.

## L'istanza

Nome, iniziali, accento e fuso orario arrivano da `crmEmails()` in
`apps/<istanza>/server/modules.go`, che `pnpm crm:new` scrive con gli stessi
valori del manifest web; `main.go` li passa a `platform.RegisterEmails`.
L'indirizzo dei link è `Meta.AppURL` delle impostazioni di PocketBase.

## Quali sono

| Email | Da dove parte | Pezzi |
| --- | --- | --- |
| Scegli una nuova password | «Password dimenticata?» (`request-password-reset`) | pulsante alla pagina `/reset-password/:token` |
| Il codice per entrare | PocketBase (`request-otp`), se attivato | codice in grande |
| Un accesso da un dispositivo nuovo | PocketBase (avviso di accesso) | quando, dispositivo, IP |
| Conferma il tuo indirizzo | PocketBase, solo per gli account della console | pulsante alla console |

`platform.ShortEmail` è l'email di servizio: un testo, se serve un riquadro
di dettagli o un codice, un pulsante e una frase dopo. Le email nuove di un
modulo passano da lì o, se hanno un contenuto loro, da `EmailFrame.HTML`.

## Il link per la password

La pagina di PocketBase per la nuova password sta nella console (`/_/`), che
un'installazione pubblica tiene chiusa. Il link delle persone di `users`
porta quindi a `/reset-password/:token` dell'app (`ResetPasswordPage` di
`@crm/app-core`), che chiama `confirm-password-reset`.
