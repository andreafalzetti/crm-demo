package quotes

import (
	"bytes"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"golang.org/x/text/encoding/charmap"
)

const (
	pageWidth    = 595.0
	pageHeight   = 842.0
	linesPerPage = 9
)

type quotePDFLine struct {
	Description string
	Quantity    float64
	UnitPrice   float64
	TaxRate     float64
	Total       float64
}

type quotePDF struct {
	Issuer      string
	Accent      string
	Number      string
	Title       string
	Client      string
	Address     string
	VATNumber   string
	ValidUntil  string
	Notes       string
	GeneratedAt time.Time
	Lines       []quotePDFLine
	Subtotal    float64
	TaxTotal    float64
	Total       float64
}

type pdfColor struct {
	red   float64
	green float64
	blue  float64
}

type pdfCanvas struct {
	content strings.Builder
}

func renderQuotePDF(document quotePDF) []byte {
	pageCount := max(1, int(math.Ceil(float64(len(document.Lines))/linesPerPage)))
	pages := make([]string, 0, pageCount)
	for page := 0; page < pageCount; page++ {
		start := page * linesPerPage
		end := min(start+linesPerPage, len(document.Lines))
		lines := document.Lines[start:end]
		pages = append(pages, renderQuotePage(document, lines, page+1, pageCount, page == pageCount-1))
	}
	return assemblePDF(pages, document)
}

func renderQuotePage(document quotePDF, lines []quotePDFLine, page, pageCount int, lastPage bool) string {
	canvas := &pdfCanvas{}
	accent := parsePDFColor(document.Accent)
	dark := pdfColor{red: 0.12, green: 0.13, blue: 0.12}
	muted := pdfColor{red: 0.42, green: 0.40, blue: 0.36}
	paper := pdfColor{red: 0.98, green: 0.97, blue: 0.94}
	sand := pdfColor{red: 0.91, green: 0.88, blue: 0.80}
	white := pdfColor{red: 1, green: 1, blue: 1}

	canvas.fillRect(0, 0, pageWidth, pageHeight, paper)
	canvas.fillRect(0, 0, pageWidth, 144, accent)
	canvas.text(48, 42, 10, "F2", white, strings.ToUpper(defaultString(document.Issuer, "CRM MODULARE")))
	canvas.text(48, 76, 9, "F2", white, "PREVENTIVO")
	canvas.text(48, 112, 27, "F2", white, truncatePDFText(document.Number, 30))
	canvas.textRight(547, 42, 9, "F1", white, fmt.Sprintf("PAGINA %d / %d", page, pageCount))
	canvas.textRight(547, 61, 9, "F1", white, document.GeneratedAt.Format("02/01/2006"))

	canvas.text(48, 180, 8, "F2", accent, "CLIENTE")
	canvas.text(48, 203, 16, "F2", dark, truncatePDFText(document.Client, 38))
	clientDetail := strings.TrimSpace(strings.Join(nonEmpty(
		truncatePDFText(document.Address, 48),
		prefixed("P. IVA ", document.VATNumber),
	), "  ·  "))
	canvas.text(48, 223, 9, "F1", muted, clientDetail)
	canvas.text(318, 180, 8, "F2", accent, "OGGETTO")
	canvas.text(318, 203, 13, "F2", dark, truncatePDFText(document.Title, 38))
	canvas.line(48, 242, 547, 242, pdfColor{red: 0.82, green: 0.79, blue: 0.72}, 0.8)

	const tableTop = 260.0
	canvas.fillRect(48, tableTop, 499, 28, sand)
	canvas.text(58, tableTop+19, 8, "F2", dark, "DESCRIZIONE")
	canvas.textRight(355, tableTop+19, 8, "F2", dark, "Q.TÀ")
	canvas.textRight(430, tableTop+19, 8, "F2", dark, "PREZZO")
	canvas.textRight(474, tableTop+19, 8, "F2", dark, "IVA")
	canvas.textRight(537, tableTop+19, 8, "F2", dark, "TOTALE")

	for index, line := range lines {
		top := tableTop + 28 + float64(index)*34
		if index%2 == 0 {
			canvas.fillRect(48, top, 499, 34, white)
		}
		canvas.text(58, top+21, 9, "F1", dark, truncatePDFText(line.Description, 43))
		canvas.textRight(355, top+21, 9, "F1", dark, formatQuantity(line.Quantity))
		canvas.textRight(430, top+21, 9, "F1", dark, formatMoney(line.UnitPrice))
		canvas.textRight(474, top+21, 9, "F1", dark, fmt.Sprintf("%.0f%%", line.TaxRate))
		canvas.textRight(537, top+21, 9, "F2", dark, formatMoney(line.Total))
		canvas.line(48, top+34, 547, top+34, pdfColor{red: 0.89, green: 0.87, blue: 0.82}, 0.5)
	}

	if lastPage {
		totalsTop := tableTop + 28 + float64(len(lines))*34 + 24
		canvas.text(360, totalsTop, 9, "F1", muted, "Imponibile")
		canvas.textRight(537, totalsTop, 10, "F2", dark, formatMoney(document.Subtotal))
		canvas.text(360, totalsTop+24, 9, "F1", muted, "IVA")
		canvas.textRight(537, totalsTop+24, 10, "F2", dark, formatMoney(document.TaxTotal))
		canvas.line(360, totalsTop+37, 547, totalsTop+37, accent, 1)
		canvas.text(360, totalsTop+60, 10, "F2", accent, "TOTALE")
		canvas.textRight(537, totalsTop+60, 15, "F2", accent, formatMoney(document.Total))

		notesTop := min(totalsTop+98, 746.0)
		validity := formatItalianDate(document.ValidUntil)
		if validity != "" {
			canvas.text(48, notesTop, 8, "F2", accent, "VALIDITÀ OFFERTA")
			canvas.text(48, notesTop+20, 10, "F1", dark, validity)
		}
		if document.Notes != "" {
			canvas.text(200, notesTop, 8, "F2", accent, "NOTE")
			canvas.text(200, notesTop+20, 9, "F1", dark, truncatePDFText(document.Notes, 72))
		}
	}

	canvas.line(48, 801, 547, 801, pdfColor{red: 0.82, green: 0.79, blue: 0.72}, 0.6)
	canvas.text(48, 820, 8, "F1", muted, "Documento generato dal CRM · importi espressi in EUR")
	canvas.textRight(547, 820, 8, "F1", muted, document.Number)
	return canvas.content.String()
}

