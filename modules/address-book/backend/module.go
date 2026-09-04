package addressbook

import (
	"errors"

	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

type Module struct{}

func (Module) ID() string { return "address-book" }

func (Module) Permissions() []platform.PermissionDefinition { return Permissions }

func (Module) AuditedCollections() []string {
	return []string{"organizations", "contacts", "notes", "activities", "documents"}
}

func (Module) Register(app *pocketbase.PocketBase) {
	app.OnRecordCreateRequest("notes", "activities", "documents").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth == nil || e.Auth.Collection().Name != "users" {
			return e.ForbiddenError("Autenticazione richiesta.", nil)
		}
		switch e.Record.Collection().Name {
		case "notes":
			e.Record.Set("author", e.Auth.Id)
		case "activities":
			e.Record.Set("created_by", e.Auth.Id)
		case "documents":
			e.Record.Set("uploaded_by", e.Auth.Id)
		}
		return e.Next()
	})

	app.OnRecordValidate("notes", "activities", "documents").BindFunc(func(e *core.RecordEvent) error {
		if e.Record.GetString("organization") == "" && e.Record.GetString("contact") == "" {
			return errors.New("seleziona almeno un'azienda o un contatto")
		}
		return e.Next()
	})
}
