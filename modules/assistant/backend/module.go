package assistant

import (
	"os"
	"strings"

	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

const (
	sharedSecretEnv = "CRM_ASSISTANT_SHARED_SECRET"
	workflowURLEnv  = "CRM_ASSISTANT_N8N_URL"
)

type Module struct{}

func (Module) ID() string { return "assistant" }

func (Module) Permissions() []platform.PermissionDefinition { return Permissions }

func (Module) Register(app *pocketbase.PocketBase) {
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		config := runtimeConfig{
			sharedSecret: strings.TrimSpace(os.Getenv(sharedSecretEnv)),
			workflowURL:  strings.TrimSpace(os.Getenv(workflowURLEnv)),
		}
		e.Router.POST("/api/crm/assistant/chat", config.handleChat).
			Bind(apis.RequireAuth("users"), platform.Require("assistant.use"))
		e.Router.POST("/api/crm/assistant/tools", config.handleTool)
		e.Router.POST("/api/crm/assistant/actions/{id}/confirm", config.handleConfirm).
			Bind(apis.RequireAuth("users"), platform.Require("assistant.use"))
		e.Router.POST("/api/crm/assistant/actions/{id}/cancel", config.handleCancel).
			Bind(apis.RequireAuth("users"), platform.Require("assistant.use"))
		return e.Next()
	})
}

type runtimeConfig struct {
	sharedSecret string
	workflowURL  string
}
