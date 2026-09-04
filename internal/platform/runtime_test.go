package platform_test

import (
	"testing"

	_ "github.com/designferri/crm-demo/internal/migrations"
	"github.com/designferri/crm-demo/internal/platform"
	_ "github.com/designferri/crm-demo/modules/address-book/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/agenda/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/assistant/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/personnel/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/quotes/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/work-items/backend/migrations"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func TestMigrationsAndRBAC(t *testing.T) {
	app := pocketbase.NewWithConfig(pocketbase.Config{DefaultDataDir: t.TempDir(), HideStartBanner: true})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	defer app.ResetBootstrapState()
	if err := app.RunAllMigrations(); err != nil {
		t.Fatal(err)
	}

	for _, name := range []string{
		"permissions", "roles", "users", "audit_events",
		"organizations", "contacts", "notes", "activities", "documents",
		"staff_members", "attendance_entries", "leave_requests",
		"work_items", "work_item_assignments", "agenda_entries",
		"quotes", "quote_lines",
		"assistant_actions",
	} {
		collection, err := app.FindCollectionByNameOrId(name)
		if err != nil {
			t.Fatalf("collection %s missing: %v", name, err)
		}
		if collection.Fields.GetByName("created") == nil || collection.Fields.GetByName("updated") == nil {
			t.Fatalf("collection %s is missing timestamps", name)
		}
	}

	administrator, err := app.FindFirstRecordByData("roles", "key", "administrator")
	if err != nil {
		t.Fatal(err)
	}
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	user := core.NewRecord(users)
	user.SetEmail("admin@example.test")
	user.SetPassword("Password-12345")
	user.Set("name", "Test Admin")
	user.Set("active", true)
	user.Set("roles", []string{administrator.Id})
	if err := app.Save(user); err != nil {
		t.Fatal(err)
	}

	keys, err := platform.PermissionKeys(app, user)
	if err != nil {
		t.Fatal(err)
	}
	if len(keys) != 59 {
		t.Fatalf("expected 59 permissions, got %d", len(keys))
	}
	if !platform.Can(app, user, "core.roles.manage") ||
		!platform.Can(app, user, "addressbook.documents.delete") ||
		!platform.Can(app, user, "personnel.leave.update") ||
		!platform.Can(app, user, "workitems.items.create") ||
		!platform.Can(app, user, "agenda.entries.delete") ||
		!platform.Can(app, user, "quotes.generate") ||
		!platform.Can(app, user, "assistant.use") {
		t.Fatal("administrator is missing expected permissions")
	}
}
