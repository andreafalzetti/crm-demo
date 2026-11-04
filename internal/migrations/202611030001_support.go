package migrations

import (
	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// F2 Labs' support (docs/ruoli.md, «L'assistenza»): a system role with every
// permission, and on the users a field derived from the roles that tells
// who is of the support, so the pages set them aside.
func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		users.Fields.Add(&core.BoolField{Name: "support"})
		if err := app.Save(users); err != nil {
			return err
		}

		if _, err := app.FindFirstRecordByData("roles", "key", platform.SupportRoleKey); err == nil {
			return nil
		}
		roles, err := app.FindCollectionByNameOrId("roles")
		if err != nil {
			return err
		}
		permissions, err := app.FindAllRecords("permissions")
		if err != nil {
			return err
		}
		ids := make([]string, 0, len(permissions))
		for _, permission := range permissions {
			ids = append(ids, permission.Id)
		}
		role := core.NewRecord(roles)
		role.Set("key", platform.SupportRoleKey)
		role.Set("name", "Assistenza F2 Labs")
		role.Set("description", "L'assistenza di F2 Labs: tutto il CRM. Ha sempre tutti i permessi.")
		role.Set("system", true)
		role.Set("permissions", ids)
		return app.Save(role)
	}, func(app core.App) error {
		// Straight in the table: the model hooks keep the role from being
		// deleted.
		if role, err := app.FindFirstRecordByData("roles", "key", platform.SupportRoleKey); err == nil {
			if _, err := app.DB().Delete("roles", dbx.HashExp{"id": role.Id}).Execute(); err != nil {
				return err
			}
		}
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		users.Fields.RemoveByName("support")
		return app.Save(users)
	})
}
