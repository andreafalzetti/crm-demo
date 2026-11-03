package platform

import (
	"errors"
	"slices"

	"github.com/pocketbase/pocketbase/core"
)

// SupportRoleKey is F2 Labs' support: every permission of the instance,
// always, and its people aside from the team (docs/ruoli.md, «L'assistenza»).
const SupportRoleKey = "assistenza"

// SupportOnlyMessage refuses to the others what concerns the support.
const SupportOnlyMessage = "Le persone e il ruolo dell'assistenza di F2 Labs li gestisce solo l'assistenza."

// IsSupport tells whether a user has the support role.
func IsSupport(app core.App, user *core.Record) bool {
	if user == nil || user.Collection().Name != "users" {
		return false
	}
	roles, err := app.FindRecordsByIds("roles", user.GetStringSlice("roles"))
	if err != nil {
		return false
	}
	return slices.ContainsFunc(roles, func(role *core.Record) bool {
		return role.GetString("key") == SupportRoleKey
	})
}

// RegisterSupport keeps the support role whole and its people the
// support's to manage. The request hooks refuse with a message; the model
// hooks hold for the console and the migrations too.
func RegisterSupport(app core.App) {
	registerSupportRequests(app)

	keepWhole := func(e *core.RecordEvent) error {
		if e.Record.GetString("key") == SupportRoleKey ||
			(!e.Record.IsNew() && e.Record.Original().GetString("key") == SupportRoleKey) {
			ids, err := allPermissionIDs(e.App)
			if err != nil {
				return err
			}
			e.Record.Set("key", SupportRoleKey)
			e.Record.Set("system", true)
			e.Record.Set("permissions", ids)
		}
		return e.Next()
	}
	app.OnRecordCreate("roles").BindFunc(keepWhole)
	app.OnRecordUpdate("roles").BindFunc(keepWhole)
	app.OnRecordDelete("roles").BindFunc(func(e *core.RecordEvent) error {
		if e.Record.GetString("key") == SupportRoleKey {
			return errors.New("il ruolo dell'assistenza di F2 Labs non si elimina")
		}
		return e.Next()
	})
	// A new permission reaches the support when it is born: saving the
	// role is enough, keepWhole adds it.
	app.OnRecordAfterCreateSuccess("permissions").BindFunc(func(e *core.RecordEvent) error {
		if err := saveSupportRole(e.App); err != nil {
			return err
		}
		return e.Next()
	})
	// And at every start, for what was written straight in the database.
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		if err := saveSupportRole(e.App); err != nil {
			e.App.Logger().Error("support role not refreshed", "error", err)
		}
		return e.Next()
	})

	// Who is of the support, derived from the roles, so the pages can set
	// them aside with a filter.
	derive := func(e *core.RecordEvent) error {
		if e.Record.Collection().Fields.GetByName("support") != nil {
			e.Record.Set("support", IsSupport(e.App, e.Record))
		}
		return e.Next()
	}
	app.OnRecordCreate("users").BindFunc(derive)
	app.OnRecordUpdate("users").BindFunc(derive)
}

// registerSupportRequests: the support role and its people are given,
// changed and taken only by the support or a superuser. Who manages the
// users must not take over the support's account (a new password, a new
// email) nor block it; and nobody, the support included, takes a
// permission from its role.
func registerSupportRequests(app core.App) {
	allowed := func(e *core.RecordRequestEvent) bool {
		return e.HasSuperuserAuth() || IsSupport(e.App, e.Auth)
	}
	touchesRole := func(e *core.RecordRequestEvent) bool {
		support, err := e.App.FindFirstRecordByData("roles", "key", SupportRoleKey)
		if err != nil {
			return false
		}
		var before []string
		if !e.Record.IsNew() {
			before = e.Record.Original().GetStringSlice("roles")
		}
		return slices.Contains(before, support.Id) != slices.Contains(e.Record.GetStringSlice("roles"), support.Id)
	}
	app.OnRecordCreateRequest("users").BindFunc(func(e *core.RecordRequestEvent) error {
		if !allowed(e) && touchesRole(e) {
			return e.BadRequestError(SupportOnlyMessage, nil)
		}
		return e.Next()
	})
	app.OnRecordUpdateRequest("users").BindFunc(func(e *core.RecordRequestEvent) error {
		if !allowed(e) && (IsSupport(e.App, e.Record.Original()) || touchesRole(e)) {
			return e.BadRequestError(SupportOnlyMessage, nil)
		}
		return e.Next()
	})
	app.OnRecordDeleteRequest("users").BindFunc(func(e *core.RecordRequestEvent) error {
		if !allowed(e) && IsSupport(e.App, e.Record) {
			return e.BadRequestError(SupportOnlyMessage, nil)
		}
		return e.Next()
	})
	app.OnRecordUpdateRequest("roles").BindFunc(func(e *core.RecordRequestEvent) error {
		original := e.Record.Original()
		if original.GetString("key") != SupportRoleKey {
			return e.Next()
		}
		if !allowed(e) {
			return e.BadRequestError(SupportOnlyMessage, nil)
		}
		for _, id := range original.GetStringSlice("permissions") {
			if !slices.Contains(e.Record.GetStringSlice("permissions"), id) {
				return e.BadRequestError("Il ruolo dell'assistenza di F2 Labs ha sempre tutti i permessi.", nil)
			}
		}
		if e.Record.GetString("key") != SupportRoleKey || !e.Record.GetBool("system") {
			return e.BadRequestError("Il ruolo dell'assistenza di F2 Labs non si rinomina e resta di sistema.", nil)
		}
		return e.Next()
	})
	app.OnRecordDeleteRequest("roles").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Record.GetString("key") == SupportRoleKey {
			return e.BadRequestError("I ruoli di sistema non possono essere eliminati.", nil)
		}
		return e.Next()
	})
}

func saveSupportRole(app core.App) error {
	role, err := app.FindFirstRecordByData("roles", "key", SupportRoleKey)
	if err != nil {
		return nil
	}
	return app.Save(role)
}

// allPermissionIDs are the ids of every permission of the instance.
func allPermissionIDs(app core.App) ([]string, error) {
	records, err := app.FindAllRecords("permissions")
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(records))
	for _, record := range records {
		ids = append(ids, record.Id)
	}
	slices.Sort(ids)
	return ids, nil
}
