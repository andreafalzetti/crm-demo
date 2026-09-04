package assistant

import "github.com/designferri/crm-demo/internal/platform"

var Permissions = []platform.PermissionDefinition{
	{
		Key:         "assistant.use",
		Module:      "assistant",
		Label:       "Usare l'assistente AI",
		Description: "Conversa con l'assistente e usa gli strumenti consentiti dal proprio ruolo.",
	},
}
