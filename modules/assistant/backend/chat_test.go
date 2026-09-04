package assistant

import "testing"

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
