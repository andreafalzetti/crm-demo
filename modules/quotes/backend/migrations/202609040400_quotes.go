package migrations

import (
	"github.com/designferri/crm-demo/internal/platform"
	quotes "github.com/designferri/crm-demo/modules/quotes/backend"
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
		workItems, err := app.FindCollectionByNameOrId("work_items")
		if err != nil {
			return err
		}

		quoteCollection := core.NewBaseCollection("quotes")
		quoteCollection.Fields.Add(
			&core.TextField{Name: "number", Required: true, Max: 40},
			&core.TextField{Name: "title", Required: true, Max: 180, Presentable: true},
			&core.SelectField{Name: "status", Values: []string{"draft", "sent", "accepted", "rejected"}, Required: true},
			&core.RelationField{Name: "organization", CollectionId: organizations.Id, MinSelect: 1, MaxSelect: 1, Required: true},
			&core.RelationField{Name: "work_item", CollectionId: workItems.Id, MaxSelect: 1},
			&core.DateField{Name: "valid_until"},
			&core.NumberField{Name: "subtotal"},
			&core.NumberField{Name: "tax_total"},
			&core.NumberField{Name: "total"},
			&core.TextField{Name: "notes", Max: 3000},
			&core.FileField{Name: "pdf", Protected: true, MaxSize: 10 * 1024 * 1024, MaxSelect: 1, MimeTypes: []string{"application/pdf"}},
			&core.DateField{Name: "generated_at"},
			&core.RelationField{Name: "created_by", CollectionId: users.Id, MaxSelect: 1},
		)
		platform.AddTimestamps(quoteCollection)
		applyRules(quoteCollection, "quotes")
		quoteCollection.Indexes = append(quoteCollection.Indexes,
			"CREATE UNIQUE INDEX idx_quotes_number ON quotes (number)",
			"CREATE INDEX idx_quotes_customer ON quotes (organization, status)",
		)
		if err := app.Save(quoteCollection); err != nil {
			return err
		}

		lines := core.NewBaseCollection("quote_lines")
		lines.Fields.Add(
			&core.RelationField{Name: "quote", CollectionId: quoteCollection.Id, MinSelect: 1, MaxSelect: 1, Required: true, CascadeDelete: true},
			&core.TextField{Name: "description", Required: true, Max: 500, Presentable: true},
			&core.NumberField{Name: "quantity", Required: true},
			&core.NumberField{Name: "unit_price"},
			&core.NumberField{Name: "tax_rate"},
			&core.NumberField{Name: "position", OnlyInt: true},
		)
		platform.AddTimestamps(lines)
		applyRules(lines, "lines")
		lines.Indexes = append(lines.Indexes, "CREATE INDEX idx_quote_lines_quote ON quote_lines (quote, position)")
		if err := app.Save(lines); err != nil {
			return err
		}

		ids, err := platform.EnsurePermissions(app, quotes.Permissions)
		if err != nil {
			return err
		}
		all := make([]string, 0, len(ids))
		operator := make([]string, 0, len(ids))
		for key, id := range ids {
			all = append(all, id)
			if key != "quotes.quotes.delete" && key != "quotes.lines.delete" {
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
		for _, name := range []string{"quote_lines", "quotes"} {
			if collection, err := app.FindCollectionByNameOrId(name); err == nil {
				if err := app.Delete(collection); err != nil {
					return err
				}
			}
		}
		for _, permission := range quotes.Permissions {
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
	collection.ListRule = platform.PermissionRule("quotes." + resource + ".read")
	collection.ViewRule = collection.ListRule
	collection.CreateRule = platform.PermissionRule("quotes." + resource + ".create")
	collection.UpdateRule = platform.PermissionRule("quotes." + resource + ".update")
	collection.DeleteRule = platform.PermissionRule("quotes." + resource + ".delete")
}
