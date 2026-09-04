package platform

import "github.com/pocketbase/pocketbase"

type Module interface {
	ID() string
	Permissions() []PermissionDefinition
	Register(app *pocketbase.PocketBase)
}

type AuditedModule interface {
	AuditedCollections() []string
}
