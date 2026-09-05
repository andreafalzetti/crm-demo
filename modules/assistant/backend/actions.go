package assistant

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase/core"
)

func (config runtimeConfig) handleConfirm(e *core.RequestEvent) error {
	actionID := e.Request.PathValue("id")
	var result map[string]any
	err := e.App.RunInTransaction(func(txApp core.App) error {
		action, err := txApp.FindRecordById("assistant_actions", actionID)
		if err != nil || action.GetString("actor") != e.Auth.Id {
			return errors.New("proposta non trovata")
		}
		if action.GetString("status") != "pending" {
			return fmt.Errorf("proposta già %s", action.GetString("status"))
		}
		if action.GetDateTime("expires_at").Time().Before(time.Now()) {
			action.Set("status", "expired")
			if saveErr := txApp.Save(action); saveErr != nil {
				return saveErr
			}
			return errors.New("proposta scaduta")
		}
		actor, err := txApp.FindRecordById("users", e.Auth.Id)
		if err != nil || !actor.GetBool("active") || !platform.Can(txApp, actor, "assistant.use") {
			return errors.New("utente non autorizzato")
		}
		payload := map[string]any{}
		if err := action.UnmarshalJSONField("payload", &payload); err != nil {
			return err
		}
		if _, err := validateAction(txApp, actor, action.GetString("action"), payload); err != nil {
			return err
		}
		result, err = applyAction(txApp, actor, action.GetString("action"), payload)
		if err != nil {
			return err
		}
		action.Set("status", "confirmed")
		action.Set("result", result)
		return txApp.Save(action)
	})
	if err != nil {
		return e.BadRequestError(err.Error(), err)
	}
	return e.JSON(http.StatusOK, map[string]any{"status": "confirmed", "result": result})
}

func (config runtimeConfig) handleCancel(e *core.RequestEvent) error {
	action, err := e.App.FindRecordById("assistant_actions", e.Request.PathValue("id"))
	if err != nil || action.GetString("actor") != e.Auth.Id {
		return e.NotFoundError("Proposta non trovata.", err)
	}
	if action.GetString("status") != "pending" {
		return e.BadRequestError("La proposta non è più in attesa.", nil)
	}
	action.Set("status", "cancelled")
	if err := e.App.Save(action); err != nil {
		return e.InternalServerError("Impossibile annullare la proposta.", err)
	}
	return e.JSON(http.StatusOK, map[string]any{"status": "cancelled"})
}

func applyAction(app core.App, actor *core.Record, action string, payload map[string]any) (map[string]any, error) {
	switch action {
	case "create_record", "update_record":
		return applyRecordAction(app, actor, action, payload)
	case "create_note":
		return createRecord(app, actor, "notes", map[string]any{
			"organization": argString(payload, "customerId"),
			"contact":      argString(payload, "contactId"),
			"body":         argString(payload, "body"),
			"author":       actor.Id,
		}, "/organizations/"+argString(payload, "customerId"))
	case "create_work_item":
		code := argString(payload, "code")
		if code == "" {
			code = fmt.Sprintf("INT-AI-%d", time.Now().Unix())
		}
		kind := argString(payload, "kind")
		if kind == "" {
			kind = "intervention"
		}
		status := argString(payload, "status")
		if status == "" {
			status = "planned"
		}
		priority := argString(payload, "priority")
		if priority == "" {
			priority = "normal"
		}
		return createRecord(app, actor, "work_items", map[string]any{
			"code": code, "title": argString(payload, "title"), "kind": kind, "status": status,
			"priority": priority, "organization": argString(payload, "customerId"),
			"start_at": argString(payload, "startAt"), "end_at": argString(payload, "endAt"),
			"location": argString(payload, "location"), "description": argString(payload, "description"), "created_by": actor.Id,
		}, "/work-items")
	case "create_agenda_entry":
		entryType := argString(payload, "type")
		if entryType == "" {
			entryType = "appointment"
		}
		return createRecord(app, actor, "agenda_entries", map[string]any{
			"title": argString(payload, "title"), "type": entryType,
			"start_at": argString(payload, "startAt"), "end_at": argString(payload, "endAt"),
			"organization": argString(payload, "customerId"), "staff": argString(payload, "staffId"),
			"work_item": argString(payload, "workItemId"), "notes": argString(payload, "notes"), "created_by": actor.Id,
		}, "/agenda")
	case "update_work_item_status":
		return updateStatus(app, actor, "work_items", argString(payload, "id"), argString(payload, "status"), "/work-items")
	case "update_quote_status":
		return updateStatus(app, actor, "quotes", argString(payload, "id"), argString(payload, "status"), "/quotes")
	case "update_leave_status":
		record, err := app.FindRecordById("leave_requests", argString(payload, "id"))
		if err != nil {
			return nil, err
		}
		before := record.PublicExport()
		record.Set("status", argString(payload, "status"))
		record.Set("decided_by", actor.Id)
		if err := app.Save(record); err != nil {
			return nil, err
		}
		platform.RecordAudit(app, actor, "update", "leave_requests", record.Id, before, record.PublicExport())
		return map[string]any{"id": record.Id, "status": record.GetString("status"), "link": "/personnel/attendance"}, nil
	default:
		return nil, errors.New("azione non consentita")
	}
}

func createRecord(app core.App, actor *core.Record, collectionName string, values map[string]any, link string) (map[string]any, error) {
	collection, err := app.FindCollectionByNameOrId(collectionName)
	if err != nil {
		return nil, err
	}
	record := core.NewRecord(collection)
	for key, value := range values {
		if text, ok := value.(string); ok && text == "" {
			continue
		}
		record.Set(key, value)
	}
	if err := app.Save(record); err != nil {
		return nil, err
	}
	platform.RecordAudit(app, actor, "create", collectionName, record.Id, nil, record.PublicExport())
	return map[string]any{"id": record.Id, "collection": collectionName, "link": link}, nil
}

func updateStatus(app core.App, actor *core.Record, collectionName, id, status, link string) (map[string]any, error) {
	record, err := app.FindRecordById(collectionName, id)
	if err != nil {
		return nil, err
	}
	before := record.PublicExport()
	record.Set("status", status)
	if err := app.Save(record); err != nil {
		return nil, err
	}
	platform.RecordAudit(app, actor, "update", collectionName, record.Id, before, record.PublicExport())
	return map[string]any{"id": record.Id, "status": record.GetString("status"), "link": link}, nil
}