func assemblePDF(pages []string, document quotePDF) []byte {
	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>",
		"",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
	}
	kids := make([]string, 0, len(pages))
	for _, content := range pages {
		pageID := len(objects) + 1
		streamID := pageID + 1
		kids = append(kids, fmt.Sprintf("%d 0 R", pageID))
		objects = append(objects,
			fmt.Sprintf("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.0f %.0f] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents %d 0 R >>", pageWidth, pageHeight, streamID),
			fmt.Sprintf("<< /Length %d >>\nstream\n%sendstream", len(content), content),
		)
	}
	objects[1] = fmt.Sprintf("<< /Type /Pages /Kids [%s] /Count %d >>", strings.Join(kids, " "), len(pages))
	infoID := len(objects) + 1
	objects = append(objects, fmt.Sprintf(
		"<< /Title (%s) /Author (%s) /Creator (CRM modulare) /CreationDate (D:%s) >>",
		escapePDFText("Preventivo "+document.Number),
		escapePDFText(defaultString(document.Issuer, "CRM modulare")),
		document.GeneratedAt.Format("20060102150405Z"),
	))

	var output bytes.Buffer
	output.WriteString("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")
	offsets := make([]int, len(objects)+1)
	for index, object := range objects {
		offsets[index+1] = output.Len()
		fmt.Fprintf(&output, "%d 0 obj\n%s\nendobj\n", index+1, object)
	}
	xref := output.Len()
	fmt.Fprintf(&output, "xref\n0 %d\n0000000000 65535 f \n", len(objects)+1)
	for index := 1; index <= len(objects); index++ {
		fmt.Fprintf(&output, "%010d 00000 n \n", offsets[index])
	}
	fmt.Fprintf(&output, "trailer\n<< /Size %d /Root 1 0 R /Info %d 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(objects)+1, infoID, xref)
	return output.Bytes()
}

