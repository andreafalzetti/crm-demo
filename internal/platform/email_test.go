package platform_test

import (
	"regexp"
	"strings"
	"testing"

	_ "github.com/designferri/crm-demo/internal/migrations"
	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/mails"
	"github.com/pocketbase/pocketbase/tests"
)

var brand = platform.Emails{Name: "Ferri & Co.", ShortName: "FC", Accent: "#087f48", TimeZone: "Europe/Rome"}

func TestTheFrameEscapesWhatItIsGiven(t *testing.T) {
	out := platform.ShortEmail{
		Frame:   platform.EmailFrame{Brand: brand, URL: "https://crm.test", Title: "Titolo <b>", Greeting: "Giulia", Label: "Accesso"},
		Text:    "Testo <script>alert(1)</script>",
		Details: [][2]string{{"Quando", "<i>oggi</i>"}},
		Code:    "123456",
		Link:    "https://crm.test/reset-password/abc",
		Button:  "Scegli la password",
	}.HTML()
	for _, bad := range []string{"ZgotmplZ", "<script>", "<b>", "<i>oggi"} {
		if strings.Contains(out, bad) {
			t.Errorf("%q non va scritto com'è", bad)
		}
	}
	for _, want := range []string{"Ciao Giulia,", "123456", "Scegli la password →", "Ferri &amp; Co.", ">FC<", "#087f48"} {
		if !strings.Contains(out, want) {
			t.Errorf("manca %q", want)
		}
	}
}

var resetLink = regexp.MustCompile(`href="https://crm\.test/reset-password/([^"]+)"`)

func TestSystemEmailsTakeTheFrame(t *testing.T) {
	app, err := tests.NewTestApp(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer app.Cleanup()
	settings := app.Settings()
	settings.Meta.AppURL = "https://crm.test/"
	if err := app.Save(settings); err != nil {
		t.Fatal(err)
	}
	platform.RegisterEmails(app, brand)
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	role, err := app.FindFirstRecordByData("roles", "key", "administrator")
	if err != nil {
		t.Fatal(err)
	}
	user := core.NewRecord(users)
	user.SetEmail("giulia@crm.test")
	user.SetPassword("Password-12345")
	user.Set("name", "Giulia Rossi")
	user.Set("active", true)
	user.Set("roles", []string{role.Id})
	if err := app.Save(user); err != nil {
		t.Fatal(err)
	}

	if err := mails.SendRecordPasswordReset(app, user); err != nil {
		t.Fatal(err)
	}
	message := app.TestMailer.LastMessage()
	if !resetLink.MatchString(message.HTML) || strings.Contains(message.HTML, "/_/") ||
		message.Subject != "Una nuova password · Ferri & Co." || !strings.Contains(message.HTML, "Ciao Giulia,") {
		t.Fatalf("la nuova password, in italiano e verso l'app: %q %s", message.Subject, message.HTML)
	}

	if err := mails.SendRecordAuthAlert(app, user, "2026-10-29 17:05:00.000Z - 93.184.216.34 Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"); err != nil {
		t.Fatal(err)
	}
	message = app.TestMailer.LastMessage()
	for _, want := range []string{"Giovedì 29 ottobre, alle 18:05", "Safari su Mac", "93.184.216.34"} {
		if !strings.Contains(message.HTML, want) {
			t.Errorf("l'avviso dice %q", want)
		}
	}
}
