package weather_test

import (
	"context"
	"encoding/json"
	"slices"
	"strings"
	"testing"
	"time"

	_ "github.com/designferri/crm-demo/internal/migrations"
	_ "github.com/designferri/crm-demo/modules/address-book/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/agenda/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/assistant/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/personnel/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/quotes/backend/migrations"
	weather "github.com/designferri/crm-demo/modules/weather/backend"
	_ "github.com/designferri/crm-demo/modules/weather/backend/migrations"
	_ "github.com/designferri/crm-demo/modules/work-items/backend/migrations"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

func newTestApp(t *testing.T) *pocketbase.PocketBase {
	t.Helper()
	app := pocketbase.NewWithConfig(pocketbase.Config{DefaultDataDir: t.TempDir(), HideStartBanner: true})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })
	if err := app.RunAllMigrations(); err != nil {
		t.Fatal(err)
	}
	return app
}

func seedPlace(t *testing.T, app core.App) *core.Record {
	t.Helper()
	collection, err := app.FindCollectionByNameOrId("geo_places")
	if err != nil {
		t.Fatal(err)
	}
	place := core.NewRecord(collection)
	place.Set("label", "Via Roma 12, Grottaferrata")
	place.Set("query", "Via Roma 12, Grottaferrata")
	place.Set("query_hash", "hash-grottaferrata")
	place.Set("latitude", 41.7883)
	place.Set("longitude", 12.6683)
	place.Set("municipality", "Grottaferrata")
	place.Set("province", "Roma Capitale")
	place.Set("timezone", "Europe/Rome")
	place.Set("source", "photon")
	place.Set("resolved_at", types.NowDateTime())
	if err := app.Save(place); err != nil {
		t.Fatal(err)
	}
	return place
}

// seedForecast stores the storm of 10 September as if it had just been fetched,
// anchored to the day after `now` so the horizon window always covers it.
func seedForecast(t *testing.T, app core.App, place *core.Record, now time.Time) {
	t.Helper()
	location, err := time.LoadLocation("Europe/Rome")
	if err != nil {
		t.Skipf("tzdata non disponibile: %v", err)
	}
	tomorrow := now.In(location).AddDate(0, 0, 1).Format("2006-01-02")
	dayAfter := now.In(location).AddDate(0, 0, 2).Format("2006-01-02")

	minTemp, maxTemp := 19.5, 27.8
	calm, warm := 19.4, 26.0
	forecast := weather.Forecast{
		UpdatedAt: now.UTC(),
		TimeZone:  "Europe/Rome",
		Days: []weather.ForecastDay{
			{Date: tomorrow, MinTemp: &minTemp, MaxTemp: &maxTemp, Precipitation: 33.9, MaxWind: 6.9, Symbol: "heavyrain"},
			{Date: dayAfter, MinTemp: &calm, MaxTemp: &warm, Precipitation: 0.4, MaxWind: 5.0, Symbol: "clearsky_day"},
		},
	}
	payload, err := json.Marshal(forecast)
	if err != nil {
		t.Fatal(err)
	}
	collection, err := app.FindCollectionByNameOrId("weather_forecasts")
	if err != nil {
		t.Fatal(err)
	}
	record := core.NewRecord(collection)
	record.Set("place", place.Id)
	record.Set("payload", string(payload))
	record.Set("model_run", now.UTC())
	record.Set("expires_at", now.Add(30*time.Minute).UTC())
	record.Set("fetched_at", now.UTC())
	if err := app.Save(record); err != nil {
		t.Fatal(err)
	}
}

func alertsIn(t *testing.T, app core.App, filter string) []*core.Record {
	t.Helper()
	records, err := app.FindRecordsByFilter("weather_alerts", filter, "day", 100, 0, dbx.Params{})
	if err != nil {
		t.Fatal(err)
	}
	return records
}

