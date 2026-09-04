package personnel

import (
	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

type Module struct{}

func (Module) ID() string { return "personnel" }

func (Module) Permissions() []platform.PermissionDefinition { return Permissions }

func (Module) AuditedCollections() []string {
	return []string{"staff_members", "attendance_entries", "leave_requests"}
}

func (Module) Register(app *pocketbase.PocketBase) {
	app.OnRecordCreateRequest("attendance_entries", "leave_requests").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth == nil || e.Auth.Collection().Name != "users" {
			return e.ForbiddenError("Autenticazione richiesta.", nil)
		}
		e.Record.Set("created_by", e.Auth.Id)
		return e.Next()
	})

	app.OnRecordUpdateRequest("leave_requests").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth != nil && e.Record.GetString("status") != e.Record.Original().GetString("status") {
			e.Record.Set("decided_by", e.Auth.Id)
		}
		return e.Next()
	})
}
