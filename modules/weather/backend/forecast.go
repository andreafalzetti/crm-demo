package weather

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

const (
	defaultTimeZone = "Europe/Rome"

	// refreshPause spaces out upstream calls. MET allows 20 req/s per
	// application; a quarter second between places leaves two orders of
	// magnitude of headroom and keeps the CRM a good citizen.
	refreshPause = 250 * time.Millisecond

	refreshBatchSize = 40
)

// placeLocation resolves the timezone a place's days are counted in. Getting
// this wrong shifts every daily total by a few hours and mislabels the day an
// operator is warned about.
func placeLocation(place *core.Record) *time.Location {
	name := place.GetString("timezone")
	if name == "" {
		name = defaultTimeZone
	}
	location, err := time.LoadLocation(name)
	if err != nil {
		return time.UTC
	}
	return location
}

// cachedForecast returns the stored forecast for a place, or nil when nothing
// has been fetched yet.
func cachedForecast(app core.App, placeID string) (*Forecast, *core.Record, error) {
	record, err := app.FindFirstRecordByData("weather_forecasts", "place", placeID)
	if err != nil {
		return nil, nil, nil
	}
	raw := record.GetString("payload")
	if raw == "" {
		return nil, record, nil
	}
	var forecast Forecast
	if err := json.Unmarshal([]byte(raw), &forecast); err != nil {
		return nil, record, err
	}
	return &forecast, record, nil
}

// refreshPlace fetches a place's forecast unless the cached copy is still
// within its Expires window, which the MET terms make binding.
func refreshPlace(ctx context.Context, app core.App, client *MetClient, place *core.Record, force bool) error {
	if !client.Configured() {
		return errors.New("meteo: client non configurato")
	}
	if !placeIsResolved(place) {
		return nil
	}

	_, existing, _ := cachedForecast(app, place.Id)
	lastModified := ""
	if existing != nil {
		lastModified = existing.GetString("last_modified")
		if !force {
			if expires := existing.GetDateTime("expires_at"); !expires.IsZero() && expires.Time().After(time.Now()) {
				return nil
			}
		}
	}

	result, err := client.Fetch(
		ctx,
		place.GetFloat("latitude"),
		place.GetFloat("longitude"),
		place.GetFloat("elevation"),
		placeLocation(place),
		lastModified,
	)
	if err != nil {
		if existing != nil {
			// Record the failure without discarding a forecast that is merely
			// stale: an old forecast beats an empty card.
			existing.Set("fetch_error", err.Error())
			if saveErr := app.Save(existing); saveErr != nil {
				app.Logger().Error("unable to record forecast failure", "error", saveErr, "place", place.Id)
			}
		}
		return err
	}

	record := existing
	if record == nil {
		collection, err := app.FindCollectionByNameOrId("weather_forecasts")
		if err != nil {
			return err
		}
		record = core.NewRecord(collection)
		record.Set("place", place.Id)
	}
	record.Set("fetched_at", types.NowDateTime())
	record.Set("fetch_error", "")
	if result.LastModified != "" {
		record.Set("last_modified", result.LastModified)
	}
	if !result.ExpiresAt.IsZero() {
		record.Set("expires_at", result.ExpiresAt)
	}
	if result.Forecast != nil {
		payload, err := json.Marshal(result.Forecast)
		if err != nil {
			return err
		}
		record.Set("payload", string(payload))
		record.Set("model_run", result.Forecast.UpdatedAt)
	}
	return app.Save(record)
}

// forecastForPlace serves a read: it returns the cached forecast and refreshes
// it first only when the cache is empty or expired.
func forecastForPlace(ctx context.Context, app core.App, client *MetClient, place *core.Record) (*Forecast, error) {
	forecast, record, _ := cachedForecast(app, place.Id)
	fresh := record != nil && !record.GetDateTime("expires_at").IsZero() && record.GetDateTime("expires_at").Time().After(time.Now())
	if forecast != nil && fresh {
		return forecast, nil
	}
	if err := refreshPlace(ctx, app, client, place, false); err != nil {
		// A stale forecast is still worth showing; only an empty cache is an error.
		if forecast != nil {
			return forecast, nil
		}
		return nil, err
	}
	forecast, _, err := cachedForecast(app, place.Id)
	if err != nil {
		return nil, err
	}
	if forecast == nil {
		return nil, errors.New("meteo: previsione non disponibile")
	}
	return forecast, nil
}

// RefreshActivePlaces is the scheduled job. It stops on the first throttling
// signal rather than pushing MET further.
func RefreshActivePlaces(ctx context.Context, app core.App, client *MetClient) error {
	if !client.Configured() {
		return nil
	}
	ids, err := activePlaceIDs(app, forecastWindow)
	if err != nil {
		return err
	}
	if len(ids) > refreshBatchSize {
		ids = ids[:refreshBatchSize]
	}
	for _, id := range ids {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		place, err := app.FindRecordById("geo_places", id)
		if err != nil || !placeIsResolved(place) {
			continue
		}
		if err := refreshPlace(ctx, app, client, place, false); err != nil {
			if errors.Is(err, ErrThrottled) || errors.Is(err, ErrRejected) {
				app.Logger().Error("weather refresh halted by upstream", "error", err)
				return err
			}
			app.Logger().Warn("weather refresh failed for place", "error", err, "place", id)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(refreshPause):
		}
	}
	return nil
}

// nearbyPlace finds an already known place within roughly a kilometre of a
// browser-supplied position, so a moving device does not spawn a new row and a
// new upstream fetch on every dashboard load.
func nearbyPlace(app core.App, latitude, longitude float64) (*core.Record, error) {
	const delta = 0.01 // ~1.1 km of latitude, less of longitude at Italian latitudes
	records, err := app.FindRecordsByFilter(
		"geo_places",
		"resolved_at != '' && latitude >= {:minLat} && latitude <= {:maxLat} && longitude >= {:minLon} && longitude <= {:maxLon}",
		"-updated",
		1,
		0,
		dbx.Params{
			"minLat": latitude - delta,
			"maxLat": latitude + delta,
			"minLon": longitude - delta,
			"maxLon": longitude + delta,
		},
	)
	if err != nil || len(records) == 0 {
		return nil, err
	}
	return records[0], nil
}
