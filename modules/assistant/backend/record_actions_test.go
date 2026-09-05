package assistant

import (
	"strings"
	"testing"

	_ "github.com/designferri/crm-demo/internal/migrations"
	_ "github.com/designferri/crm-demo/modules/address-book/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/agenda/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/personnel/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/quotes/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/work-items/backend/migrations"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func TestRecordActionsCreateAndUpdateCustomer(t *testing.T) {
	app, actor := newRecordActionTestApp(t, "administrator")
	payload := map[string]any{
		"resource": "customer",
		"fields": map[string]any{
			"name":      "Studio Demo",
			"legalName": "Studio Demo S.r.l.",
			"email":     "info@studio-demo.test",
			"status":    "active",
		},
	}

	summary, err := validateAction(app, actor, "create_record", payload)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(summary, "Studio Demo") {
		t.Fatalf("unexpected summary: %s", summary)
	}
	created, err := applyAction(app, actor, "create_record", payload)
	if err != nil {
		t.Fatal(err)
	}
	id, _ := created["id"].(string)
	record, err := app.FindRecordById("organizations", id)
	if err != nil {
		t.Fatal(err)
	}
	if record.GetString("name") != "Studio Demo" || record.GetString("status") != "active" {
		t.Fatalf("unexpected created customer: %#v", record.PublicExport())
	}
	found, err := findAssistantRecords(app, actor, map[string]any{"resource": "customer", "query": "Studio"})
	if err != nil {
		t.Fatal(err)
	}
	items, _ := found["records"].([]map[string]any)
	if len(items) != 1 || items[0]["id"] != id {
		t.Fatalf("created customer not found through safe record reader: %#v", found)
	}

	update := map[string]any{
		"resource": "customer",
		"id":       id,
		"fields": map[string]any{
			"email": "amministrazione@studio-demo.test",
			"phone": "+39 02 1234567",
		},
	}
	if _, err := validateAction(app, actor, "update_record", update); err != nil {
		t.Fatal(err)
	}
	updated, err := applyAction(app, actor, "update_record", update)
	if err != nil {
		t.Fatal(err)
	}
	if updated["operation"] != "update" || updated["link"] != "/organizations/"+id {
		t.Fatalf("unexpected update result: %#v", updated)
	}
	record, err = app.FindRecordById("organizations", id)
	if err != nil {
		t.Fatal(err)
	}
	if record.GetString("email") != "amministrazione@studio-demo.test" || record.GetString("phone") != "+39 02 1234567" {
		t.Fatalf("customer not updated: %#v", record.PublicExport())
	}

	audits, err := app.FindRecordsByFilter("audit_events", "collection = 'organizations' && record_id = {:id}", "created", 10, 0, map[string]any{"id": id})
	if err != nil {
		t.Fatal(err)
	}
	if len(audits) != 2 || audits[0].GetString("actor") != actor.Id || audits[1].GetString("actor") != actor.Id {
		t.Fatalf("expected create and update audit events, got %#v", audits)
	}
}

func TestRecordActionsRejectUnsafeFieldsAndDeletes(t *testing.T) {
	app, actor := newRecordActionTestApp(t, "administrator")
	unsafe := map[string]any{
		"resource": "customer",
		"fields": map[string]any{
			"name":    "Studio Demo",
			"created": "2020-01-01",
		},
	}
	if _, err := validateAction(app, actor, "create_record", unsafe); err == nil || !strings.Contains(err.Error(), "non consentito") {
		t.Fatalf("expected unsafe field rejection, got %v", err)
	}
	if _, err := validateAction(app, actor, "delete_record", map[string]any{"resource": "customer", "id": "record-id"}); err == nil {
		t.Fatal("delete_record must never be accepted")
	}
	if _, err := validateAction(app, actor, "create_record", map[string]any{
		"resource": "customer",
		"fields":   map[string]any{"name": "Studio Demo", "status": "deleted"},
	}); err == nil {
		t.Fatal("invalid status must be rejected before confirmation")
	}
}

func TestRecordActionsRespectResourcePermissions(t *testing.T) {
	app, actor := newRecordActionTestApp(t, "operator")
	_, err := validateAction(app, actor, "create_record", map[string]any{
		"resource": "staff_member",
		"fields": map[string]any{
			"employeeCode": "AI-001",
			"firstName":    "Ada",
			"lastName":     "Lovelace",
		},
	})
	if err == nil || !strings.Contains(err.Error(), "personnel.staff.create") {
		t.Fatalf("expected role permission rejection, got %v", err)
	}
}

func newRecordActionTestApp(t *testing.T, roleKey string) (*pocketbase.PocketBase, *core.Record) {
	t.Helper()
	app := pocketbase.NewWithConfig(pocketbase.Config{DefaultDataDir: t.TempDir(), HideStartBanner: true})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })
	if err := app.RunAllMigrations(); err != nil {
		t.Fatal(err)
	}
	role, err := app.FindFirstRecordByData("roles", "key", roleKey)
	if err != nil {
		t.Fatal(err)
	}
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	actor := core.NewRecord(users)
	actor.SetEmail("assistant-admin@example.test")
	actor.SetPassword("Password-12345")
	actor.Set("name", "Assistant Admin")
	actor.Set("active", true)
	actor.Set("roles", []string{role.Id})
	if err := app.Save(actor); err != nil {
		t.Fatal(err)
	}
	return app, actor
}
