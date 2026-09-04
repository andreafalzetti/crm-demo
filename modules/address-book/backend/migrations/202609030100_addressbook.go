package migrations

import (
	"github.com/designferri/crm-demo/internal/platform"
	addressbook "github.com/designferri/crm-demo/modules/address-book/backend"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		organizations := core.NewBaseCollection("organizations")
		organizations.Fields.Add(
			&core.TextField{Name: "name", Required: true, Max: 180, Presentable: true},
			&core.TextField{Name: "legal_name", Max: 180},
			&core.TextField{Name: "vat_number", Max: 32},
			&core.EmailField{Name: "email"},
			&core.TextField{Name: "phone", Max: 50},
			&core.URLField{Name: "website"},
			&core.TextField{Name: "address", Max: 1000},
			&core.JSONField{Name: "tags", MaxSize: 16 * 1024},
			&core.SelectField{Name: "status", Values: []string{"prospect", "active", "archived"}, Required: true},
			&core.RelationField{Name: "assigned_to", CollectionId: users.Id, MaxSelect: 1},
		)
		platform.AddTimestamps(organizations)
		applyRules(organizations, "organizations")
		organizations.Indexes = append(organizations.Indexes, "CREATE INDEX idx_organizations_name ON organizations (name)")
		if err := app.Save(organizations); err != nil {
			return err
		}

		contacts := core.NewBaseCollection("contacts")
		contacts.Fields.Add(
			&core.RelationField{Name: "organization", CollectionId: organizations.Id, MaxSelect: 1},
			&core.TextField{Name: "first_name", Required: true, Max: 100},
			&core.TextField{Name: "last_name", Required: true, Max: 100, Presentable: true},
			&core.TextField{Name: "position", Max: 120},
			&core.EmailField{Name: "email"},
			&core.TextField{Name: "phone", Max: 50},
			&core.TextField{Name: "mobile", Max: 50},
			&core.JSONField{Name: "tags", MaxSize: 16 * 1024},
			&core.SelectField{Name: "status", Values: []string{"active", "inactive"}, Required: true},
			&core.RelationField{Name: "assigned_to", CollectionId: users.Id, MaxSelect: 1},
		)
		platform.AddTimestamps(contacts)
		applyRules(contacts, "contacts")
		contacts.Indexes = append(contacts.Indexes, "CREATE INDEX idx_contacts_name ON contacts (last_name, first_name)")
		if err := app.Save(contacts); err != nil {
			return err
		}

		notes := core.NewBaseCollection("notes")
		notes.Fields.Add(
			&core.RelationField{Name: "organization", CollectionId: organizations.Id, MaxSelect: 1, CascadeDelete: true},
			&core.RelationField{Name: "contact", CollectionId: contacts.Id, MaxSelect: 1, CascadeDelete: true},
			&core.EditorField{Name: "body", Required: true, MaxSize: 64 * 1024},
			&core.RelationField{Name: "author", CollectionId: users.Id, MinSelect: 1, MaxSelect: 1, Required: true},
		)
		platform.AddTimestamps(notes)
		applyRules(notes, "notes")
		if err := app.Save(notes); err != nil {
			return err
		}

		activities := core.NewBaseCollection("activities")
		activities.Fields.Add(
			&core.TextField{Name: "subject", Required: true, Max: 180, Presentable: true},
			&core.SelectField{Name: "type", Values: []string{"call", "email", "meeting", "task"}, Required: true},
			&core.SelectField{Name: "status", Values: []string{"open", "done", "cancelled"}, Required: true},
			&core.DateField{Name: "due_at"},
			&core.DateField{Name: "completed_at"},
			&core.RelationField{Name: "organization", CollectionId: organizations.Id, MaxSelect: 1, CascadeDelete: true},
			&core.RelationField{Name: "contact", CollectionId: contacts.Id, MaxSelect: 1, CascadeDelete: true},
			&core.RelationField{Name: "assignee", CollectionId: users.Id, MaxSelect: 1},
			&core.RelationField{Name: "created_by", CollectionId: users.Id, MinSelect: 1, MaxSelect: 1, Required: true},
		)
		platform.AddTimestamps(activities)
		applyRules(activities, "activities")
		activities.Indexes = append(activities.Indexes, "CREATE INDEX idx_activities_due ON activities (status, due_at)")
		if err := app.Save(activities); err != nil {
			return err
		}

		documents := core.NewBaseCollection("documents")
		documents.Fields.Add(
			&core.TextField{Name: "title", Required: true, Max: 180, Presentable: true},
			&core.FileField{Name: "file", Required: true, Protected: true, MaxSize: 10 * 1024 * 1024, MaxSelect: 1, MimeTypes: []string{"application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}},
			&core.RelationField{Name: "organization", CollectionId: organizations.Id, MaxSelect: 1, CascadeDelete: true},
			&core.RelationField{Name: "contact", CollectionId: contacts.Id, MaxSelect: 1, CascadeDelete: true},
			&core.RelationField{Name: "uploaded_by", CollectionId: users.Id, MinSelect: 1, MaxSelect: 1, Required: true},
		)
		platform.AddTimestamps(documents)
		applyRules(documents, "documents")
		if err := app.Save(documents); err != nil {
			return err
		}

		ids, err := platform.EnsurePermissions(app, addressbook.Permissions)
		if err != nil {
			return err
		}
		all := make([]string, 0, len(ids))
		operator := make([]string, 0, len(ids))
		for key, id := range ids {
			all = append(all, id)
			if key[len(key)-6:] != "delete" {
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
		for _, name := range []string{"documents", "activities", "notes", "contacts", "organizations"} {
			collection, err := app.FindCollectionByNameOrId(name)
			if err == nil {
				if err := app.Delete(collection); err != nil {
					return err
				}
			}
		}
		for _, permission := range addressbook.Permissions {
			record, err := app.FindFirstRecordByData("permissions", "key", permission.Key)
			if err == nil {
				if err := app.Delete(record); err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func applyRules(collection *core.Collection, resource string) {
	collection.ListRule = platform.PermissionRule("addressbook." + resource + ".read")
	collection.ViewRule = collection.ListRule
	collection.CreateRule = platform.PermissionRule("addressbook." + resource + ".create")
	collection.UpdateRule = platform.PermissionRule("addressbook." + resource + ".update")
	collection.DeleteRule = platform.PermissionRule("addressbook." + resource + ".delete")
}
