package platform

import (
	"fmt"
	"net/http"
	"slices"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/hook"
)

func Register(app *pocketbase.PocketBase, modules ...Module) {
	moduleIDs := make([]string, 0, len(modules))
	auditedCollections := []string{"users", "roles"}
	seen := map[string]bool{}
	for _, module := range modules {
		if seen[module.ID()] {
			panic("duplicate CRM module: " + module.ID())
		}
		seen[module.ID()] = true
		moduleIDs = append(moduleIDs, module.ID())
		if audited, ok := module.(AuditedModule); ok {
			for _, collection := range audited.AuditedCollections() {
				if !slices.Contains(auditedCollections, collection) {
					auditedCollections = append(auditedCollections, collection)
				}
			}
		}
		module.Register(app)
	}
	slices.Sort(moduleIDs)

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		e.Router.GET("/api/crm/health", func(e *core.RequestEvent) error {
			return e.JSON(http.StatusOK, map[string]any{"status": "ok", "modules": moduleIDs})
		})
		e.Router.GET("/api/crm/me", func(e *core.RequestEvent) error {
			permissions, err := PermissionKeys(e.App, e.Auth)
			if err != nil {
				return e.InternalServerError("Impossibile caricare i permessi.", err)
			}
			return e.JSON(http.StatusOK, map[string]any{
				"user":        sanitize(e.Auth.PublicExport()),
				"permissions": permissions,
				"modules":     moduleIDs,
			})
		}).Bind(apis.RequireAuth("users"))
		return e.Next()
	})

	registerAudit(app, auditedCollections)
	registerAccessSafety(app)
}

func Require(key string) *hook.Handler[*core.RequestEvent] {
	return &hook.Handler[*core.RequestEvent]{Func: func(e *core.RequestEvent) error {
		if !Can(e.App, e.Auth, key) {
			return e.ForbiddenError("Non hai il permesso necessario.", nil)
		}
		return e.Next()
	}}
}

func registerAudit(app *pocketbase.PocketBase, auditedCollections []string) {
	app.OnRecordCreateRequest(auditedCollections...).BindFunc(func(e *core.RecordRequestEvent) error {
		if err := e.Next(); err != nil {
			return err
		}
		writeAudit(e.App, e.Auth, "create", e.Record.Collection().Name, e.Record.Id, nil, sanitize(e.Record.PublicExport()))
		return nil
	})
	app.OnRecordUpdateRequest(auditedCollections...).BindFunc(func(e *core.RecordRequestEvent) error {
		before := sanitize(e.Record.Original().PublicExport())
		if err := e.Next(); err != nil {
			return err
		}
		writeAudit(e.App, e.Auth, "update", e.Record.Collection().Name, e.Record.Id, before, sanitize(e.Record.PublicExport()))
		return nil
	})
	app.OnRecordDeleteRequest(auditedCollections...).BindFunc(func(e *core.RecordRequestEvent) error {
		before := sanitize(e.Record.PublicExport())
		collection := e.Record.Collection().Name
		id := e.Record.Id
		if err := e.Next(); err != nil {
			return err
		}
		writeAudit(e.App, e.Auth, "delete", collection, id, before, nil)
		return nil
	})
}

func writeAudit(app core.App, actor *core.Record, action, collection, recordID string, before, after map[string]any) {
	auditCollection, err := app.FindCollectionByNameOrId("audit_events")
	if err != nil {
		app.Logger().Error("audit collection unavailable", "error", err)
		return
	}
	record := core.NewRecord(auditCollection)
	if actor != nil && actor.Collection().Name == "users" {
		record.Set("actor", actor.Id)
	}
	record.Set("action", action)
	record.Set("collection", collection)
	record.Set("record_id", recordID)
	record.Set("before", before)
	record.Set("after", after)
	if err := app.Save(record); err != nil {
		app.Logger().Error("unable to persist audit event", "error", err, "collection", collection, "record", recordID)
	}
}

// RecordAudit lets trusted server-side modules record mutations that don't pass
// through PocketBase's public record request hooks.
func RecordAudit(app core.App, actor *core.Record, action, collection, recordID string, before, after map[string]any) {
	writeAudit(app, actor, action, collection, recordID, sanitize(before), sanitize(after))
}

func sanitize(values map[string]any) map[string]any {
	if values == nil {
		return nil
	}
	clean := make(map[string]any, len(values))
	for key, value := range values {
		switch key {
		case "password", "oldPassword", "passwordConfirm", "tokenKey":
			continue
		default:
			clean[key] = value
		}
	}
	return clean
}

func registerAccessSafety(app *pocketbase.PocketBase) {
	app.OnRecordUpdateRequest("users").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth != nil && e.Auth.Id == e.Record.Id {
			if !e.Record.GetBool("active") {
				return e.BadRequestError("Non puoi disattivare il tuo account.", nil)
			}
			if fmt.Sprint(e.Record.Get("roles")) != fmt.Sprint(e.Record.Original().Get("roles")) {
				return e.BadRequestError("Non puoi cambiare i tuoi ruoli.", nil)
			}
		}
		return e.Next()
	})
	app.OnRecordDeleteRequest("users").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth != nil && e.Auth.Id == e.Record.Id {
			return e.BadRequestError("Non puoi eliminare il tuo account.", nil)
		}
		return e.Next()
	})
	app.OnRecordUpdateRequest("roles").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Record.GetString("key") == "administrator" && !roleHasRequiredAdminPermissions(e.App, e.Record) {
			return e.BadRequestError("Il ruolo Administrator deve mantenere i permessi di gestione accessi.", nil)
		}
		return e.Next()
	})
	app.OnRecordDeleteRequest("roles").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Record.GetBool("system") {
			return e.BadRequestError("I ruoli di sistema non possono essere eliminati.", nil)
		}
		return e.Next()
	})
}

func roleHasRequiredAdminPermissions(app core.App, role *core.Record) bool {
	required := map[string]bool{"core.users.manage": false, "core.roles.manage": false}
	for _, id := range role.GetStringSlice("permissions") {
		permission, err := app.FindRecordById("permissions", id)
		if err == nil {
			if _, ok := required[permission.GetString("key")]; ok {
				required[permission.GetString("key")] = true
			}
		}
	}
	return required["core.users.manage"] && required["core.roles.manage"]
}
