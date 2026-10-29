package platform

import (
	"fmt"
	"html"
	"net/url"
	"strings"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// ResetPasswordPath is the page of the app where the link for a new
// password leads: PocketBase's own is in the console, which a public
// deployment keeps closed.
const ResetPasswordPath = "/reset-password/"

// RegisterEmails gives the frame of the CRM (email.go) to the emails
// PocketBase sends by itself: the link for a new password, the code to
// come in, the alert of an access from a new device, the confirmation of
// an address. Without it they leave with PocketBase's templates, in
// English.
func RegisterEmails(app core.App, brand Emails) {
	frame := func(e *core.MailerRecordEvent, title, label, reason string) EmailFrame {
		return EmailFrame{Brand: brand, URL: appURL(e.App), Title: title, Label: label, Greeting: FirstName(e.Record), Reason: reason}
	}
	send := func(e *core.MailerRecordEvent, subject string, m ShortEmail) error {
		e.Message.Subject = subject + " · " + brand.Name
		e.Message.HTML, e.Message.Text = m.HTML(), m.PlainText()
		return e.Next()
	}

	app.OnMailerRecordPasswordResetSend().BindFunc(func(e *core.MailerRecordEvent) error {
		token, _ := e.Meta["token"].(string)
		return send(e, "Una nuova password", ShortEmail{
			Frame:  frame(e, "Scegli una nuova password", "Accesso", "Ti arriva perché qualcuno ha chiesto di cambiare la password del tuo account dalla pagina di accesso."),
			Text:   "Abbiamo ricevuto la richiesta di una nuova password per il tuo account. Il pulsante apre la pagina dove sceglierla.",
			Link:   tokenLink(e.App, e.Record, ResetPasswordPath, "confirm-password-reset", token),
			Button: "Scegli la password",
			After:  "Il link vale 30 minuti e si usa una volta. Se non l'hai chiesto tu, ignora questa email: la password resta quella di prima.",
		})
	})

	app.OnMailerRecordOTPSend().BindFunc(func(e *core.MailerRecordEvent) error {
		code, _ := e.Meta["password"].(string)
		return send(e, "Il codice per entrare", ShortEmail{
			Frame: frame(e, "Il codice per entrare", "Accesso", "Ti arriva perché qualcuno ha chiesto di entrare con il tuo account."),
			Text:  "Scrivi questo codice nella pagina di accesso. Vale pochi minuti.",
			Code:  code,
			After: "Se non stai entrando tu, ignora questa email e avvisa l'amministratore.",
		})
	})

	app.OnMailerRecordAuthAlertSend().BindFunc(func(e *core.MailerRecordEvent) error {
		info, _ := e.Meta["info"].(string)
		return send(e, "Nuovo accesso", ShortEmail{
			Frame:   frame(e, "Un accesso da un dispositivo nuovo", "Sicurezza", "Ti arriva a ogni accesso da un dispositivo che il CRM non conosce."),
			Text:    "Qualcuno è entrato nel tuo account da un dispositivo nuovo. Se sei stato tu, non serve fare niente.",
			Details: alertDetails(html.UnescapeString(info), brand),
			After:   "Se non sei stato tu, cambia subito la password e avvisa l'amministratore.",
		})
	})

	// The CRM does not ask to confirm an address nor to change it: these
	// arrive only to the accounts of the console, and lead there.
	confirm := func(e *core.MailerRecordEvent, action string) error {
		token, _ := e.Meta["token"].(string)
		return send(e, "Conferma l'indirizzo", ShortEmail{
			Frame:  frame(e, "Conferma il tuo indirizzo", "Accesso", "Ti arriva perché questo indirizzo è stato scritto per un account del CRM."),
			Text:   "Conferma che questo indirizzo email è il tuo.",
			Link:   consoleLink(e.App, action, token),
			Button: "Conferma l'indirizzo",
			After:  "Se non sai di che si tratta, ignora questa email.",
		})
	}
	app.OnMailerRecordVerificationSend().BindFunc(func(e *core.MailerRecordEvent) error {
		return confirm(e, "confirm-verification")
	})
	app.OnMailerRecordEmailChangeSend().BindFunc(func(e *core.MailerRecordEvent) error {
		return confirm(e, "confirm-email-change")
	})
}

func appURL(app core.App) string {
	return strings.TrimRight(app.Settings().Meta.AppURL, "/")
}

// tokenLink is the page of the app for the people of users, the console's
// for the other accounts (superusers).
func tokenLink(app core.App, record *core.Record, path, consoleAction, token string) string {
	if record.Collection().Name == "users" {
		return appURL(app) + path + url.PathEscape(token)
	}
	return consoleLink(app, consoleAction, token)
}

func consoleLink(app core.App, action, token string) string {
	return appURL(app) + "/_/#/auth/" + action + "/" + token
}

var (
	weekdayNames = []string{"Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"}
	monthNames   = []string{"gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"}
)

// alertDetails reads PocketBase's line about an access, «2026-10-25
// 21:00:26.242Z - 101.57.218.155 Mozilla/5.0 (…)»: when (in the instance's
// time zone), from which device and from which address.
func alertDetails(info string, brand Emails) [][2]string {
	date, rest, _ := strings.Cut(info, " - ")
	ip, agent, _ := strings.Cut(strings.TrimSpace(rest), " ")
	details := [][2]string{}
	if parsed, err := types.ParseDateTime(strings.TrimSpace(date)); err == nil && !parsed.IsZero() {
		when := parsed.Time().In(brand.location())
		details = append(details, [2]string{"Quando", fmt.Sprintf("%s %d %s, alle %s",
			weekdayNames[when.Weekday()], when.Day(), monthNames[when.Month()-1], when.Format("15:04"))})
	}
	details = append(details, [2]string{"Dispositivo", deviceOf(agent)})
	if ip != "" {
		details = append(details, [2]string{"Indirizzo IP", ip})
	}
	return details
}

// deviceOf: «Chrome su Mac», «Safari su iPhone»… from the user agent; what
// it does not recognize stays out.
func deviceOf(agent string) string {
	browser, system := "", ""
	for _, s := range []struct{ sign, name string }{
		{"iPhone", "iPhone"}, {"iPad", "iPad"}, {"Android", "Android"}, {"Macintosh", "Mac"},
		{"Windows", "Windows"}, {"Linux", "Linux"},
	} {
		if strings.Contains(agent, s.sign) {
			system = s.name
			break
		}
	}
	switch {
	case strings.Contains(agent, "Edg/"):
		browser = "Edge"
	case strings.Contains(agent, "Firefox/") || strings.Contains(agent, "FxiOS/"):
		browser = "Firefox"
	case strings.Contains(agent, "Chrome/") || strings.Contains(agent, "CriOS/"):
		browser = "Chrome"
	case strings.Contains(agent, "Safari/"):
		browser = "Safari"
	}
	switch {
	case browser != "" && system != "":
		return browser + " su " + system
	case browser != "":
		return browser
	case system != "":
		return system
	}
	return "Non riconosciuto"
}
