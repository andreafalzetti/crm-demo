package weather

import (
	"context"
	"fmt"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

const alertListLimit = 100

var italianWeekdays = [...]string{"domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"}

var italianMonths = [...]string{
	"gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
	"luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
}

// metricLabels name the measure in the alert text, with the unit the operator
// reads on the card.
var metricLabels = map[string]struct {
	name string
	unit string
}{
	"precipitation_mm": {"pioggia", "mm"},
	"wind_ms":          {"vento", "m/s"},
	"temp_min":         {"minima", "°C"},
	"temp_max":         {"massima", "°C"},
}

// metricValue extracts the measure a rule watches. The second return says
// whether the day carries that measure at all: a day without a temperature must
// not be read as a day at zero degrees.
func metricValue(day ForecastDay, metric string) (float64, bool) {
	switch metric {
	case "precipitation_mm":
		return day.Precipitation, true
	case "wind_ms":
		return day.MaxWind, true
	case "temp_min":
		if day.MinTemp == nil {
			return 0, false
		}
		return *day.MinTemp, true
	case "temp_max":
		if day.MaxTemp == nil {
			return 0, false
		}
		return *day.MaxTemp, true
	default:
		return 0, false
	}
}

func breaches(value, threshold float64, operator string) bool {
	switch operator {
	case "gte":
		return value >= threshold
	case "lte":
		return value <= threshold
	default:
		return false
	}
}

// EvaluateAlerts walks the enabled rules over the cached forecasts. It never
// calls MET: a network problem must not be able to invent or suppress an alert.
func EvaluateAlerts(ctx context.Context, app core.App, now time.Time) error {
	rules, err := app.FindRecordsByFilter("weather_alert_rules", "enabled = true", "name", 100, 0, dbx.Params{})
	if err != nil {
		return err
	}
	if len(rules) == 0 {
		return expireStaleAlerts(app, now)
	}

	workItemsByPlace, err := scheduledWorkItemsByPlace(app, now)
	if err != nil {
		return err
	}

	for _, rule := range rules {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		placeIDs, err := placesInScope(app, rule.GetString("scope"), workItemsByPlace)
		if err != nil {
			return err
		}
		for _, placeID := range placeIDs {
			place, err := app.FindRecordById("geo_places", placeID)
			if err != nil || !placeIsResolved(place) {
				continue
			}
			forecast, _, err := cachedForecast(app, placeID)
			if err != nil || forecast == nil {
				continue
			}
			if err := evaluateRuleForPlace(app, rule, place, forecast, workItemsByPlace[placeID], now); err != nil {
				app.Logger().Error("alert evaluation failed", "error", err, "rule", rule.Id, "place", placeID)
			}
		}
	}
	return expireStaleAlerts(app, now)
}

func evaluateRuleForPlace(app core.App, rule *core.Record, place *core.Record, forecast *Forecast, workItemID string, now time.Time) error {
	location := placeLocation(place)
	horizon := rule.GetInt("horizon_days")
	if horizon <= 0 {
		horizon = 1
	}
	today := now.In(location).Format("2006-01-02")
	limit := now.In(location).AddDate(0, 0, horizon).Format("2006-01-02")

	metric := rule.GetString("metric")
	threshold := rule.GetFloat("threshold")
	operator := rule.GetString("operator")

	for _, day := range forecast.Days {
		// Compare on the date string: both sides are already local calendar
		// days, so no timezone conversion can slip in here.
		if day.Date < today || day.Date > limit {
			continue
		}
		value, ok := metricValue(day, metric)
		if !ok || !breaches(value, threshold, operator) {
			continue
		}
		if err := upsertAlert(app, rule, place, day, value, workItemID, location); err != nil {
			return err
		}
	}
	return nil
}

// upsertAlert is idempotent by dedup_key, so a rerun of the daily job refreshes
// the numbers instead of piling up duplicates. An alert already acknowledged
// stays acknowledged.
func upsertAlert(app core.App, rule *core.Record, place *core.Record, day ForecastDay, value float64, workItemID string, location *time.Location) error {
	dedupKey := fmt.Sprintf("%s:%s:%s", rule.Id, place.Id, day.Date)
	record, err := app.FindFirstRecordByData("weather_alerts", "dedup_key", dedupKey)
	if err != nil {
		collection, err := app.FindCollectionByNameOrId("weather_alerts")
		if err != nil {
			return err
		}
		record = core.NewRecord(collection)
		record.Set("dedup_key", dedupKey)
		record.Set("status", "open")
	}

	parsedDay, err := parseDay(day.Date, location)
	if err != nil {
		return err
	}
	record.Set("rule", rule.Id)
	record.Set("place", place.Id)
	record.Set("day", parsedDay)
	record.Set("severity", rule.GetString("severity"))
	record.Set("headline", buildHeadline(rule, place, day, value, location))
	record.Set("detail", map[string]any{
		"metric":        rule.GetString("metric"),
		"value":         value,
		"threshold":     rule.GetFloat("threshold"),
		"symbol":        day.Symbol,
		"precipitation": day.Precipitation,
		"maxWind":       day.MaxWind,
		"minTemp":       day.MinTemp,
		"maxTemp":       day.MaxTemp,
	})
	if workItemID != "" && record.Collection().Fields.GetByName("work_item") != nil {
		record.Set("work_item", workItemID)
	}
	if record.GetString("status") == "expired" {
		record.Set("status", "open")
	}
	return app.Save(record)
}

func buildHeadline(rule *core.Record, place *core.Record, day ForecastDay, value float64, location *time.Location) string {
	label := metricLabels[rule.GetString("metric")]
	when := day.Date
	if parsed, err := time.ParseInLocation("2006-01-02", day.Date, location); err == nil {
		when = fmt.Sprintf("%s %d %s", italianWeekdays[int(parsed.Weekday())], parsed.Day(), italianMonths[int(parsed.Month())-1])
	}
	where := place.GetString("municipality")
	if where == "" {
		where = place.GetString("label")
	}
	return fmt.Sprintf("%s: %s %g %s %s a %s", rule.GetString("name"), label.name, value, label.unit, when, where)
}

// expireStaleAlerts closes alerts whose day has passed, so the badge on the
// dashboard reflects what is still ahead.
func expireStaleAlerts(app core.App, now time.Time) error {
	stale, err := app.FindRecordsByFilter(
		"weather_alerts",
		"status != 'expired' && day < {:today}",
		"day",
		alertListLimit,
		0,
		dbx.Params{"today": now.UTC().Format("2006-01-02 00:00:00.000Z")},
	)
	if err != nil {
		return err
	}
	for _, alert := range stale {
		alert.Set("status", "expired")
		if err := app.Save(alert); err != nil {
			return err
		}
	}
	return nil
}

// scheduledWorkItemsByPlace links a place to the job that makes it interesting,
// so an alert can point straight at the site.
func scheduledWorkItemsByPlace(app core.App, now time.Time) (map[string]string, error) {
	result := map[string]string{}
	if _, err := app.FindCollectionByNameOrId("work_items"); err != nil {
		return result, nil
	}
	items, err := app.FindRecordsByFilter(
		"work_items",
		"place != '' && (status = 'in_progress' || (status = 'planned' && start_at >= {:from} && start_at <= {:to}))",
		"start_at",
		500,
		0,
		dbx.Params{
			"from": now.Add(-24 * time.Hour).UTC().Format(time.RFC3339),
			"to":   now.Add(forecastWindow).UTC().Format(time.RFC3339),
		},
	)
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		placeID := item.GetString("place")
		if placeID != "" {
			if _, seen := result[placeID]; !seen {
				result[placeID] = item.Id
			}
		}
	}
	return result, nil
}

