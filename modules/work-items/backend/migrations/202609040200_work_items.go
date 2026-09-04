package migrations

import (
	"github.com/designferri/crm-demo/internal/platform"
	workitems "github.com/designferri/crm-demo/modules/work-items/backend"
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

		items := core.NewBaseCollection("work_items")
		items.Fields.Add(
			&core.TextField{Name: "code", Required: true, Max: 40},
			&core.TextField{Name: "title", Required: true, Max: 180, Presentable: true},
			&core.SelectField{Name: "kind", Values: []string{"intervention", "assignment", "event", "session"}, Required: true},
			&core.SelectField{Name: "status", Values: []string{"planned", "in_progress", "done", "cancelled"}, Required: true},
			&core.SelectField{Name: "priority", Values: []string{"low", "normal", "high"}, Required: true},
			&core.RelationField{Name: "organization", CollectionId: organizations.Id, MinSelect: 1, MaxSelect: 1, Required: true},
			&core.DateField{Name: "start_at"},
			&core.DateField{Name: "end_at"},
			&core.TextField{Name: "location", Max: 300},
			&core.TextField{Name: "description", Max: 4000},
			&core.RelationField{Name: "created_by", CollectionId: users.Id, MaxSelect: 1},
		)
		platform.AddTimestamps(items)
		applyRules(items, "items")
		items.Indexes = append(items.Indexes,
			"CREATE UNIQUE INDEX idx_work_items_code ON work_items (code)",
			"CREATE INDEX idx_work_items_schedule ON work_items (status, start_at)",
		)
		if err := app.Save(items); err != nil {
			return err
		}

		assignments := core.NewBaseCollection("work_item_assignments")
		assignments.Fields.Add(
			&core.RelationField{Name: "work_item", CollectionId: items.Id, MinSelect: 1, MaxSelect: 1, Required: true, CascadeDelete: true},
			&core.RelationField{Name: "staff", CollectionId: staff.Id, MinSelect: 1, MaxSelect: 1, Required: true},
			&core.TextField{Name: "role", Max: 100},
		)
		platform.AddTimestamps(assignments)
		applyRules(assignments, "assignments")
		assignments.Indexes = append(assignments.Indexes, "CREATE UNIQUE INDEX idx_work_assignment_unique ON work_item_assignments (work_item, staff)")
		if err := app.Save(assignments); err != nil {
			return err
		}

		ids, err := platform.EnsurePermissions(app, workitems.Permissions)
		if err != nil {
			return err
		}
		all := make([]string, 0, len(ids))
		operator := make([]string, 0, len(ids))
		for key, id := range ids {
			all = append(all, id)
			if key != "workitems.items.delete" && key != "workitems.assignments.delete" {
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
		for _, name := range []string{"work_item_assignments", "work_items"} {
			if collection, err := app.FindCollectionByNameOrId(name); err == nil {
				if err := app.Delete(collection); err != nil {
					return err
				}
			}
		}
		for _, permission := range workitems.Permissions {
			if record, err := app.FindFirstRecordByData("permissions", "key", permission.Key); err == nil {
				if err := app.Delete(record); err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func applyRules(collection *core.Collection, resource string) {
	collection.ListRule = platform.PermissionRule("workitems." + resource + ".read")
	collection.ViewRule = collection.ListRule
	collection.CreateRule = platform.PermissionRule("workitems." + resource + ".create")
	collection.UpdateRule = platform.PermissionRule("workitems." + resource + ".update")
	collection.DeleteRule = platform.PermissionRule("workitems." + resource + ".delete")
}
