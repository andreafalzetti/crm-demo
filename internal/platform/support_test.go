package platform_test

import (
	"slices"
	"testing"

	_ "github.com/designferri/crm-demo/internal/migrations"
	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

// F2 Labs' support keeps every permission from wherever the role is saved,
// a permission born later is already its own, the role is not deleted,
// and its people are told apart by a field derived from the roles
// (docs/ruoli.md, «L'assistenza»).
func TestTheSupportRoleKeepsEveryPermission(t *testing.T) {
	app := pocketbase.NewWithConfig(pocketbase.Config{DefaultDataDir: t.TempDir(), HideStartBanner: true})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	defer app.ResetBootstrapState()
	platform.RegisterSupport(app)
	if err := app.RunAllMigrations(); err != nil {
		t.Fatal(err)
	}

	whole := func(when string) *core.Record {
		t.Helper()
		role, err := app.FindFirstRecordByData("roles", "key", platform.SupportRoleKey)
		if err != nil {
			t.Fatal(err)
		}
		all, err := app.FindAllRecords("permissions")
		if err != nil {
			t.Fatal(err)
		}
		for _, permission := range all {
			if !slices.Contains(role.GetStringSlice("permissions"), permission.Id) {
				t.Fatalf("%s: all'assistenza manca %s", when, permission.GetString("key"))
			}
		}
		if !role.GetBool("system") {
			t.Fatalf("%s: il ruolo resta di sistema", when)
		}
		return role
	}

	role := whole("dopo le migrazioni")
	role.Set("permissions", role.GetStringSlice("permissions")[1:])
	role.Set("system", false)
	if err := app.Save(role); err != nil {
		t.Fatal(err)
	}
	whole("salvato dalla console")

	if _, err := platform.EnsurePermissions(app, []platform.PermissionDefinition{
		{Key: "things.read", Module: "things", Label: "Vedere le cose", Description: "test"},
	}); err != nil {
		t.Fatal(err)
	}
	role = whole("un permesso nuovo")

	if err := app.Delete(role); err == nil {
		t.Fatal("il ruolo dell'assistenza non si elimina, nemmeno dalla console")
	}

	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	operator, err := app.FindFirstRecordByData("roles", "key", "operator")
	if err != nil {
		t.Fatal(err)
	}
	person := core.NewRecord(users)
	person.SetEmail("assistenza@example.test")
	person.SetPassword("Password-12345")
	person.Set("name", "Assistenza")
	person.Set("active", true)
	person.Set("roles", []string{role.Id})
	if err := app.Save(person); err != nil {
		t.Fatal(err)
	}
	if !person.GetBool("support") {
		t.Fatal("chi ha il ruolo è dell'assistenza")
	}
	person.Set("roles", []string{operator.Id})
	if err := app.Save(person); err != nil {
		t.Fatal(err)
	}
	if person.GetBool("support") {
		t.Fatal("senza il ruolo non è più dell'assistenza")
	}
}
