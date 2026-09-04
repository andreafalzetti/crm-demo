package migrations

import (
	"github.com/designferri/crm-demo/internal/platform"
	agenda "github.com/designferri/crm-demo/modules/agenda/backend"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		organizations, err := app.FindCollectionByNameOrId("organizations")
		if err != nil {
			return err
		}
		staff, err := app.FindCollectionByNameOrId("staff_members")
		if err != nil {
			return err
		}
		workItems, err := app.FindCollectionByNameOrId("work_items")
		if err != nil {
			return err
		}

		entries := core.NewBaseCollection("agenda_entries")
		entries.Fields.Add(
			&core.TextField{Name: "title", Required: true, Max: 180, Presentable: true},
			&core.SelectField{Name: "type", Values: []string{"appointment", "reminder", "block"}, Required: true},
			&core.DateField{Name: "start_at", Required: true},
			&core.DateField{Name: "end_at"},
			&core.RelationField{Name: "organization", CollectionId: organizations.Id, MaxSelect: 1},
			&core.RelationField{Name: "staff", CollectionId: staff.Id, MaxSelect: 1},
			&core.RelationField{Name: "work_item", CollectionId: workItems.Id, MaxSelect: 1},
			&core.TextField{Name: "notes", Max: 2000},
			&core.RelationField{Name: "created_by", CollectionId: users.Id, MaxSelect: 1},
		)
		platform.AddTimestamps(entries)
		entries.ListRule = platform.PermissionRule("agenda.entries.read")
		entries.ViewRule = entries.ListRule
		entries.CreateRule = platform.PermissionRule("agenda.entries.create")
		entries.UpdateRule = platform.PermissionRule("agenda.entries.update")
		entries.DeleteRule = platform.PermissionRule("agenda.entries.delete")
		entries.Indexes = append(entries.Indexes, "CREATE INDEX idx_agenda_start ON agenda_entries (start_at)")
		if err := app.Save(entries); err != nil {
			return err
		}

		ids, err := platform.EnsurePermissions(app, agenda.Permissions)
		if err != nil {
			return err
		}
		all := make([]string, 0, len(ids))
		operator := make([]string, 0, len(ids))
		for key, id := range ids {
			all = append(all, id)
			if key != "agenda.entries.delete" {
				operator = append(operator, id)
			}
		}
		if err := platform.AddRolePermissions(app, "administrator", all...); err != nil {
			return err
		}
		if err := platform.AddRolePermissions(app, "manager", all...); err != nil {
			return err
		}
		return platform.AddRolePermissions(app, "operator", operator...)
	}, func(app core.App) error {
		if collection, err := app.FindCollectionByNameOrId("agenda_entries"); err == nil {
			if err := app.Delete(collection); err != nil {
				return err
			}
		}
		for _, permission := range agenda.Permissions {
			if record, err := app.FindFirstRecordByData("permissions", "key", permission.Key); err == nil {
				if err := app.Delete(record); err != nil {
					return err
				}
			}
		}
		return nil
	})
}
