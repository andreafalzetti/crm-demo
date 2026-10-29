package platform

import (
	"bytes"
	"fmt"
	"html/template"
	"regexp"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

// The frame of every email the CRM sends (docs/email.md), taken from the
// emails of Geenuga: the brand mark on top, a card with a dark band (what
// it is about, the greeting, the title) and the content, at the bottom why
// it arrives. Tables and inline styles, because Gmail and Outlook ignore
// almost everything else. The neutrals are those of packages/ui
// globals.css written out (an email has no CSS of the page), the band is
// the dark of the login page, the accent is the instance's.
const (
	EmailPage   = "#faf5ed" // background
	EmailCard   = "#fffdf9" // card
	EmailInk    = "#1d160e" // foreground
	EmailMuted  = "#70675e" // muted-foreground
	EmailSoft   = "#f0eae2" // muted: the boxes of details and code
	EmailBorder = "#d8d0c4" // border
	EmailBand   = "#1d211e" // the dark of the login page
	EmailOnBand = "#d6d3cc"
	EmailFont   = "'IBM Plex Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif"
	EmailSerif  = "'Newsreader',Georgia,'Times New Roman',serif"
)

// Emails is who sends: the instance's name, its short name for the mark,
// its accent and the time zone of its people.
type Emails struct {
	Name, ShortName, Accent, TimeZone string
}

var hexColor = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

func (e Emails) accent() string {
	if hexColor.MatchString(e.Accent) {
		return e.Accent
	}
	return "#087f48"
}

func (e Emails) location() *time.Location {
	if location, err := time.LoadLocation(e.TimeZone); err == nil && e.TimeZone != "" {
		return location
	}
	return time.UTC
}

// EmailFrame is what the frame says around the content.
type EmailFrame struct {
	Brand Emails
	// URL is the address the CRM is reached at, for the links.
	URL string
	// Title is the heading on the band and the <title> of the page.
	Title string
	// Preview is the line the inbox shows under the subject.
	Preview string
	// Label is the small tag over the title: «Accesso», «Sicurezza».
	Label string
	// Greeting is the first name: «Ciao Giulia,».
	Greeting string
	// Reason says why the email arrives.
	Reason string
}

type frameView struct {
	EmailFrame
	Content                                              template.HTML
	Mark, Host                                           string
	Page, Card, Ink, Muted, Border, Band, OnBand, Accent string
	Font, Serif                                          template.CSS
}

var frameTemplate = template.Must(template.New("frame").Parse(`<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>{{.Title}}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:ital,wght@0,500;1,500&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:{{.Page}};-webkit-text-size-adjust:100%">
{{if .Preview}}<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">{{.Preview}}</div>{{end}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{{.Page}}"><tr><td align="center" style="padding:24px 12px 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;font-family:{{.Font}};color:{{.Ink}}">
<tr><td style="padding:0 4px 16px"><a href="{{.URL}}" style="text-decoration:none;color:{{.Ink}}"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td valign="middle" style="padding-right:10px"><div style="width:34px;height:34px;line-height:34px;border:1px solid {{.Border}};border-radius:999px;text-align:center;font-family:{{.Serif}};font-size:17px;font-style:italic;color:{{.Ink}}">{{.Mark}}</div></td>
<td valign="middle" style="font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:{{.Ink}}">{{.Brand.Name}}</td></tr></table></a></td></tr>
<tr><td style="background:{{.Card}};border:1px solid {{.Border}};border-radius:16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate">
<tr><td bgcolor="{{.Band}}" style="background:{{.Band}};border-radius:15px 15px 0 0;padding:22px 26px 24px">
{{if .Label}}<span style="display:inline-block;margin:0 0 12px;padding:3px 10px;border-radius:999px;background:{{.Accent}};color:#ffffff;font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase">{{.Label}}</span><br>{{end}}
{{if .Greeting}}<div style="margin:0 0 4px;font-size:15px;color:{{.OnBand}}">Ciao {{.Greeting}},</div>{{end}}
<h1 style="margin:0;font-family:{{.Serif}};font-size:28px;line-height:1.15;font-weight:500;color:#ffffff">{{.Title}}</h1></td></tr>
<tr><td style="padding:24px 26px 28px">{{.Content}}</td></tr>
</table></td></tr>
<tr><td style="padding:20px 16px 0;font-size:12px;line-height:1.6;color:{{.Muted}};text-align:center">
{{if .Reason}}<div>{{.Reason}}</div>{{end}}
<div style="margin-top:6px"><strong style="color:{{.Ink}}">{{.Brand.Name}}</strong>{{if .URL}} · <a href="{{.URL}}" style="color:{{.Muted}}">{{.Host}}</a>{{end}}</div>
</td></tr></table></td></tr></table></body></html>`))

// HTML puts the content, already written and escaped, in the frame.
func (f EmailFrame) HTML(content string) string {
	mark := f.Brand.ShortName
	if runes := []rune(mark); len(runes) > 2 {
		mark = string(runes[:2])
	}
	view := frameView{
		EmailFrame: f, Content: template.HTML(content), Mark: mark,
		Host: strings.TrimPrefix(strings.TrimPrefix(f.URL, "https://"), "http://"),
		Page: EmailPage, Card: EmailCard, Ink: EmailInk, Muted: EmailMuted, Border: EmailBorder,
		Band: EmailBand, OnBand: EmailOnBand, Accent: f.Brand.accent(),
		Font: template.CSS(EmailFont), Serif: template.CSS(EmailSerif),
	}
	var out bytes.Buffer
	if err := frameTemplate.Execute(&out, view); err != nil {
		// The template is fixed and the values are strings: it does not fail.
		return content
	}
	return out.String()
}

// EmailButton is the button of an email: one per email, the action it is
// for, in the instance's accent.
func EmailButton(brand Emails, href, label string) string {
	return fmt.Sprintf(`<a href="%s" style="display:inline-block;padding:12px 22px;border-radius:10px;background:%s;color:#ffffff;font-family:%s;font-size:15px;font-weight:600;text-decoration:none">%s →</a>`,
		template.HTMLEscapeString(href), brand.accent(), EmailFont, template.HTMLEscapeString(label))
}

// ShortEmail is an email of service: a sentence, if needed a box of details
// or a code to copy, a button and a last sentence.
type ShortEmail struct {
	Frame EmailFrame
	Text  string
	// Details are (label, value) pairs: when, from which device.
	Details [][2]string
	// Code is shown big, to copy.
	Code         string
	Link, Button string
	// After is a last sentence: how long the link lasts.
	After string
}

var shortTemplate = template.Must(template.New("short").Parse(`<p style="margin:0;font-size:16px;line-height:1.6;color:{{.Ink}}">{{.Text}}</p>
{{if .Details}}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:{{.Soft}};border-radius:12px;border-collapse:separate">
{{range $i, $d := .Details}}<tr><td style="padding:{{if eq $i 0}}16px{{else}}12px{{end}} 18px 0"><div style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:{{$.Muted}}">{{index $d 0}}</div>
<div style="margin-top:2px;font-size:15px;font-weight:600;line-height:1.4;color:{{$.Ink}};word-break:break-word">{{index $d 1}}</div></td></tr>
{{end}}<tr><td style="height:16px;line-height:16px;font-size:0">&nbsp;</td></tr></table>{{end}}
{{if .Code}}<div style="margin-top:20px;padding:18px;border-radius:12px;background:{{.Soft}};text-align:center;font-size:32px;font-weight:600;letter-spacing:8px;color:{{.Ink}}">{{.Code}}</div>{{end}}
{{if .Link}}<div style="margin-top:24px">{{.ButtonHTML}}</div>{{end}}
{{if .After}}<p style="margin:20px 0 0;font-size:14px;line-height:1.55;color:{{.Muted}}">{{.After}}</p>{{end}}
{{if .Link}}<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:{{.Muted}}">Se il pulsante non funziona, copia questo indirizzo nel browser:<br><a href="{{.Link}}" style="color:{{.Muted}};word-break:break-all">{{.Link}}</a></p>{{end}}`))

// HTML writes the email, frame included.
func (m ShortEmail) HTML() string {
	if m.Frame.Preview == "" {
		m.Frame.Preview = m.Text
	}
	view := struct {
		ShortEmail
		ButtonHTML       template.HTML
		Ink, Muted, Soft string
	}{m, template.HTML(EmailButton(m.Frame.Brand, m.Link, m.Button)), EmailInk, EmailMuted, EmailSoft}
	var out bytes.Buffer
	if err := shortTemplate.Execute(&out, view); err != nil {
		return m.Frame.HTML(template.HTMLEscapeString(m.Text))
	}
	return m.Frame.HTML(out.String())
}

// PlainText is the version for the clients that do not read HTML.
func (m ShortEmail) PlainText() string {
	parts := []string{}
	if m.Frame.Greeting != "" {
		parts = append(parts, "Ciao "+m.Frame.Greeting+",")
	}
	parts = append(parts, m.Text)
	for _, detail := range m.Details {
		parts = append(parts, detail[0]+": "+detail[1])
	}
	if m.Code != "" {
		parts = append(parts, m.Code)
	}
	if m.Link != "" {
		parts = append(parts, m.Button+": "+m.Link)
	}
	if m.After != "" {
		parts = append(parts, m.After)
	}
	if m.Frame.Reason != "" {
		parts = append(parts, m.Frame.Reason)
	}
	parts = append(parts, "— "+m.Frame.Brand.Name)
	return strings.Join(parts, "\n\n")
}

// FirstName is how an email greets the person: the first name, or the
// part of the email before the @.
func FirstName(record *core.Record) string {
	if name := strings.Fields(record.GetString("name")); len(name) > 0 {
		return name[0]
	}
	return strings.Split(record.Email(), "@")[0]
}
