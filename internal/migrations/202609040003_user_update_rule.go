package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		users.UpdateRule = stringPointer(`@request.auth.active = true && ((@request.auth.id = id && @request.body.roles:isset = false && @request.body.active:isset = false && @request.body.verified:isset = false) || @request.auth.roles.permissions.key ?= "core.users.manage")`)
		return app.Save(users)
	}, func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		users.UpdateRule = stringPointer(`(@request.auth.id = id && @request.body.roles:isset = false && @request.body.active:isset = false && @request.body.verified:isset = false) || @request.auth.roles.permissions.key ?= "core.users.manage"`)
		return app.Save(users)
	})
}
