package assistant

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

// The weather tools read the weather module's collections directly, the same way
// every other tool here reads its domain. Importing the module would couple the
// assistant to it and break instances built without the weather module.

const (
	weatherForecastDays = 7

	// contextAlertLimit keeps the digest short: it travels with every single
	// message, so it must not crowd out the conversation.
	contextAlertLimit = 5
)

type forecastPayload struct {
	UpdatedAt string `json:"updatedAt"`
	TimeZone  string `json:"timeZone"`
	Days      []struct {
		Date          string   `json:"date"`
		MinTemp       *float64 `json:"minTemp"`
		MaxTemp       *float64 `json:"maxTemp"`
		Precipitation float64  `json:"precipitation"`
		MaxWind       float64  `json:"maxWind"`
		Symbol        string   `json:"symbol"`
	} `json:"days"`
}

// weatherForecast answers "che tempo fa al cantiere X". The place can be given
// directly, or derived from the customer or the job the operator is talking about.
func weatherForecast(app core.App, actor *core.Record, args map[string]any) (map[string]any, error) {
	if err := requirePermission(app, actor, "weather.forecast.read"); err != nil {
		return nil, err
	}
	place, err := resolveToolPlace(app, actor, args)
	if err != nil {
		return nil, err
	}
	forecastRecord, err := app.FindFirstRecordByData("weather_forecasts", "place", place.Id)
	if err != nil {
		return nil, errors.New("previsione non ancora disponibile per questo luogo")
	}
	var payload forecastPayload
	if err := json.Unmarshal([]byte(forecastRecord.GetString("payload")), &payload); err != nil {
		return nil, errors.New("previsione illeggibile")
	}

	days := argInt(args, "days", weatherForecastDays)
	if days < 1 {
		days = 1
	}
	if days > weatherForecastDays {
		days = weatherForecastDays
	}
	items := make([]map[string]any, 0, days)
	for _, day := range payload.Days {
		if len(items) == days {
			break
		}
		items = append(items, map[string]any{
			"date":            day.Date,
			"minTemp":         day.MinTemp,
			"maxTemp":         day.MaxTemp,
			"precipitationMm": day.Precipitation,
			"maxWindMs":       day.MaxWind,
			"symbol":          day.Symbol,
		})
	}
	return map[string]any{
		"place": map[string]any{
			"id":           place.Id,
			"label":        place.GetString("label"),
			"municipality": place.GetString("municipality"),
		},
		"timeZone":    payload.TimeZone,
		"modelRun":    payload.UpdatedAt,
		"days":        items,
		"attribution": "MET Norway, CC BY 4.0",
	}, nil
}

// weatherAlerts lists what the nightly evaluation flagged, so the assistant can
// open a conversation with it instead of waiting to be asked.
func weatherAlerts(app core.App, actor *core.Record, args map[string]any) (map[string]any, error) {
	if err := requirePermission(app, actor, "weather.alerts.read"); err != nil {
		return nil, err
	}
	records, err := app.FindRecordsByFilter("weather_alerts", "status = 'open'", "day", 50, 0, dbx.Params{})
	if err != nil {
		return nil, err
	}
	items := make([]map[string]any, 0, len(records))
	for _, record := range records {
		item := map[string]any{
			"id":       record.Id,
			"day":      record.GetDateTime("day").Time().Format("2006-01-02"),
			"severity": record.GetString("severity"),
			"headline": record.GetString("headline"),
		}
		if place, findErr := app.FindRecordById("geo_places", record.GetString("place")); findErr == nil {
			item["place"] = place.GetString("label")
		}
		if workItemID := record.GetString("work_item"); workItemID != "" {
			if workItem, findErr := app.FindRecordById("work_items", workItemID); findErr == nil {
				item["workItem"] = map[string]any{
					"id":    workItem.Id,
					"title": workItem.GetString("title"),
					"link":  "/work-items",
				}
			}
		}
		items = append(items, item)
	}
	return map[string]any{"alerts": items, "count": len(items)}, nil
}

// resolveToolPlace accepts whichever handle the conversation produced: a place,
// a customer, or a job.
func resolveToolPlace(app core.App, actor *core.Record, args map[string]any) (*core.Record, error) {
	if placeID := argString(args, "placeId"); placeID != "" {
		return app.FindRecordById("geo_places", placeID)
	}
	if workItemID := argString(args, "workItemId"); workItemID != "" {
		if err := requirePermission(app, actor, "workitems.items.read"); err != nil {
			return nil, err
		}
		workItem, err := app.FindRecordById("work_items", workItemID)
		if err != nil {
			return nil, errors.New("intervento non trovato")
		}
		if placeID := workItem.GetString("place"); placeID != "" {
			return app.FindRecordById("geo_places", placeID)
		}
		return nil, errors.New("l'intervento non ha un indirizzo geolocalizzato")
	}
	if customerID := argString(args, "customerId"); customerID != "" {
		if err := requirePermission(app, actor, "addressbook.organizations.read"); err != nil {
			return nil, err
		}
		organization, err := app.FindRecordById("organizations", customerID)
		if err != nil {
			return nil, errors.New("cliente non trovato")
		}
		if placeID := organization.GetString("place"); placeID != "" {
			return app.FindRecordById("geo_places", placeID)
		}
		return nil, errors.New("il cliente non ha un indirizzo geolocalizzato")
	}
	// Falling back to a search keeps the tool usable when the operator names the
	// place instead of picking it.
	if query := argString(args, "query"); query != "" {
		records, err := app.FindRecordsByFilter(
			"geo_places",
			"resolved_at != '' && (label ~ {:query} || municipality ~ {:query})",
			"label",
			1,
			0,
			dbx.Params{"query": strings.TrimSpace(query)},
		)
		if err == nil && len(records) > 0 {
			return records[0], nil
		}
		return nil, errors.New("nessun luogo corrisponde alla ricerca")
	}
	return nil, errors.New("indicare placeId, workItemId, customerId oppure query")
}

// openWeatherAlertHeadlines digests the open alerts for the assistant context.
// It degrades to nothing at all: an instance without the weather module, or a
// user without the permission, must still be able to chat.
func openWeatherAlertHeadlines(app core.App, actor *core.Record) []string {
	if actor == nil || !platform.Can(app, actor, "weather.alerts.read") {
		return nil
	}
	if _, err := app.FindCollectionByNameOrId("weather_alerts"); err != nil {
		return nil
	}
	records, err := app.FindRecordsByFilter("weather_alerts", "status = 'open'", "day", contextAlertLimit, 0, dbx.Params{})
	if err != nil {
		return nil
	}
	headlines := make([]string, 0, len(records))
	for _, record := range records {
		if headline := record.GetString("headline"); headline != "" {
			headlines = append(headlines, headline)
		}
	}
	if len(headlines) == 0 {
		return nil
	}
	return headlines
}

func argInt(args map[string]any, key string, fallback int) int {
	switch value := args[key].(type) {
	case float64:
		return int(value)
	case int:
		return value
	default:
		return fallback
	}
}