func placesInScope(app core.App, scope string, workItemsByPlace map[string]string) ([]string, error) {
	switch scope {
	case "work_items":
		ids := make([]string, 0, len(workItemsByPlace))
		for id := range workItemsByPlace {
			ids = append(ids, id)
		}
		return ids, nil
	case "organizations":
		if _, err := app.FindCollectionByNameOrId("organizations"); err != nil {
			return nil, nil
		}
		records, err := app.FindRecordsByFilter("organizations", "place != ''", "name", 500, 0, dbx.Params{})
		if err != nil {
			return nil, err
		}
		seen := map[string]bool{}
		ids := []string{}
		for _, record := range records {
			id := record.GetString("place")
			if id != "" && !seen[id] {
				seen[id] = true
				ids = append(ids, id)
			}
		}
		return ids, nil
	default:
		// all_places is scoped to what the cache already holds: a place nobody
		// looked at has no forecast to evaluate anyway.
		records, err := app.FindRecordsByFilter("weather_forecasts", "place != ''", "-updated", 200, 0, dbx.Params{})
		if err != nil {
			return nil, err
		}
		ids := make([]string, 0, len(records))
		for _, record := range records {
			if id := record.GetString("place"); id != "" {
				ids = append(ids, id)
			}
		}
		return ids, nil
	}
}

func openAlerts(app core.App, limit int) ([]*core.Record, error) {
	return app.FindRecordsByFilter("weather_alerts", "status = 'open'", "day", limit, 0, dbx.Params{})
}

// alertSummaries renders open alerts as short lines for the assistant context.
func alertSummaries(app core.App, limit int) []string {
	alerts, err := openAlerts(app, limit)
	if err != nil {
		return nil
	}
	summaries := make([]string, 0, len(alerts))
	for _, alert := range alerts {
		summaries = append(summaries, alert.GetString("headline"))
	}
	return summaries
}
