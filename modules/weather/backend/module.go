package weather

import (
	"context"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

const (
	geocoderURLEnv = "CRM_GEOCODER_URL"
	metBaseURLEnv  = "CRM_WEATHER_API_URL"
	userAgentEnv   = "CRM_WEATHER_USER_AGENT"

	// forecastWindow bounds which jobs make a place "active" and therefore worth
	// keeping a fresh forecast for.
	forecastWindow = 8 * 24 * time.Hour

	geocodeBatchSize = 25
)

type Module struct{}

func (Module) ID() string { return "weather" }

func (Module) Permissions() []platform.PermissionDefinition { return Permissions }

func (Module) AuditedCollections() []string {
	return []string{"weather_alert_rules", "geo_places"}
}

func (Module) Register(app *pocketbase.PocketBase) {
	for collection := range addressFields {
		handler := bindAddressHooks(app, collection)
		app.OnRecordCreateRequest(collection).BindFunc(handler)
		app.OnRecordUpdateRequest(collection).BindFunc(handler)
	}

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		config := newRuntimeConfig()

		e.Router.GET("/api/crm/weather/forecast", config.handleForecast).
			Bind(apis.RequireAuth("users"), platform.Require("weather.forecast.read"))
		e.Router.GET("/api/crm/weather/forecast/by-coords", config.handleForecastByCoords).
			Bind(apis.RequireAuth("users"), platform.Require("weather.forecast.read"))
		e.Router.GET("/api/crm/weather/forecast/by-address", config.handleForecastByAddress).
			Bind(apis.RequireAuth("users"), platform.Require("weather.forecast.read"))
		e.Router.GET("/api/crm/weather/alerts", config.handleAlerts).
			Bind(apis.RequireAuth("users"), platform.Require("weather.alerts.read"))
		e.Router.POST("/api/crm/weather/alerts/{id}/ack", config.handleAcknowledge).
			Bind(apis.RequireAuth("users"), platform.Require("weather.alerts.acknowledge"))

		// Geocoding runs close behind the save so a freshly created job site is
		// located within minutes, without blocking the request that created it.
		e.App.Cron().MustAdd("weather-geocode", "*/5 * * * *", func() {
			ctx, cancel := context.WithTimeout(context.Background(), 4*time.Minute)
			defer cancel()
			if err := ResolvePendingPlaces(ctx, e.App, config.geocoder, geocodeBatchSize); err != nil {
				e.App.Logger().Error("geocoding run failed", "error", err)
			}
		})

		// Half-hourly matches the Expires window MET currently returns; places
		// still inside it are skipped without a request.
		e.App.Cron().MustAdd("weather-refresh", "*/30 * * * *", func() {
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
			defer cancel()
			if err := RefreshActivePlaces(ctx, e.App, config.met); err != nil {
				e.App.Logger().Error("weather refresh failed", "error", err)
			}
		})

		// Early enough that a site manager reads the warning before leaving for
		// the yard.
		e.App.Cron().MustAdd("weather-alerts", "0 6 * * *", func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
			defer cancel()
			if err := EvaluateAlerts(ctx, e.App, time.Now()); err != nil {
				e.App.Logger().Error("alert evaluation failed", "error", err)
			}
		})

		return e.Next()
	})
}

// runtimeConfig holds the outbound clients. Both endpoints are configuration so
// the same binary runs against the self-hosted geocoder in production and the
// public instance while that container is being provisioned.
type runtimeConfig struct {
	geocoder *Geocoder
	met      *MetClient
}

func newRuntimeConfig() runtimeConfig {
	userAgent := strings.TrimSpace(os.Getenv(userAgentEnv))
	return runtimeConfig{
		geocoder: NewGeocoder(
			strings.TrimSpace(os.Getenv(geocoderURLEnv)),
			userAgent,
			&http.Client{Timeout: geocoderTimeout},
		),
		met: NewMetClient(
			strings.TrimSpace(os.Getenv(metBaseURLEnv)),
			userAgent,
			&http.Client{Timeout: metTimeout},
		),
	}
}
