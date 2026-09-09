package weather

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// addressFields maps a collection to the field holding its free-text address.
// Adding a collection here is all it takes to geolocate another entity.
var addressFields = map[string]string{
	"organizations": "address",
	"work_items":    "location",
}

// ensurePlace returns the geo_places row for an address, creating it in a
// pending state when it is new. It never touches the network: record saves must
// not block on an external geocoder, so resolution is left to the worker.
func ensurePlace(app core.App, query string) (*core.Record, error) {
	hash := queryHash(query)
	if hash == "" {
		return nil, nil
	}
	if existing, err := app.FindFirstRecordByData("geo_places", "query_hash", hash); err == nil {
		return existing, nil
	}

	collection, err := app.FindCollectionByNameOrId("geo_places")
	if err != nil {
		return nil, err
	}
	query = strings.TrimSpace(query)
	if len(query) > 300 {
		query = query[:300]
	}
	record := core.NewRecord(collection)
	record.Set("label", query)
	record.Set("query", query)
	record.Set("query_hash", hash)
	record.Set("source", "photon")
	if err := app.Save(record); err != nil {
		// A concurrent save may have won the unique index on query_hash; the
		// row it created is just as good as ours.
		if existing, lookupErr := app.FindFirstRecordByData("geo_places", "query_hash", hash); lookupErr == nil {
			return existing, nil
		}
		return nil, err
	}
	return record, nil
}

// ResolvePendingPlaces drains the geocoding queue. It is deliberately serial and
// bounded: the geocoder is a shared service and a burst of new work items must
// not turn into a burst of upstream requests.
func ResolvePendingPlaces(ctx context.Context, app core.App, geocoder *Geocoder, limit int) error {
	if !geocoder.Configured() {
		return nil
	}
	pending, err := app.FindRecordsByFilter("geo_places", "resolved_at = '' && failed_reason = ''", "created", limit, 0, dbx.Params{})
	if err != nil {
		return err
	}
	for _, place := range pending {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if err := resolvePlace(ctx, app, geocoder, place); err != nil {
			app.Logger().Warn("geocoding deferred", "error", err, "place", place.Id)
		}
	}
	return nil
}

// resolvePlace geocodes a single pending row. A definitive "not found" is
// recorded so the worker stops retrying it; anything else leaves the row pending
// so a transient outage resolves itself on the next run.
func resolvePlace(ctx context.Context, app core.App, geocoder *Geocoder, place *core.Record) error {
	if !geocoder.Configured() || placeIsResolved(place) {
		return nil
	}
	result, err := geocoder.Lookup(ctx, place.GetString("query"))
	if err != nil {
		if errors.Is(err, ErrPlaceNotFound) {
			place.Set("failed_reason", err.Error())
			if saveErr := app.Save(place); saveErr != nil {
				return saveErr
			}
			return nil
		}
		return err
	}
	applyGeocodeResult(place, result)
	return app.Save(place)
}

func applyGeocodeResult(place *core.Record, result GeocodeResult) {
	if result.Label != "" {
		place.Set("label", result.Label)
	}
	place.Set("latitude", result.Latitude)
	place.Set("longitude", result.Longitude)
	place.Set("municipality", result.Municipality)
	place.Set("province", result.Province)
	place.Set("postcode", result.Postcode)
	place.Set("country_code", result.CountryCode)
	place.Set("resolved_at", types.NowDateTime())
	place.Set("failed_reason", "")
}

// placeIsResolved reports whether a row carries usable coordinates. A pending or
// failed place must never reach the forecast client.
func placeIsResolved(place *core.Record) bool {
	if place == nil || place.GetDateTime("resolved_at").IsZero() {
		return false
	}
	return validCoordinates(place.GetFloat("latitude"), place.GetFloat("longitude"))
}

// bindAddressHooks keeps the place relation in sync with the address the user
// typed, on every collection that declares one.
func bindAddressHooks(app core.App, collection string) func(*core.RecordRequestEvent) error {
	field := addressFields[collection]
	return func(e *core.RecordRequestEvent) error {
		address := strings.TrimSpace(e.Record.GetString(field))
		if address == "" {
			e.Record.Set("place", "")
			return e.Next()
		}
		place, err := ensurePlace(e.App, address)
		if err != nil {
			// Geolocation is an enrichment: never fail the user's save for it.
			e.App.Logger().Error("unable to attach place", "error", err, "collection", collection)
			return e.Next()
		}
		if place != nil {
			e.Record.Set("place", place.Id)
		}
		return e.Next()
	}
}

// ActivePlaceIDs lists the places worth spending a forecast request on: those
// attached to a job scheduled in the window, plus any place explicitly asked for
// recently. Everything else stays cold.
func ActivePlaceIDs(app core.App, window time.Duration) ([]string, error) {
	seen := map[string]bool{}
	ids := []string{}

	if _, err := app.FindCollectionByNameOrId("work_items"); err == nil {
		// A job already under way is relevant whatever its start date: the crew
		// is on site today, and the start-date window alone was dropping jobs
		// that began more than a day ago.
		items, err := app.FindRecordsByFilter(
			"work_items",
			"place != '' && (status = 'in_progress' || (status = 'planned' && start_at >= {:from} && start_at <= {:to}))",
			"start_at",
			500,
			0,
			dbx.Params{
				"from": types.NowDateTime().Time().Add(-24 * time.Hour).UTC().Format(time.RFC3339),
				"to":   types.NowDateTime().Time().Add(window).UTC().Format(time.RFC3339),
			},
		)
		if err != nil {
			return nil, err
		}
		for _, item := range items {
			id := item.GetString("place")
			if id != "" && !seen[id] {
				seen[id] = true
				ids = append(ids, id)
			}
		}
	}

	// Customer sites are a bounded, deliberate set, and the alert rules scoped to
	// organizations have nothing to read without them. Leaving them out created a
	// cold start with no way through: a place with no forecast was never active,
	// so it never got its first forecast.
	if _, err := app.FindCollectionByNameOrId("organizations"); err == nil {
		organizations, err := app.FindRecordsByFilter("organizations", "place != '' && status != 'archived'", "name", 200, 0, dbx.Params{})
		if err != nil {
			return nil, err
		}
		for _, organization := range organizations {
			id := organization.GetString("place")
			if id != "" && !seen[id] {
				seen[id] = true
				ids = append(ids, id)
			}
		}
	}

	// Places already carrying a cached forecast stay warm: somebody looked at
	// them, and letting the cache go stale would show them an old model run.
	cached, err := app.FindRecordsByFilter("weather_forecasts", "place != ''", "-updated", 200, 0, dbx.Params{})
	if err != nil {
		return nil, err
	}
	for _, forecast := range cached {
		id := forecast.GetString("place")
		if id != "" && !seen[id] {
			seen[id] = true
			ids = append(ids, id)
		}
	}
	return ids, nil
}
