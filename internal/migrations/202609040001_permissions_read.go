package migrations

import (
	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		permissions, err := app.FindCollectionByNameOrId("permissions")
		if err != nil {
			return err
		}
		permissions.ListRule = platform.PermissionRuleAny("core.roles.read", "core.roles.manage")
		permissions.ViewRule = permissions.ListRule
		return app.Save(permissions)
	}, func(app core.App) error {
		permissions, err := app.FindCollectionByNameOrId("permissions")
		if err != nil {
			return err
		}
		permissions.ListRule = platform.PermissionRule("core.roles.manage")
		permissions.ViewRule = permissions.ListRule
		return app.Save(permissions)
	})
}
