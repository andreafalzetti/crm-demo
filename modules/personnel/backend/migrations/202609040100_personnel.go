package migrations

import (
	"github.com/designferri/crm-demo/internal/platform"
	personnel "github.com/designferri/crm-demo/modules/personnel/backend"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		staff := core.NewBaseCollection("staff_members")
		staff.Fields.Add(
			&core.TextField{Name: "employee_code", Required: true, Max: 30},
			&core.TextField{Name: "first_name", Required: true, Max: 100},
			&core.TextField{Name: "last_name", Required: true, Max: 100, Presentable: true},
			&core.EmailField{Name: "email"},
			&core.TextField{Name: "phone", Max: 50},
			&core.TextField{Name: "job_title", Max: 120},
			&core.SelectField{Name: "status", Values: []string{"active", "inactive"}, Required: true},
			&core.RelationField{Name: "user", CollectionId: users.Id, MaxSelect: 1},
		)
		platform.AddTimestamps(staff)
		applyRules(staff, "staff")
		staff.Indexes = append(staff.Indexes,
			"CREATE UNIQUE INDEX idx_staff_employee_code ON staff_members (employee_code)",
			"CREATE INDEX idx_staff_name ON staff_members (last_name, first_name)",
		)
		if err := app.Save(staff); err != nil {
			return err
		}

		attendance := core.NewBaseCollection("attendance_entries")
		attendance.Fields.Add(
			&core.RelationField{Name: "staff", CollectionId: staff.Id, MinSelect: 1, MaxSelect: 1, Required: true, CascadeDelete: true},
			&core.DateField{Name: "day", Required: true},
			&core.SelectField{Name: "kind", Values: []string{"present", "remote", "absent"}, Required: true},
			&core.TextField{Name: "clock_in", Max: 5},
			&core.TextField{Name: "clock_out", Max: 5},
			&core.TextField{Name: "note", Max: 500},
			&core.RelationField{Name: "created_by", CollectionId: users.Id, MaxSelect: 1},
		)
		platform.AddTimestamps(attendance)
		applyRules(attendance, "attendance")
		attendance.Indexes = append(attendance.Indexes, "CREATE UNIQUE INDEX idx_attendance_staff_day ON attendance_entries (staff, day)")
		if err := app.Save(attendance); err != nil {
			return err
		}

		leave := core.NewBaseCollection("leave_requests")
		leave.Fields.Add(
			&core.RelationField{Name: "staff", CollectionId: staff.Id, MinSelect: 1, MaxSelect: 1, Required: true, CascadeDelete: true},
			&core.SelectField{Name: "type", Values: []string{"vacation", "sick", "permit"}, Required: true},
			&core.DateField{Name: "start_date", Required: true},
			&core.DateField{Name: "end_date", Required: true},
			&core.SelectField{Name: "status", Values: []string{"pending", "approved", "rejected"}, Required: true},
			&core.TextField{Name: "note", Max: 1000},
			&core.RelationField{Name: "created_by", CollectionId: users.Id, MaxSelect: 1},
			&core.RelationField{Name: "decided_by", CollectionId: users.Id, MaxSelect: 1},
		)
		platform.AddTimestamps(leave)
		applyRules(leave, "leave")
		leave.Indexes = append(leave.Indexes, "CREATE INDEX idx_leave_dates ON leave_requests (status, start_date, end_date)")
		if err := app.Save(leave); err != nil {
			return err
		}

		ids, err := platform.EnsurePermissions(app, personnel.Permissions)
		if err != nil {
			return err
		}
		all := make([]string, 0, len(ids))
		operator := make([]string, 0, len(ids))
		for key, id := range ids {
			all = append(all, id)
			if key == "personnel.staff.read" || key == "personnel.attendance.read" || key == "personnel.leave.read" || key == "personnel.leave.create" {
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
		for _, name := range []string{"leave_requests", "attendance_entries", "staff_members"} {
			if collection, err := app.FindCollectionByNameOrId(name); err == nil {
				if err := app.Delete(collection); err != nil {
					return err
				}
			}
		}
		for _, permission := range personnel.Permissions {
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
	collection.ListRule = platform.PermissionRule("personnel." + resource + ".read")
	collection.ViewRule = collection.ListRule
	collection.CreateRule = platform.PermissionRule("personnel." + resource + ".create")
	collection.UpdateRule = platform.PermissionRule("personnel." + resource + ".update")
	collection.DeleteRule = platform.PermissionRule("personnel." + resource + ".delete")
}
