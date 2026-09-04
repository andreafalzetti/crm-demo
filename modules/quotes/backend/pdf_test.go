package quotes

import (
	"bytes"
	"testing"
	"time"
)

func TestRenderPDFProducesAValidDocumentEnvelope(t *testing.T) {
	document := renderQuotePDF(quotePDF{
		Issuer:      "Ferri & Co.",
		Accent:      "#087f48",
		Number:      "PRE-001",
		Title:       "Attività con accenti",
		Client:      "Azienda Demo",
		GeneratedAt: time.Date(2026, 9, 4, 10, 0, 0, 0, time.UTC),
		Lines: []quotePDFLine{
			{Description: "Consulenza", Quantity: 1, UnitPrice: 100, TaxRate: 22, Total: 100},
		},
		Subtotal: 100,
		TaxTotal: 22,
		Total:    122,
	})

	if !bytes.HasPrefix(document, []byte("%PDF-")) {
		t.Fatal("missing PDF header")
	}
	if !bytes.Contains(document, []byte("xref")) || !bytes.HasSuffix(document, []byte("%%EOF\n")) {
		t.Fatal("missing PDF cross-reference table or EOF marker")
	}
}

func TestRenderPDFPaginatesLongQuotes(t *testing.T) {
	lines := make([]quotePDFLine, 19)
	for index := range lines {
		lines[index] = quotePDFLine{Description: "Voce", Quantity: 1, UnitPrice: 10, Total: 10}
	}
	document := renderQuotePDF(quotePDF{Number: "PRE-002", GeneratedAt: time.Now(), Lines: lines})
	if bytes.Count(document, []byte("/Type /Page ")) != 3 {
		t.Fatal("expected three PDF pages")
	}
}
