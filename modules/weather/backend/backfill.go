package weather

import (
	"context"
	"fmt"
	"strings"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

// BackfillResult reports what one backfill pass did, so the caller can print a
// summary instead of a wall of log lines.
type BackfillResult struct {
	Linked     int
	Resolved   int
	Unresolved int
	Skipped    int
}

// Backfill attaches places to records that already existed when the module was
// installed. The hooks only fire on save, so without this every address entered
// before the module went live would stay invisible to the weather module.
//
// It is idempotent: a record already carrying the right place is counted as
// skipped and left alone.
func Backfill(ctx context.Context, app core.App, geocoder *Geocoder, resolveNow bool) (BackfillResult, error) {
	result := BackfillResult{}

	for collection, field := range addressFields {
		if _, err := app.FindCollectionByNameOrId(collection); err != nil {
			continue
		}
		records, err := app.FindRecordsByFilter(collection, fmt.Sprintf("%s != ''", field), "created", 1000, 0, dbx.Params{})
		if err != nil {
			return result, err
		}
		for _, record := range records {
			if ctx.Err() != nil {
				return result, ctx.Err()
			}
			address := strings.TrimSpace(record.GetString(field))
			place, err := ensurePlace(app, address)
			if err != nil || place == nil {
				result.Skipped++
				continue
			}
			if record.GetString("place") == place.Id {
				result.Skipped++
			} else {
				record.Set("place", place.Id)
				if err := app.Save(record); err != nil {
					return result, err
				}
				result.Linked++
			}
		}
	}

	if !resolveNow || !geocoder.Configured() {
		return result, nil
	}

	// Resolving inline keeps the command useful: an operator running it wants a
	// populated map now, not in five minutes when the worker next wakes up.
	pending, err := app.FindRecordsByFilter("geo_places", "resolved_at = '' && failed_reason = ''", "created", 500, 0, dbx.Params{})
	if err != nil {
		return result, err
	}
	for _, place := range pending {
		if ctx.Err() != nil {
			return result, ctx.Err()
		}
		if err := resolvePlace(ctx, app, geocoder, place); err != nil {
			app.Logger().Warn("backfill geocoding deferred", "error", err, "place", place.Id)
		}
		if placeIsResolved(place) {
			result.Resolved++
		} else {
			result.Unresolved++
		}
	}
	return result, nil
}

// NewGeocoderFromEnv builds the geocoder the CLI commands use, reading the same
// configuration the server does.
func NewGeocoderFromEnv() *Geocoder { return newRuntimeConfig().geocoder }

// NewMetClientFromEnv mirrors NewGeocoderFromEnv for the forecast client.
func NewMetClientFromEnv() *MetClient { return newRuntimeConfig().met }