func (canvas *pdfCanvas) fillRect(x, top, width, height float64, color pdfColor) {
	fmt.Fprintf(&canvas.content, "%.3f %.3f %.3f rg %.1f %.1f %.1f %.1f re f\n", color.red, color.green, color.blue, x, pageHeight-top-height, width, height)
}

func (canvas *pdfCanvas) line(x1, top1, x2, top2 float64, color pdfColor, width float64) {
	fmt.Fprintf(&canvas.content, "%.3f %.3f %.3f RG %.1f w %.1f %.1f m %.1f %.1f l S\n", color.red, color.green, color.blue, width, x1, pageHeight-top1, x2, pageHeight-top2)
}

func (canvas *pdfCanvas) text(x, top, size float64, font string, color pdfColor, value string) {
	if value == "" {
		return
	}
	fmt.Fprintf(&canvas.content, "BT /%s %.1f Tf %.3f %.3f %.3f rg 1 0 0 1 %.1f %.1f Tm (%s) Tj ET\n", font, size, color.red, color.green, color.blue, x, pageHeight-top, escapePDFText(value))
}

func (canvas *pdfCanvas) textRight(right, top, size float64, font string, color pdfColor, value string) {
	factor := 0.49
	if font == "F2" {
		factor = 0.53
	}
	width := float64(len([]rune(value))) * size * factor
	canvas.text(right-width, top, size, font, color, value)
}

func escapePDFText(value string) string {
	var encoded strings.Builder
	for _, character := range value {
		if character == '\n' || character == '\r' {
			character = ' '
		}
		if character == '–' || character == '—' || character == '‑' {
			character = '-'
		}
		encodedCharacter, ok := charmap.Windows1252.EncodeRune(character)
		if !ok {
			encodedCharacter = '?'
		}
		switch encodedCharacter {
		case '\\', '(', ')':
			encoded.WriteByte('\\')
		}
		encoded.WriteByte(encodedCharacter)
	}
	return encoded.String()
}

func parsePDFColor(value string) pdfColor {
	value = strings.TrimPrefix(value, "#")
	if len(value) != 6 {
		return pdfColor{red: 0.03, green: 0.50, blue: 0.28}
	}
	parts := [3]float64{}
	for index := range parts {
		channel, err := strconv.ParseUint(value[index*2:index*2+2], 16, 8)
		if err != nil {
			return pdfColor{red: 0.03, green: 0.50, blue: 0.28}
		}
		parts[index] = float64(channel) / 255
	}
	return pdfColor{red: parts[0], green: parts[1], blue: parts[2]}
}

func formatMoney(value float64) string {
	formatted := fmt.Sprintf("%.2f", value)
	parts := strings.Split(formatted, ".")
	integer := parts[0]
	for index := len(integer) - 3; index > 0; index -= 3 {
		integer = integer[:index] + "." + integer[index:]
	}
	return integer + "," + parts[1] + " €"
}

func formatQuantity(value float64) string {
	if value == math.Trunc(value) {
		return fmt.Sprintf("%.0f", value)
	}
	return strings.Replace(fmt.Sprintf("%.2f", value), ".", ",", 1)
}

func formatItalianDate(value string) string {
	if len(value) < 10 {
		return ""
	}
	parsed, err := time.Parse("2006-01-02", value[:10])
	if err != nil {
		return ""
	}
	return parsed.Format("02/01/2006")
}

func truncatePDFText(value string, length int) string {
	value = strings.Join(strings.Fields(value), " ")
	runes := []rune(value)
	if len(runes) <= length {
		return value
	}
	return string(runes[:length-1]) + "…"
}

func prefixed(prefix, value string) string {
	if value == "" {
		return ""
	}
	return prefix + value
}

func nonEmpty(values ...string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if value != "" {
			result = append(result, value)
		}
	}
	return result
}

func defaultString(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
