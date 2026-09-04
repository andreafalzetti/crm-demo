package workitems

import (
	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

type Module struct{}

func (Module) ID() string { return "work-items" }

func (Module) Permissions() []platform.PermissionDefinition { return Permissions }

func (Module) AuditedCollections() []string {
	return []string{"work_items", "work_item_assignments"}
}

func (Module) Register(app *pocketbase.PocketBase) {
	app.OnRecordCreateRequest("work_items").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth == nil || e.Auth.Collection().Name != "users" {
			return e.ForbiddenError("Autenticazione richiesta.", nil)
		}
		e.Record.Set("created_by", e.Auth.Id)
		return e.Next()
	})
}
