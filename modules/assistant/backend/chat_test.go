package assistant

import (
	"testing"
	"time"
)

func TestCanonicalLinks(t *testing.T) {
	links := canonicalLinks([]recordLink{
		{Label: "Cliente", To: "/organizations/customer-id"},
		{Label: "Agenda", To: "/agenda"},
		{Label: "Esterno", To: "https://example.test/collect"},
		{Label: "Protocol relative", To: "//example.test/collect"},
	})
	if len(links) != 2 {
		t.Fatalf("expected 2 internal links, got %#v", links)
	}
	if links[0].To != "/organizations/customer-id" || links[1].To != "/agenda" {
		t.Fatalf("unexpected links: %#v", links)
	}
}

func TestAssistantContextDefaultsToRome(t *testing.T) {
	now := time.Date(2026, time.September, 5, 7, 30, 0, 0, time.UTC)
	context, err := resolveAssistantContext("", now)
	if err != nil {
		t.Fatal(err)
	}
	if context.TimeZone != "Europe/Rome" || context.CurrentDateTime != "2026-09-05T09:30:00+02:00" {
		t.Fatalf("unexpected assistant context: %#v", context)
	}
	if context.DefaultAppointmentMinutes != 30 {
		t.Fatalf("unexpected appointment default: %#v", context)
	}
}

func TestAssistantContextRejectsInvalidTimeZone(t *testing.T) {
	if _, err := resolveAssistantContext("Mars/Olympus", time.Now()); err == nil {
		t.Fatal("expected invalid timezone to be rejected")
	}
}
