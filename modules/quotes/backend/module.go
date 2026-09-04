package quotes

import (
	"mime"
	"net/http"
	"time"

	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/filesystem"
)

type Module struct {
	IssuerName string
	AccentHex  string
}

func (Module) ID() string { return "quotes" }

func (Module) Permissions() []platform.PermissionDefinition { return Permissions }

func (Module) AuditedCollections() []string { return []string{"quotes", "quote_lines"} }

func (module Module) Register(app *pocketbase.PocketBase) {
	app.OnRecordCreateRequest("quotes").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth == nil || e.Auth.Collection().Name != "users" {
			return e.ForbiddenError("Autenticazione richiesta.", nil)
		}
		e.Record.Set("created_by", e.Auth.Id)
		return e.Next()
	})

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		e.Router.POST("/api/crm/quotes/{id}/pdf", func(e *core.RequestEvent) error {
			quote, err := e.App.FindRecordById("quotes", e.Request.PathValue("id"))
			if err != nil {
				return e.NotFoundError("Preventivo non trovato.", err)
			}
			organization, err := e.App.FindRecordById("organizations", quote.GetString("organization"))
			if err != nil {
				return e.BadRequestError("Cliente non disponibile.", err)
			}
			rows, err := e.App.FindRecordsByFilter(
				"quote_lines",
				"quote = {:quote}",
				"position",
				100,
				0,
				dbx.Params{"quote": quote.Id},
			)
			if err != nil {
				return e.InternalServerError("Impossibile leggere le righe.", err)
			}
			subtotal := 0.0
			taxTotal := 0.0
			pdfLines := make([]quotePDFLine, 0, len(rows))
			for _, row := range rows {
				quantity := row.GetFloat("quantity")
				unitPrice := row.GetFloat("unit_price")
				taxRate := row.GetFloat("tax_rate")
				rowTotal := quantity * unitPrice
				subtotal += rowTotal
				taxTotal += rowTotal * taxRate / 100
				pdfLines = append(pdfLines, quotePDFLine{
					Description: row.GetString("description"),
					Quantity:    quantity,
					UnitPrice:   unitPrice,
					TaxRate:     taxRate,
					Total:       rowTotal,
				})
			}
			total := subtotal + taxTotal
			generatedAt := time.Now().UTC()
			pdf := renderQuotePDF(quotePDF{
				Issuer:      module.IssuerName,
				Accent:      module.AccentHex,
				Number:      quote.GetString("number"),
				Title:       quote.GetString("title"),
				Client:      organization.GetString("name"),
				Address:     organization.GetString("address"),
				VATNumber:   organization.GetString("vat_number"),
				ValidUntil:  quote.GetString("valid_until"),
				Notes:       quote.GetString("notes"),
				GeneratedAt: generatedAt,
				Lines:       pdfLines,
				Subtotal:    subtotal,
				TaxTotal:    taxTotal,
				Total:       total,
			})
			fileName := "preventivo-" + quote.GetString("number") + ".pdf"
			file, err := filesystem.NewFileFromBytes(pdf, fileName)
			if err != nil {
				return e.InternalServerError("Impossibile preparare il PDF.", err)
			}
			quote.Set("subtotal", subtotal)
			quote.Set("tax_total", taxTotal)
			quote.Set("total", total)
			quote.Set("pdf", file)
			quote.Set("generated_at", generatedAt)
			if err := e.App.Save(quote); err != nil {
				return e.InternalServerError("Impossibile archiviare il PDF.", err)
			}
			e.Response.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": fileName}))
			return e.Blob(http.StatusOK, "application/pdf", pdf)
		}).Bind(apis.RequireAuth("users"), platform.Require("quotes.generate"))
		return e.Next()
	})
}
