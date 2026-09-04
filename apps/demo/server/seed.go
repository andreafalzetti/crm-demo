package main

import (
	"fmt"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/spf13/cobra"
)

func registerDemoSeedCommand(app *pocketbase.PocketBase) {
	command := &cobra.Command{
		Use:          "demo-seed EMAIL",
		Short:        "Carica uno scenario dimostrativo idempotente",
		Args:         cobra.ExactArgs(1),
		SilenceUsage: true,
		RunE: func(command *cobra.Command, args []string) error {
			user, err := app.FindAuthRecordByEmail("users", args[0])
			if err != nil {
				return fmt.Errorf("utente demo non trovato: %w", err)
			}
			if err := seedDemo(app, user); err != nil {
				return err
			}
			fmt.Println("Scenario demo caricato.")
			return nil
		},
	}
	app.RootCmd.AddCommand(command)
}

func seedDemo(app core.App, user *core.Record) error {
	aurora, err := ensureRecord(app, "organizations", "name", "Officine Aurora", map[string]any{
		"name":       "Officine Aurora",
		"legal_name": "Officine Aurora S.r.l.",
		"vat_number": "IT01234567890",
		"email":      "amministrazione@officineaurora.test",
		"phone":      "+39 02 555 0190",
		"website":    "https://example.test",
		"address":    "Via del Lavoro 18, Milano",
		"status":     "active",
	})
	if err != nil {
		return err
	}
	studio, err := ensureRecord(app, "organizations", "name", "Studio Lumen", map[string]any{
		"name":       "Studio Lumen",
		"legal_name": "Studio Lumen Associati",
		"email":      "segreteria@studiolumen.test",
		"phone":      "+39 06 555 0142",
		"address":    "Viale Europa 42, Roma",
		"status":     "prospect",
	})
	if err != nil {
		return err
	}

	if _, err := ensureRecord(app, "contacts", "email", "elena@officineaurora.test", map[string]any{
		"organization": aurora.Id,
		"first_name":   "Elena",
		"last_name":    "Riva",
		"position":     "Responsabile operations",
		"email":        "elena@officineaurora.test",
		"mobile":       "+39 333 555 0101",
		"status":       "active",
	}); err != nil {
		return err
	}
	if _, err := ensureRecord(app, "contacts", "email", "marco@studiolumen.test", map[string]any{
		"organization": studio.Id,
		"first_name":   "Marco",
		"last_name":    "Seri",
		"position":     "Office manager",
		"email":        "marco@studiolumen.test",
		"status":       "active",
	}); err != nil {
		return err
	}

	luca, err := ensureRecord(app, "staff_members", "employee_code", "DF-001", map[string]any{
		"employee_code": "DF-001",
		"first_name":    "Luca",
		"last_name":     "Bianchi",
		"email":         "luca@ferri.test",
		"phone":         "+39 333 555 0102",
		"job_title":     "Tecnico senior",
		"status":        "active",
	})
	if err != nil {
		return err
	}
	giulia, err := ensureRecord(app, "staff_members", "employee_code", "DF-002", map[string]any{
		"employee_code": "DF-002",
		"first_name":    "Giulia",
		"last_name":     "Conti",
		"email":         "giulia@ferri.test",
		"job_title":     "Project coordinator",
		"status":        "active",
	})
	if err != nil {
		return err
	}
	paolo, err := ensureRecord(app, "staff_members", "employee_code", "DF-003", map[string]any{
		"employee_code": "DF-003",
		"first_name":    "Paolo",
		"last_name":     "Greco",
		"email":         "paolo@ferri.test",
		"job_title":     "Tecnico",
		"status":        "active",
	})
	if err != nil {
		return err
	}

	now := time.Now()
	today := dateAt(now, 9, 0)
	if _, err := ensureRecordByFilter(app, "attendance_entries", "staff = {:staff} && day >= {:start} && day <= {:end}", dbx.Params{
		"staff": luca.Id,
		"start": dateAt(now, 0, 0),
		"end":   dateAt(now, 23, 59),
	}, map[string]any{
		"staff": luca.Id, "day": today, "kind": "present", "clock_in": "08:42", "created_by": user.Id,
	}); err != nil {
		return err
	}
	if _, err := ensureRecordByFilter(app, "attendance_entries", "staff = {:staff} && day >= {:start} && day <= {:end}", dbx.Params{
		"staff": paolo.Id,
		"start": dateAt(now, 0, 0),
		"end":   dateAt(now, 23, 59),
	}, map[string]any{
		"staff": paolo.Id, "day": today, "kind": "remote", "clock_in": "09:05", "created_by": user.Id,
	}); err != nil {
		return err
	}
	if _, err := ensureRecord(app, "leave_requests", "note", "Scenario demo · ferie programmate", map[string]any{
		"staff":      giulia.Id,
		"type":       "vacation",
		"start_date": dateAt(now.AddDate(0, 0, 2), 12, 0),
		"end_date":   dateAt(now.AddDate(0, 0, 3), 12, 0),
		"status":     "approved",
		"note":       "Scenario demo · ferie programmate",
		"created_by": user.Id,
		"decided_by": user.Id,
	}); err != nil {
		return err
	}
	if _, err := ensureRecord(app, "leave_requests", "note", "Scenario demo · richiesta da approvare", map[string]any{
		"staff":      paolo.Id,
		"type":       "permit",
		"start_date": dateAt(now.AddDate(0, 0, 7), 12, 0),
		"end_date":   dateAt(now.AddDate(0, 0, 7), 12, 0),
		"status":     "pending",
		"note":       "Scenario demo · richiesta da approvare",
		"created_by": user.Id,
	}); err != nil {
		return err
	}

	intervention, err := ensureRecord(app, "work_items", "code", "INT-DEMO-001", map[string]any{
		"code":         "INT-DEMO-001",
		"title":        "Verifica impianto e messa in servizio",
		"kind":         "intervention",
		"status":       "planned",
		"priority":     "high",
		"organization": aurora.Id,
		"start_at":     dateAt(now.AddDate(0, 0, 1), 10, 0),
		"end_at":       dateAt(now.AddDate(0, 0, 1), 12, 30),
		"location":     "Sede cliente · reparto produzione",
		"description":  "Collaudo finale e consegna della documentazione tecnica.",
		"created_by":   user.Id,
	})
	if err != nil {
		return err
	}
	if _, err := ensureRecordByFilter(app, "work_item_assignments", "work_item = {:work} && staff = {:staff}", dbx.Params{"work": intervention.Id, "staff": luca.Id}, map[string]any{
		"work_item": intervention.Id, "staff": luca.Id, "role": "Responsabile",
	}); err != nil {
		return err
	}
	if _, err := ensureRecord(app, "work_items", "code", "INT-DEMO-002", map[string]any{
		"code":         "INT-DEMO-002",
		"title":        "Sopralluogo preliminare",
		"kind":         "assignment",
		"status":       "in_progress",
		"priority":     "normal",
		"organization": studio.Id,
		"start_at":     dateAt(now.AddDate(0, 0, 4), 14, 30),
		"end_at":       dateAt(now.AddDate(0, 0, 4), 16, 0),
		"location":     "Studio Lumen",
		"description":  "Raccolta esigenze e misure.",
		"created_by":   user.Id,
	}); err != nil {
		return err
	}

	if _, err := ensureRecord(app, "agenda_entries", "title", "Allineamento operativo", map[string]any{
		"title":        "Allineamento operativo",
		"type":         "appointment",
		"start_at":     dateAt(now, 15, 0),
		"end_at":       dateAt(now, 15, 45),
		"staff":        giulia.Id,
		"organization": aurora.Id,
		"notes":        "Revisione attività aperte.",
		"created_by":   user.Id,
	}); err != nil {
		return err
	}

	quote, err := ensureRecord(app, "quotes", "number", "PRE-DEMO-001", map[string]any{
		"number":       "PRE-DEMO-001",
		"title":        "Adeguamento area tecnica",
		"status":       "sent",
		"organization": aurora.Id,
		"work_item":    intervention.Id,
		"valid_until":  dateAt(now.AddDate(0, 0, 30), 12, 0),
		"subtotal":     2750,
		"tax_total":    605,
		"total":        3355,
		"notes":        "Validità 30 giorni. Pagamento 30% all’ordine.",
		"created_by":   user.Id,
	})
	if err != nil {
		return err
	}
	quoteLines := []map[string]any{
		{"description": "Analisi e progettazione", "quantity": 1, "unit_price": 850, "tax_rate": 22, "position": 1},
		{"description": "Installazione e collaudo", "quantity": 2, "unit_price": 950, "tax_rate": 22, "position": 2},
	}
	for _, values := range quoteLines {
		if _, err := ensureRecordByFilter(app, "quote_lines", "quote = {:quote} && position = {:position}", dbx.Params{"quote": quote.Id, "position": values["position"]}, merge(values, map[string]any{"quote": quote.Id})); err != nil {
			return err
		}
	}

	_, err = ensureRecord(app, "notes", "body", "Scenario demo: il cliente attende il collaudo finale.", map[string]any{
		"organization": aurora.Id,
		"body":         "Scenario demo: il cliente attende il collaudo finale.",
		"author":       user.Id,
	})
	return err
}

func ensureRecord(app core.App, collectionName, field, value string, values map[string]any) (*core.Record, error) {
	return ensureRecordByFilter(app, collectionName, field+" = {:value}", dbx.Params{"value": value}, values)
}

func ensureRecordByFilter(app core.App, collectionName, filter string, params dbx.Params, values map[string]any) (*core.Record, error) {
	if record, err := app.FindFirstRecordByFilter(collectionName, filter, params); err == nil {
		return record, nil
	}
	collection, err := app.FindCollectionByNameOrId(collectionName)
	if err != nil {
		return nil, err
	}
	record := core.NewRecord(collection)
	for key, value := range values {
		record.Set(key, value)
	}
	if err := app.Save(record); err != nil {
		return nil, err
	}
	return record, nil
}

func dateAt(value time.Time, hour, minute int) string {
	return time.Date(value.Year(), value.Month(), value.Day(), hour, minute, 0, 0, value.Location()).UTC().Format("2006-01-02 15:04:05.000Z")
}

func merge(left, right map[string]any) map[string]any {
	result := make(map[string]any, len(left)+len(right))
	for key, value := range left {
		result[key] = value
	}
	for key, value := range right {
		result[key] = value
	}
	return result
}
