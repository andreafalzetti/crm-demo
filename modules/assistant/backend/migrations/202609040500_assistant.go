package migrations

import (
	"github.com/designferri/crm-demo/internal/platform"
	assistant "github.com/designferri/crm-demo/modules/assistant/backend"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		actions := core.NewBaseCollection("assistant_actions")
		actions.Fields.Add(
			&core.RelationField{Name: "actor", CollectionId: users.Id, MinSelect: 1, MaxSelect: 1, Required: true},
			&core.TextField{Name: "session_id", Required: true, Max: 100},
			&core.TextField{Name: "action", Required: true, Max: 80, Presentable: true},
			&core.JSONField{Name: "payload", Required: true, MaxSize: 32 * 1024},
			&core.TextField{Name: "summary", Required: true, Max: 500},
			&core.SelectField{Name: "status", Values: []string{"pending", "confirmed", "cancelled", "expired", "failed"}, Required: true},
			&core.DateField{Name: "expires_at", Required: true},
			&core.JSONField{Name: "result", MaxSize: 32 * 1024},
		)
		platform.AddTimestamps(actions)
		actions.Indexes = append(actions.Indexes,
			"CREATE INDEX idx_assistant_actions_actor ON assistant_actions (actor, status, expires_at)",
		)
		if err := app.Save(actions); err != nil {
			return err
		}

		ids, err := platform.EnsurePermissions(app, assistant.Permissions)
		if err != nil {
			return err
		}
		for _, role := range []string{"administrator", "manager", "operator"} {
			if err := platform.AddRolePermissions(app, role, ids["assistant.use"]); err != nil {
				return err
			}
		}
		return nil
	}, func(app core.App) error {
		if collection, err := app.FindCollectionByNameOrId("assistant_actions"); err == nil {
			if err := app.Delete(collection); err != nil {
				return err
			}
		}
		for _, permission := range assistant.Permissions {
			if record, err := app.FindFirstRecordByData("permissions", "key", permission.Key); err == nil {
				if err := app.Delete(record); err != nil {
					return err
				}
			}
		}
		return nil
	})
}
