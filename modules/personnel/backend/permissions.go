package personnel

import "github.com/designferri/crm-demo/internal/platform"

var Permissions = buildPermissions()

func buildPermissions() []platform.PermissionDefinition {
	resources := []struct{ key, label string }{
		{"staff", "personale"},
		{"attendance", "presenze"},
		{"leave", "ferie e assenze"},
	}
	actions := []struct{ key, label string }{
		{"read", "Visualizzare"},
		{"create", "Creare"},
		{"update", "Modificare"},
		{"delete", "Eliminare"},
	}
	result := make([]platform.PermissionDefinition, 0, len(resources)*len(actions))
	for _, resource := range resources {
		for _, action := range actions {
			result = append(result, platform.PermissionDefinition{
				Key:         "personnel." + resource.key + "." + action.key,
				Module:      "personnel",
				Label:       action.label + " " + resource.label,
				Description: action.label + " i record di " + resource.label + ".",
			})
		}
	}
	return result
}
