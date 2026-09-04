package main

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/hook"
)

func registerStaticAssets(app *pocketbase.PocketBase) {
	publicDir := defaultPublicDir()
	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Priority: 999,
		Func: func(event *core.ServeEvent) error {
			if !event.Router.HasRoute(http.MethodGet, "/{path...}") {
				event.Router.GET("/{path...}", apis.Static(os.DirFS(publicDir), true))
			}
			return event.Next()
		},
	})
}

func defaultPublicDir() string {
	if configured := os.Getenv("CRM_PUBLIC_DIR"); configured != "" {
		return configured
	}
	executable, err := os.Executable()
	if err != nil {
		return "pb_public"
	}
	return filepath.Join(filepath.Dir(executable), "pb_public")
}
