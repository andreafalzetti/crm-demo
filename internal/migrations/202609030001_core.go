package migrations

import (
	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		permissions := core.NewBaseCollection("permissions")
		permissions.Fields.Add(
			&core.TextField{Name: "key", Required: true, Max: 160, Presentable: true},
			&core.TextField{Name: "module", Required: true, Max: 80},
			&core.TextField{Name: "label", Required: true, Max: 160},
			&core.TextField{Name: "description", Max: 500},
		)
		platform.AddTimestamps(permissions)
		permissions.Indexes = append(permissions.Indexes, "CREATE UNIQUE INDEX idx_permissions_key ON permissions (key)")
		permissions.ListRule = platform.PermissionRule("core.roles.manage")
		permissions.ViewRule = platform.PermissionRule("core.roles.manage")
		if err := app.Save(permissions); err != nil {
			return err
		}

		roles := core.NewBaseCollection("roles")
		roles.Fields.Add(
			&core.TextField{Name: "key", Required: true, Max: 80, Pattern: `^[a-z][a-z0-9_-]+$`},
			&core.TextField{Name: "name", Required: true, Max: 120, Presentable: true},
			&core.TextField{Name: "description", Max: 500},
			&core.BoolField{Name: "system"},
			&core.RelationField{Name: "permissions", CollectionId: permissions.Id, MaxSelect: 250},
		)
		platform.AddTimestamps(roles)
		roles.Indexes = append(roles.Indexes, "CREATE UNIQUE INDEX idx_roles_key ON roles (key)")
		roles.ListRule = platform.PermissionRuleAny("core.roles.read", "core.roles.manage")
		roles.ViewRule = roles.ListRule
		roles.CreateRule = platform.PermissionRule("core.roles.manage")
		roles.UpdateRule = platform.PermissionRule("core.roles.manage")
		roles.DeleteRule = platform.PermissionRule("core.roles.manage")
		if err := app.Save(roles); err != nil {
			return err
		}

		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			users = core.NewAuthCollection("users")
		}
		users.AuthRule = stringPointer("active = true")
		users.Fields.Add(
			&core.TextField{Name: "name", Required: true, Max: 120, Presentable: true},
			&core.FileField{Name: "avatar", MaxSize: 5 * 1024 * 1024, MaxSelect: 1, MimeTypes: []string{"image/jpeg", "image/png", "image/webp"}, Protected: true},
			&core.BoolField{Name: "active"},
			&core.BoolField{Name: "must_change_password"},
			&core.RelationField{Name: "roles", CollectionId: roles.Id, MinSelect: 1, MaxSelect: 10, Required: true},
		)
		users.ListRule = platform.PermissionRule("core.users.read")
		users.ViewRule = users.ListRule
		users.CreateRule = platform.PermissionRule("core.users.manage")
		users.UpdateRule = stringPointer(`@request.auth.active = true && ((@request.auth.id = id && @request.body.roles:isset = false && @request.body.active:isset = false && @request.body.verified:isset = false) || @request.auth.roles.permissions.key ?= "core.users.manage")`)
		users.DeleteRule = platform.PermissionRule("core.users.manage")
		users.ManageRule = platform.PermissionRule("core.users.manage")
		if err := app.Save(users); err != nil {
			return err
		}

		audit := core.NewBaseCollection("audit_events")
		audit.Fields.Add(
			&core.RelationField{Name: "actor", CollectionId: users.Id, MaxSelect: 1},
			&core.TextField{Name: "action", Required: true, Max: 40},
			&core.TextField{Name: "collection", Required: true, Max: 120},
			&core.TextField{Name: "record_id", Required: true, Max: 32},
			&core.JSONField{Name: "before", MaxSize: 512 * 1024},
			&core.JSONField{Name: "after", MaxSize: 512 * 1024},
		)
		platform.AddTimestamps(audit)
		audit.ListRule = platform.PermissionRule("core.audit.read")
		audit.ViewRule = audit.ListRule
		audit.Indexes = append(audit.Indexes, "CREATE INDEX idx_audit_record ON audit_events (collection, record_id)")
		if err := app.Save(audit); err != nil {
			return err
		}

		permissionIDs, err := platform.EnsurePermissions(app, platform.CorePermissions)
		if err != nil {
			return err
		}
		seedRoles := []struct {
			key, name, description string
			permissions            []string
		}{
			{"administrator", "Administrator", "Controllo completo del CRM.", []string{"core.users.read", "core.users.manage", "core.roles.read", "core.roles.manage", "core.audit.read"}},
			{"manager", "Manager", "Gestione operativa e consultazione audit.", []string{"core.users.read", "core.roles.read", "core.audit.read"}},
			{"operator", "Operator", "Operatività quotidiana senza funzioni amministrative.", []string{"core.users.read"}},
		}
		for _, seed := range seedRoles {
			record := core.NewRecord(roles)
			record.Set("key", seed.key)
			record.Set("name", seed.name)
			record.Set("description", seed.description)
			record.Set("system", true)
			ids := make([]string, 0, len(seed.permissions))
			for _, key := range seed.permissions {
				ids = append(ids, permissionIDs[key])
			}
			record.Set("permissions", ids)
			if err := app.Save(record); err != nil {
				return err
			}
		}
		return nil
	}, func(app core.App) error {
		if audit, err := app.FindCollectionByNameOrId("audit_events"); err == nil {
			if err := app.Delete(audit); err != nil {
				return err
			}
		}
		if users, err := app.FindCollectionByNameOrId("users"); err == nil {
			users.Fields.RemoveByName("active")
			users.Fields.RemoveByName("must_change_password")
			users.Fields.RemoveByName("roles")
			users.AuthRule = stringPointer("")
			users.ManageRule = nil
			if err := app.Save(users); err != nil {
				return err
			}
		}
		for _, name := range []string{"roles", "permissions"} {
			collection, err := app.FindCollectionByNameOrId(name)
			if err == nil {
				if err := app.Delete(collection); err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func stringPointer(value string) *string { return &value }
