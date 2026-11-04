# Ruoli e permessi

I permessi li dichiarano i moduli, uno per tabella e per operazione
(`agenda.entries.read`, `.create`, `.update`, `.delete`), e i ruoli li
combinano. Un utente ha uno o più ruoli: i permessi si sommano. Le pagine
sono in **Amministrazione → Ruoli e permessi** e **Persone e accessi**.

## La finestra del ruolo

Portata da Ambrosia il 3 novembre 2026, dove spuntare una sessantina di
permessi uno a uno era lento.

- **Nuovo ruolo** crea un ruolo; la chiave si ricava dal nome
  («Responsabile vendite» → `responsabile-vendite`). Un ruolo creato qui
  cambia nome e si elimina, se nessuno lo ha; i ruoli di sistema cambiano
  solo descrizione e permessi.
- **Parti da**: un ruolo nuovo parte dai permessi di un altro, o da
  nessuno, e poi si cambia solo quello che serve.
- I permessi stanno **per modulo, chiusi**, con «quanti di quanti» e la
  casella del modulo che li accende o li spegne tutti; la ricerca (per
  nome, descrizione o chiave) li apre.
- **Permessi collegati**, per convenzione dei nomi: `x.y.create`,
  `.update`, `.delete` e ogni altro verbo vogliono `x.y.read`, quando il
  modulo lo dichiara. Spuntandone uno si spunta anche la lettura; togliendo
  la lettura si tolgono quelli che la vogliono. Il server non lo impone, è
  un aiuto della pagina. Un permesso senza `read` accanto (per esempio
  `quotes.generate`) resta da solo.
- Nel piè, prima di salvare, cosa cambia: «3 in più, 1 in meno rispetto
  al ruolo Manager».

## L'assistenza

Il ruolo di sistema **Assistenza F2 Labs** (`assistenza`) è di chi fornisce
assistenza al cliente.

- **Tutti i permessi, sempre.** Dall'API, chi non è dell'assistenza non
  tocca il ruolo, e nessuno, nemmeno l'assistenza, gli toglie un permesso.
  Sotto, gli hook di modello di `internal/platform/support.go` gli rimettono
  tutti i permessi a ogni salvataggio, da qualunque parte arrivi (console,
  migrazioni), e non lo lasciano eliminare. Un permesso nuovo gli arriva
  quando nasce, e a ogni avvio il ruolo si riallinea.
- **Le sue persone le gestisce solo l'assistenza**: chi gestisce gli
  utenti non dà né toglie il ruolo, e non cambia, disattiva o elimina chi
  lo ha (altrimenti basterebbe una password nuova per prenderne il posto).
- **In disparte.** Il campo derivato `users.support` (hook di modello, dai
  ruoli) dice chi è dell'assistenza. In Ruoli e permessi il suo ruolo è una
  riga in fondo, con quante persone lo hanno; in Persone e accessi le sue
  persone stanno in fondo, chiuse; nella creazione di un utente il ruolo
  lo vede solo l'assistenza. Resta visibile, non nascosto: il cliente deve
  sapere chi può entrare nei suoi dati, e l'audit lo registra come tutti.
- Un CRM che lista le persone (assegnatari, notifiche a tutti) le prende
  con il filtro `active = true && support = false`, come fa Ambrosia.