func TestEvaluateAlertsRaisesAndDeduplicates(t *testing.T) {
	app := newTestApp(t)
	now := time.Date(2026, 9, 9, 6, 0, 0, 0, time.UTC)
	place := seedPlace(t, app)
	seedForecast(t, app, place, now)

	if err := weather.EvaluateAlerts(context.Background(), app, now); err != nil {
		t.Fatal(err)
	}

	// The seeded "Pioggia intensa" rule (>= 20 mm within 3 days) must fire on the
	// 33.9 mm day, and the other seeded rules must stay quiet.
	open := alertsIn(t, app, "status = 'open'")
	if len(open) != 1 {
		headlines := []string{}
		for _, alert := range open {
			headlines = append(headlines, alert.GetString("headline"))
		}
		t.Fatalf("attesa 1 allerta, ottenute %d: %v", len(open), headlines)
	}
	headline := open[0].GetString("headline")
	for _, fragment := range []string{"Pioggia intensa", "33.9", "mm", "Grottaferrata"} {
		if !strings.Contains(headline, fragment) {
			t.Fatalf("headline %q non contiene %q", headline, fragment)
		}
	}
	if open[0].GetString("severity") != "warning" {
		t.Fatalf("severita' = %q", open[0].GetString("severity"))
	}
	if open[0].GetString("place") != place.Id {
		t.Fatal("allerta non collegata al luogo")
	}

	// A second run on the same day must refresh, not duplicate.
	if err := weather.EvaluateAlerts(context.Background(), app, now.Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	if again := alertsIn(t, app, "status = 'open'"); len(again) != 1 {
		t.Fatalf("la rivalutazione ha duplicato: %d allerte", len(again))
	}
}

func TestEvaluateAlertsRespectsAcknowledgementAndExpiry(t *testing.T) {
	app := newTestApp(t)
	now := time.Date(2026, 9, 9, 6, 0, 0, 0, time.UTC)
	place := seedPlace(t, app)
	seedForecast(t, app, place, now)

	if err := weather.EvaluateAlerts(context.Background(), app, now); err != nil {
		t.Fatal(err)
	}
	open := alertsIn(t, app, "status = 'open'")
	if len(open) != 1 {
		t.Fatalf("attesa 1 allerta, ottenute %d", len(open))
	}
	open[0].Set("status", "acknowledged")
	if err := app.Save(open[0]); err != nil {
		t.Fatal(err)
	}

	// Re-running must not reopen something an operator has already handled.
	if err := weather.EvaluateAlerts(context.Background(), app, now.Add(2*time.Hour)); err != nil {
		t.Fatal(err)
	}
	if reopened := alertsIn(t, app, "status = 'open'"); len(reopened) != 0 {
		t.Fatalf("un'allerta presa in carico e' stata riaperta: %d", len(reopened))
	}

	// Four days later the day has passed and the alert must be closed out.
	if err := weather.EvaluateAlerts(context.Background(), app, now.AddDate(0, 0, 4)); err != nil {
		t.Fatal(err)
	}
	if expired := alertsIn(t, app, "status = 'expired'"); len(expired) != 1 {
		t.Fatalf("attesa 1 allerta scaduta, ottenute %d", len(expired))
	}
}

func TestEvaluateAlertsIgnoresDaysBeyondTheHorizon(t *testing.T) {
	app := newTestApp(t)
	now := time.Date(2026, 9, 9, 6, 0, 0, 0, time.UTC)
	place := seedPlace(t, app)

	location, err := time.LoadLocation("Europe/Rome")
	if err != nil {
		t.Skipf("tzdata non disponibile: %v", err)
	}
	// Same storm, but six days out: the seeded rule has a three-day horizon.
	far := now.In(location).AddDate(0, 0, 6).Format("2006-01-02")
	payload, err := json.Marshal(weather.Forecast{
		UpdatedAt: now.UTC(),
		TimeZone:  "Europe/Rome",
		Days:      []weather.ForecastDay{{Date: far, Precipitation: 33.9, MaxWind: 6.9, Symbol: "heavyrain"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	collection, err := app.FindCollectionByNameOrId("weather_forecasts")
	if err != nil {
		t.Fatal(err)
	}
	record := core.NewRecord(collection)
	record.Set("place", place.Id)
	record.Set("payload", string(payload))
	record.Set("expires_at", now.Add(30*time.Minute).UTC())
	if err := app.Save(record); err != nil {
		t.Fatal(err)
	}

	if err := weather.EvaluateAlerts(context.Background(), app, now); err != nil {
		t.Fatal(err)
	}
	if raised := alertsIn(t, app, ""); len(raised) != 0 {
		t.Fatalf("allerta generata fuori orizzonte: %d", len(raised))
	}
}

func TestEvaluateAlertsSkipsUnresolvedPlaces(t *testing.T) {
	app := newTestApp(t)
	now := time.Date(2026, 9, 9, 6, 0, 0, 0, time.UTC)

	collection, err := app.FindCollectionByNameOrId("geo_places")
	if err != nil {
		t.Fatal(err)
	}
	pending := core.NewRecord(collection)
	pending.Set("label", "Indirizzo in coda")
	pending.Set("query", "Indirizzo in coda")
	pending.Set("query_hash", "hash-pending")
	pending.Set("source", "photon")
	if err := app.Save(pending); err != nil {
		t.Fatal(err)
	}
	seedForecast(t, app, pending, now)

	if err := weather.EvaluateAlerts(context.Background(), app, now); err != nil {
		t.Fatal(err)
	}
	if raised := alertsIn(t, app, ""); len(raised) != 0 {
		t.Fatalf("allerta su un luogo non geocodificato: %d", len(raised))
	}
}

func TestBackfillLinksExistingRecordsAndIsIdempotent(t *testing.T) {
	app := newTestApp(t)

	organizations, err := app.FindCollectionByNameOrId("organizations")
	if err != nil {
		t.Fatal(err)
	}
	// Two customers at the same address, plus one with none: the shared address
	// must produce a single place, and the empty one must be left alone.
	for _, name := range []string{"Ferri & Co.", "Ferri Cantieri"} {
		record := core.NewRecord(organizations)
		record.Set("name", name)
		record.Set("address", "Via Roma 12, Grottaferrata")
		record.Set("status", "active")
		if err := app.Save(record); err != nil {
			t.Fatal(err)
		}
	}
	blank := core.NewRecord(organizations)
	blank.Set("name", "Senza indirizzo")
	blank.Set("status", "prospect")
	if err := app.Save(blank); err != nil {
		t.Fatal(err)
	}

	// No geocoder: the backfill must still queue the places.
	result, err := weather.Backfill(context.Background(), app, weather.NewGeocoderFromEnv(), false)
	if err != nil {
		t.Fatal(err)
	}
	if result.Linked != 2 {
		t.Fatalf("collegati %d record, attesi 2", result.Linked)
	}

	places, err := app.FindRecordsByFilter("geo_places", "", "created", 10, 0, dbx.Params{})
	if err != nil {
		t.Fatal(err)
	}
	if len(places) != 1 {
		t.Fatalf("attesa 1 riga geo_places condivisa, ottenute %d", len(places))
	}
	if places[0].GetString("query") != "Via Roma 12, Grottaferrata" {
		t.Fatalf("query = %q", places[0].GetString("query"))
	}

	// Running it again must change nothing.
	again, err := weather.Backfill(context.Background(), app, weather.NewGeocoderFromEnv(), false)
	if err != nil {
		t.Fatal(err)
	}
	if again.Linked != 0 || again.Skipped != 2 {
		t.Fatalf("seconda passata: collegati %d, invariati %d", again.Linked, again.Skipped)
	}
}

func TestActivePlacesIncludeJobsAlreadyUnderWay(t *testing.T) {
	app := newTestApp(t)
	place := seedPlace(t, app)

	items, err := app.FindCollectionByNameOrId("work_items")
	if err != nil {
		t.Fatal(err)
	}
	organizations, err := app.FindCollectionByNameOrId("organizations")
	if err != nil {
		t.Fatal(err)
	}
	customer := core.NewRecord(organizations)
	customer.Set("name", "Officine Aurora")
	customer.Set("status", "active")
	if err := app.Save(customer); err != nil {
		t.Fatal(err)
	}

	// Started four days ago and still open: the crew is on site today, so the
	// weather there matters even though the start date is outside the window.
	running := core.NewRecord(items)
	running.Set("code", "WI-001")
	running.Set("title", "Sopralluogo preliminare")
	running.Set("kind", "intervention")
	running.Set("status", "in_progress")
	running.Set("priority", "normal")
	running.Set("organization", customer.Id)
	running.Set("start_at", time.Now().AddDate(0, 0, -4))
	running.Set("place", place.Id)
	if err := app.Save(running); err != nil {
		t.Fatal(err)
	}

	ids, err := weather.ActivePlaceIDs(app, 8*24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Contains(ids, place.Id) {
		t.Fatal("un cantiere in corso deve mantenere attivo il suo luogo")
	}

	// A cancelled job must not keep anything warm.
	running.Set("status", "cancelled")
	if err := app.Save(running); err != nil {
		t.Fatal(err)
	}
	ids, err = weather.ActivePlaceIDs(app, 8*24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if slices.Contains(ids, place.Id) {
		t.Fatal("un intervento annullato non deve tenere attivo il luogo")
	}
}
