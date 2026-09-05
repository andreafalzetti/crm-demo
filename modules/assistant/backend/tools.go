package assistant

import (
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type toolRequest struct {
	Operation string         `json:"operation"`
	Args      map[string]any `json:"args"`
}

func (config runtimeConfig) handleTool(e *core.RequestEvent) error {
	claims, actor, err := config.delegatedActor(e)
	if err != nil {
		return e.UnauthorizedError("Delega assistente non valida.", err)
	}
	var input toolRequest
	if err := e.BindBody(&input); err != nil {
		return e.BadRequestError("Parametri strumento non validi.", err)
	}
	if input.Args == nil {
		input.Args = map[string]any{}
	}

	var result any
	switch input.Operation {
	case "search_customers":
		result, err = searchCustomers(e.App, actor, input.Args)
	case "customer_context":
		result, err = customerContext(e.App, actor, input.Args)
	case "team_availability":
		result, err = teamAvailability(e.App, actor, input.Args)
	case "agenda":
		result, err = agendaEntries(e.App, actor, input.Args)
	case "work_items":
		result, err = workItems(e.App, actor, input.Args)
	case "quotes":
		result, err = quotes(e.App, actor, input.Args)
	case "records":
		result, err = findAssistantRecords(e.App, actor, input.Args)
	case "prepare_action":
		result, err = prepareAction(e.App, actor, claims.SessionID, input.Args)
	default:
		return e.BadRequestError("Operazione strumento non consentita.", nil)
	}
	if err != nil {
		return e.BadRequestError(err.Error(), err)
	}
	return e.JSON(http.StatusOK, result)
}

func (config runtimeConfig) delegatedActor(e *core.RequestEvent) (delegationClaims, *core.Record, error) {
	if len(config.sharedSecret) < 32 {
		return delegationClaims{}, nil, errors.New("assistant not configured")
	}
	claims, err := verifyDelegation(config.sharedSecret, e.Request.Header.Get("X-CRM-Delegation"), time.Now())
	if err != nil {
		return claims, nil, err
	}
	actor, err := e.App.FindRecordById("users", claims.UserID)
	if err != nil || !actor.GetBool("active") || !platform.Can(e.App, actor, "assistant.use") {
		return claims, nil, errors.New("delegated user unavailable")
	}
	return claims, actor, nil
}

func requirePermission(app core.App, actor *core.Record, permission string) error {
	if !platform.Can(app, actor, permission) {
		return fmt.Errorf("permesso mancante: %s", permission)
	}
	return nil
}

func searchCustomers(app core.App, actor *core.Record, args map[string]any) (map[string]any, error) {
	if err := requirePermission(app, actor, "addressbook.organizations.read"); err != nil {
		return nil, err
	}
	query := strings.TrimSpace(argString(args, "query"))
	if len(query) > 120 {
		return nil, errors.New("ricerca troppo lunga")
	}
	filter := ""
	params := dbx.Params{}
	if query != "" {
		filter = "name ~ {:query} || legal_name ~ {:query} || email ~ {:query} || phone ~ {:query}"
		params["query"] = query
	}
	records, err := app.FindRecordsByFilter("organizations", filter, "name", 20, 0, params)
	if err != nil {
		return nil, err
	}
	items := make([]map[string]any, 0, len(records))
	for _, record := range records {
		items = append(items, map[string]any{
			"id": record.Id, "name": record.GetString("name"), "status": record.GetString("status"),
			"email": record.GetString("email"), "phone": record.GetString("phone"),
			"link": "/organizations/" + record.Id,
		})
	}
	return map[string]any{"customers": items, "count": len(items)}, nil
}

func customerContext(app core.App, actor *core.Record, args map[string]any) (map[string]any, error) {
	if err := requirePermission(app, actor, "addressbook.organizations.read"); err != nil {
		return nil, err
	}
	id := argString(args, "customerId")
	organization, err := app.FindRecordById("organizations", id)
	if err != nil {
		return nil, errors.New("cliente non trovato")
	}
	result := map[string]any{
		"customer": map[string]any{
			"id": organization.Id, "name": organization.GetString("name"), "status": organization.GetString("status"),
			"email": organization.GetString("email"), "phone": organization.GetString("phone"),
			"address": organization.GetString("address"), "link": "/organizations/" + organization.Id,
		},
	}
	params := dbx.Params{"organization": organization.Id}
	if platform.Can(app, actor, "addressbook.contacts.read") {
		records, findErr := app.FindRecordsByFilter("contacts", "organization = {:organization}", "last_name,first_name", 50, 0, params)
		if findErr != nil {
			return nil, findErr
		}
		items := make([]map[string]any, 0, len(records))
		for _, record := range records {
			items = append(items, map[string]any{"id": record.Id, "name": strings.TrimSpace(record.GetString("first_name") + " " + record.GetString("last_name")), "email": record.GetString("email"), "phone": record.GetString("phone")})
		}
		result["contacts"] = items
	}
	if platform.Can(app, actor, "addressbook.notes.read") {
		records, findErr := app.FindRecordsByFilter("notes", "organization = {:organization}", "-created", 20, 0, params)
		if findErr != nil {
			return nil, findErr
		}
		items := make([]map[string]any, 0, len(records))
		for _, record := range records {
			items = append(items, map[string]any{"id": record.Id, "body": record.GetString("body"), "created": record.GetString("created")})
		}
		result["notes"] = items
	}
	if platform.Can(app, actor, "workitems.items.read") {
		records, findErr := app.FindRecordsByFilter("work_items", "organization = {:organization}", "-start_at", 30, 0, params)
		if findErr != nil {
			return nil, findErr
		}
		result["workItems"] = workItemViews(records)
	}
	if platform.Can(app, actor, "quotes.quotes.read") {
		records, findErr := app.FindRecordsByFilter("quotes", "organization = {:organization}", "-created", 30, 0, params)
		if findErr != nil {
			return nil, findErr
		}
		result["quotes"] = quoteViews(records)
	}
	return result, nil
}

func teamAvailability(app core.App, actor *core.Record, args map[string]any) (map[string]any, error) {
	if err := requirePermission(app, actor, "personnel.staff.read"); err != nil {
		return nil, err
	}
	from, to := dateRange(args, 14)
	staff, err := app.FindRecordsByFilter("staff_members", "status = 'active'", "last_name,first_name", 100, 0)
	if err != nil {
		return nil, err
	}
	leaves := []*core.Record{}
	if platform.Can(app, actor, "personnel.leave.read") {
		leaves, err = app.FindRecordsByFilter("leave_requests", "status = 'approved' && start_date <= {:to} && end_date >= {:from}", "start_date", 200, 0, dbx.Params{"from": from, "to": to})
		if err != nil {
			return nil, err
		}
	}
	items := make([]map[string]any, 0, len(staff))
	for _, person := range staff {
		absences := make([]map[string]any, 0)
		for _, leave := range leaves {
			if leave.GetString("staff") == person.Id {
				absences = append(absences, map[string]any{"type": leave.GetString("type"), "from": leave.GetString("start_date"), "to": leave.GetString("end_date")})
			}
		}
		items = append(items, map[string]any{
			"id": person.Id, "name": strings.TrimSpace(person.GetString("first_name") + " " + person.GetString("last_name")),
			"jobTitle": person.GetString("job_title"), "available": len(absences) == 0, "absences": absences,
		})
	}
	return map[string]any{"from": from, "to": to, "staff": items}, nil
}

func agendaEntries(app core.App, actor *core.Record, args map[string]any) (map[string]any, error) {
	if err := requirePermission(app, actor, "agenda.entries.read"); err != nil {
		return nil, err
	}
	from, to := dateRange(args, 14)
	filter := "start_at >= {:from} && start_at <= {:to}"
	params := dbx.Params{"from": from, "to": to}
	if staffID := argString(args, "staffId"); staffID != "" {
		filter += " && staff = {:staff}"
		params["staff"] = staffID
	}
	records, err := app.FindRecordsByFilter("agenda_entries", filter, "start_at", 100, 0, params)
	if err != nil {
		return nil, err
	}
	items := make([]map[string]any, 0, len(records))
	for _, record := range records {
		items = append(items, map[string]any{
			"id": record.Id, "title": record.GetString("title"), "type": record.GetString("type"),
			"startAt": record.GetString("start_at"), "endAt": record.GetString("end_at"),
			"customerId": record.GetString("organization"), "staffId": record.GetString("staff"), "link": "/agenda",
		})
	}
	return map[string]any{"from": from, "to": to, "entries": items}, nil
}

func workItems(app core.App, actor *core.Record, args map[string]any) (map[string]any, error) {
	if err := requirePermission(app, actor, "workitems.items.read"); err != nil {
		return nil, err
	}
	filter := ""
	params := dbx.Params{}
	if status := argString(args, "status"); status != "" {
		filter = "status = {:status}"
		params["status"] = status
	}
	if organization := argString(args, "customerId"); organization != "" {
		if filter != "" {
			filter += " && "
		}
		filter += "organization = {:organization}"
		params["organization"] = organization
	}
	records, err := app.FindRecordsByFilter("work_items", filter, "-start_at", 100, 0, params)
	if err != nil {
		return nil, err
	}
	return map[string]any{"workItems": workItemViews(records), "count": len(records)}, nil
}

func quotes(app core.App, actor *core.Record, args map[string]any) (map[string]any, error) {
	if err := requirePermission(app, actor, "quotes.quotes.read"); err != nil {
		return nil, err
	}
	filter := ""
	params := dbx.Params{}
	if status := argString(args, "status"); status != "" {
		filter = "status = {:status}"
		params["status"] = status
	}
	if organization := argString(args, "customerId"); organization != "" {
		if filter != "" {
			filter += " && "
		}
		filter += "organization = {:organization}"
		params["organization"] = organization
	}
	records, err := app.FindRecordsByFilter("quotes", filter, "-created", 100, 0, params)
	if err != nil {
		return nil, err
	}
	return map[string]any{"quotes": quoteViews(records), "count": len(records)}, nil
}

func workItemViews(records []*core.Record) []map[string]any {
	items := make([]map[string]any, 0, len(records))
	for _, record := range records {
		items = append(items, map[string]any{
			"id": record.Id, "code": record.GetString("code"), "title": record.GetString("title"),
			"kind": record.GetString("kind"), "status": record.GetString("status"), "priority": record.GetString("priority"),
			"customerId": record.GetString("organization"), "startAt": record.GetString("start_at"), "endAt": record.GetString("end_at"), "link": "/work-items",
		})
	}
	return items
}

func quoteViews(records []*core.Record) []map[string]any {
	items := make([]map[string]any, 0, len(records))
	for _, record := range records {
		items = append(items, map[string]any{
			"id": record.Id, "number": record.GetString("number"), "title": record.GetString("title"),
			"status": record.GetString("status"), "total": record.GetFloat("total"), "validUntil": record.GetString("valid_until"),
			"customerId": record.GetString("organization"), "link": "/quotes",
		})
	}
	return items
}

func dateRange(args map[string]any, defaultDays int) (string, string) {
	now := time.Now().UTC()
	from := argString(args, "from")
	to := argString(args, "to")
	if from == "" {
		from = now.Format(time.RFC3339)
	}
	if to == "" {
		to = now.AddDate(0, 0, defaultDays).Format(time.RFC3339)
	}
	return from, to
}

func argString(args map[string]any, key string) string {
	value, _ := args[key].(string)
	return strings.TrimSpace(value)
}

func prepareAction(app core.App, actor *core.Record, sessionID string, args map[string]any) (map[string]any, error) {
	action := argString(args, "action")
	payload, _ := args["payload"].(map[string]any)
	if payload == nil {
		return nil, errors.New("payload azione mancante")
	}
	summary, err := validateAction(app, actor, action, payload)
	if err != nil {
		return nil, err
	}
	collection, err := app.FindCollectionByNameOrId("assistant_actions")
	if err != nil {
		return nil, err
	}
	record := core.NewRecord(collection)
	record.Set("actor", actor.Id)
	record.Set("session_id", sessionID)
	record.Set("action", action)
	record.Set("payload", payload)
	record.Set("summary", summary)
	record.Set("status", "pending")
	record.Set("expires_at", time.Now().Add(15*time.Minute))
	if err := app.Save(record); err != nil {
		return nil, err
	}
	return map[string]any{
		"confirmationId": record.Id,
		"action":         action,
		"summary":        summary,
		"status":         "pending",
		"instruction":    "Chiedi conferma esplicita all'utente. Non dichiarare che la modifica è già stata eseguita.",
	}, nil
}

func validateAction(app core.App, actor *core.Record, action string, payload map[string]any) (string, error) {
	switch action {
	case "create_record", "update_record":
		return validateRecordAction(app, actor, action, payload)
	case "create_note":
		if err := requirePermission(app, actor, "addressbook.notes.create"); err != nil {
			return "", err
		}
		if argString(payload, "body") == "" || (argString(payload, "customerId") == "" && argString(payload, "contactId") == "") {
			return "", errors.New("la nota richiede testo e cliente o contatto")
		}
		return "Aggiungere una nota: " + truncate(argString(payload, "body"), 180), nil
	case "create_work_item":
		if err := requirePermission(app, actor, "workitems.items.create"); err != nil {
			return "", err
		}
		if argString(payload, "title") == "" || argString(payload, "customerId") == "" {
			return "", errors.New("l'intervento richiede titolo e cliente")
		}
		return "Creare l'intervento “" + truncate(argString(payload, "title"), 160) + "”", nil
	case "create_agenda_entry":
		if err := requirePermission(app, actor, "agenda.entries.create"); err != nil {
			return "", err
		}
		if argString(payload, "title") == "" || argString(payload, "startAt") == "" {
			return "", errors.New("l'impegno richiede titolo e data/ora di inizio")
		}
		return "Aggiungere in agenda “" + truncate(argString(payload, "title"), 160) + "”", nil
	case "update_work_item_status":
		if err := requirePermission(app, actor, "workitems.items.update"); err != nil {
			return "", err
		}
		if !slices.Contains([]string{"planned", "in_progress", "done", "cancelled"}, argString(payload, "status")) {
			return "", errors.New("stato intervento non valido")
		}
		record, err := app.FindRecordById("work_items", argString(payload, "id"))
		if err != nil {
			return "", errors.New("intervento non trovato")
		}
		return fmt.Sprintf("Cambiare lo stato di %s in %s", record.GetString("code"), argString(payload, "status")), nil
	case "update_quote_status":
		if err := requirePermission(app, actor, "quotes.quotes.update"); err != nil {
			return "", err
		}
		if !slices.Contains([]string{"draft", "sent", "accepted", "rejected"}, argString(payload, "status")) {
			return "", errors.New("stato preventivo non valido")
		}
		record, err := app.FindRecordById("quotes", argString(payload, "id"))
		if err != nil {
			return "", errors.New("preventivo non trovato")
		}
		return fmt.Sprintf("Cambiare lo stato del preventivo %s in %s", record.GetString("number"), argString(payload, "status")), nil
	case "update_leave_status":
		if err := requirePermission(app, actor, "personnel.leave.update"); err != nil {
			return "", err
		}
		if !slices.Contains([]string{"approved", "rejected"}, argString(payload, "status")) {
			return "", errors.New("stato richiesta ferie non valido")
		}
		if _, err := app.FindRecordById("leave_requests", argString(payload, "id")); err != nil {
			return "", errors.New("richiesta ferie non trovata")
		}
		return "Aggiornare la richiesta ferie in " + argString(payload, "status"), nil
	default:
		return "", errors.New("azione non consentita")
	}
}

func truncate(value string, length int) string {
	runes := []rune(value)
	if len(runes) <= length {
		return value
	}
	return string(runes[:length]) + "…"
}
