package platform

import (
	"fmt"
	"slices"

	"github.com/pocketbase/pocketbase/core"
)

type PermissionDefinition struct {
	Key         string `json:"key"`
	Module      string `json:"module"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

var CorePermissions = []PermissionDefinition{
	{Key: "core.users.read", Module: "core", Label: "Visualizzare utenti", Description: "Consulta utenti e assegnazioni."},
	{Key: "core.users.manage", Module: "core", Label: "Gestire utenti", Description: "Crea, modifica e disattiva utenti."},
	{Key: "core.roles.read", Module: "core", Label: "Visualizzare ruoli", Description: "Consulta ruoli e permessi."},
	{Key: "core.roles.manage", Module: "core", Label: "Gestire ruoli", Description: "Crea e compone i ruoli."},
	{Key: "core.audit.read", Module: "core", Label: "Visualizzare audit", Description: "Consulta lo storico delle modifiche."},
}

func PermissionRule(key string) *string {
	rule := fmt.Sprintf(`@request.auth.id != "" && @request.auth.active = true && @request.auth.roles.permissions.key ?= "%s"`, key)
	return &rule
}

func PermissionRuleAny(keys ...string) *string {
	if len(keys) == 0 {
		return nil
	}
	rule := `@request.auth.id != "" && @request.auth.active = true && (`
	for i, key := range keys {
		if i > 0 {
			rule += " || "
		}
		rule += fmt.Sprintf(`@request.auth.roles.permissions.key ?= "%s"`, key)
	}
	rule += ")"
	return &rule
}

func PermissionKeys(app core.App, user *core.Record) ([]string, error) {
	if user == nil || user.Collection().Name != "users" || !user.GetBool("active") {
		return []string{}, nil
	}

	keys := make([]string, 0)
	for _, roleID := range user.GetStringSlice("roles") {
		role, err := app.FindRecordById("roles", roleID)
		if err != nil {
			return nil, err
		}
		for _, permissionID := range role.GetStringSlice("permissions") {
			permission, err := app.FindRecordById("permissions", permissionID)
			if err != nil {
				return nil, err
			}
			key := permission.GetString("key")
			if key != "" && !slices.Contains(keys, key) {
				keys = append(keys, key)
			}
		}
	}
	slices.Sort(keys)
	return keys, nil
}

func Can(app core.App, user *core.Record, key string) bool {
	keys, err := PermissionKeys(app, user)
	return err == nil && slices.Contains(keys, key)
}

func EnsurePermissions(app core.App, definitions []PermissionDefinition) (map[string]string, error) {
	collection, err := app.FindCollectionByNameOrId("permissions")
	if err != nil {
		return nil, err
	}

	ids := make(map[string]string, len(definitions))
	for _, definition := range definitions {
		record, err := app.FindFirstRecordByData(collection, "key", definition.Key)
		if err != nil {
			record = core.NewRecord(collection)
		}
		record.Set("key", definition.Key)
		record.Set("module", definition.Module)
		record.Set("label", definition.Label)
		record.Set("description", definition.Description)
		if err := app.Save(record); err != nil {
			return nil, err
		}
		ids[definition.Key] = record.Id
	}
	return ids, nil
}

func AddRolePermissions(app core.App, roleKey string, permissionIDs ...string) error {
	role, err := app.FindFirstRecordByData("roles", "key", roleKey)
	if err != nil {
		return err
	}
	ids := role.GetStringSlice("permissions")
	for _, id := range permissionIDs {
		if id != "" && !slices.Contains(ids, id) {
			ids = append(ids, id)
		}
	}
	role.Set("permissions", ids)
	return app.Save(role)
}
