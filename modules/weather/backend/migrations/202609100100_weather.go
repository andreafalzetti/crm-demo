package migrations

import (
	"github.com/designferri/crm-demo/internal/platform"
	weather "github.com/designferri/crm-demo/modules/weather/backend"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

// linkedCollections carry a geo_places relation when their module is installed.
// The weather module declares them as optional dependencies, so a CRM built
// without work-items must still migrate cleanly.
var linkedCollections = []string{"organizations", "work_items"}

func init() {
	m.Register(func(app core.App) error {
		places := core.NewBaseCollection("geo_places")
		places.Fields.Add(
			&core.TextField{Name: "label", Required: true, Max: 250, Presentable: true},
			&core.TextField{Name: "query", Required: true, Max: 300},
			&core.TextField{Name: "query_hash", Required: true, Max: 32},
			&core.NumberField{Name: "latitude"},
			&core.NumberField{Name: "longitude"},
			&core.TextField{Name: "municipality", Max: 120},
			&core.TextField{Name: "province", Max: 120},
			&core.TextField{Name: "postcode", Max: 16},
			&core.TextField{Name: "country_code", Max: 2},
			&core.NumberField{Name: "elevation"},
			&core.TextField{Name: "timezone", Max: 64},
			&core.SelectField{Name: "source", Values: []string{"photon", "manual", "geolocation"}, MaxSelect: 1, Required: true},
			&core.DateField{Name: "resolved_at"},
			&core.TextField{Name: "failed_reason", Max: 500},
		)
		platform.AddTimestamps(places)
		places.ListRule = platform.PermissionRule("weather.forecast.read")
		places.ViewRule = places.ListRule
		places.CreateRule = platform.PermissionRule("weather.places.manage")
		places.UpdateRule = places.CreateRule
		places.DeleteRule = places.CreateRule
		places.Indexes = append(places.Indexes,
			"CREATE UNIQUE INDEX idx_geo_places_hash ON geo_places (query_hash)",
			// Pending rows are the geocoder worker's queue; the partial index keeps
			// that scan cheap as resolved places accumulate.
			"CREATE INDEX idx_geo_places_pending ON geo_places (created) WHERE resolved_at = ''",
		)
		if err := app.Save(places); err != nil {
			return err
		}

		forecasts := core.NewBaseCollection("weather_forecasts")
		forecasts.Fields.Add(
			&core.RelationField{Name: "place", CollectionId: places.Id, MinSelect: 1, MaxSelect: 1, Required: true, CascadeDelete: true},
			&core.JSONField{Name: "payload", MaxSize: 512 * 1024},
			&core.DateField{Name: "model_run"},
			// Stored verbatim: the MET terms require echoing the exact previous
			// Last-Modified value back in If-Modified-Since.
			&core.TextField{Name: "last_modified", Max: 64},
			&core.DateField{Name: "expires_at"},
			&core.DateField{Name: "fetched_at"},
			&core.TextField{Name: "fetch_error", Max: 500},
		)
		platform.AddTimestamps(forecasts)
		forecasts.ListRule = platform.PermissionRule("weather.forecast.read")
		forecasts.ViewRule = forecasts.ListRule
		forecasts.Indexes = append(forecasts.Indexes,
			"CREATE UNIQUE INDEX idx_weather_forecasts_place ON weather_forecasts (place)",
		)
		if err := app.Save(forecasts); err != nil {
			return err
		}

		rules := core.NewBaseCollection("weather_alert_rules")
		rules.Fields.Add(
			&core.TextField{Name: "name", Required: true, Max: 120, Presentable: true},
			&core.BoolField{Name: "enabled"},
			&core.SelectField{Name: "metric", Values: []string{"precipitation_mm", "wind_ms", "temp_min", "temp_max"}, MaxSelect: 1, Required: true},
			&core.SelectField{Name: "operator", Values: []string{"gte", "lte"}, MaxSelect: 1, Required: true},
			// Not Required: PocketBase treats a zero number as blank, and zero is a
			// legitimate threshold (overnight frost is temp_min <= 0).
			&core.NumberField{Name: "threshold"},
			&core.NumberField{Name: "horizon_days", Required: true, OnlyInt: true, Min: pointer(1.0), Max: pointer(7.0)},
			&core.SelectField{Name: "scope", Values: []string{"work_items", "organizations", "all_places"}, MaxSelect: 1, Required: true},
			&core.SelectField{Name: "severity", Values: []string{"info", "warning", "critical"}, MaxSelect: 1, Required: true},
		)
		platform.AddTimestamps(rules)
		rules.ListRule = platform.PermissionRule("weather.rules.read")
		rules.ViewRule = rules.ListRule
		rules.CreateRule = platform.PermissionRule("weather.rules.manage")
		rules.UpdateRule = rules.CreateRule
		rules.DeleteRule = rules.CreateRule
		if err := app.Save(rules); err != nil {
			return err
		}

		alerts := core.NewBaseCollection("weather_alerts")
		alerts.Fields.Add(
			&core.RelationField{Name: "rule", CollectionId: rules.Id, MaxSelect: 1, CascadeDelete: true},
			&core.RelationField{Name: "place", CollectionId: places.Id, MinSelect: 1, MaxSelect: 1, Required: true, CascadeDelete: true},
			&core.DateField{Name: "day", Required: true},
			&core.TextField{Name: "dedup_key", Required: true, Max: 120},
			&core.SelectField{Name: "severity", Values: []string{"info", "warning", "critical"}, MaxSelect: 1, Required: true},
			&core.TextField{Name: "headline", Required: true, Max: 300, Presentable: true},
			&core.JSONField{Name: "detail", MaxSize: 16 * 1024},
			&core.SelectField{Name: "status", Values: []string{"open", "acknowledged", "expired"}, MaxSelect: 1, Required: true},
		)
		platform.AddTimestamps(alerts)
		alerts.ListRule = platform.PermissionRule("weather.alerts.read")
		alerts.ViewRule = alerts.ListRule
		alerts.UpdateRule = platform.PermissionRule("weather.alerts.acknowledge")
		alerts.Indexes = append(alerts.Indexes,
			"CREATE UNIQUE INDEX idx_weather_alerts_dedup ON weather_alerts (dedup_key)",
			"CREATE INDEX idx_weather_alerts_open ON weather_alerts (status, day)",
		)
		if err := app.Save(alerts); err != nil {
			return err
		}

		// work_items gains an optional relation to the alert, so a site manager
		// opening the job sees the warning without a second lookup.
		if items, err := app.FindCollectionByNameOrId("work_items"); err == nil {
			alerts.Fields.Add(&core.RelationField{Name: "work_item", CollectionId: items.Id, MaxSelect: 1, CascadeDelete: true})
			if err := app.Save(alerts); err != nil {
				return err
			}
		}

		for _, name := range linkedCollections {
			collection, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				continue
			}
			if collection.Fields.GetByName("place") != nil {
				continue
			}
			collection.Fields.Add(&core.RelationField{Name: "place", CollectionId: places.Id, MaxSelect: 1})
			if err := app.Save(collection); err != nil {
				return err
			}
		}

		if err := seedDefaultRules(app, rules); err != nil {
			return err
		}

		ids, err := platform.EnsurePermissions(app, weather.Permissions)
		if err != nil {
			return err
		}
		all := make([]string, 0, len(ids))
		operator := make([]string, 0, len(ids))
		for key, id := range ids {
			all = append(all, id)
			// Operators consume the weather; they do not retune the thresholds
			// or repair geocoding.
			if key != "weather.rules.manage" && key != "weather.places.manage" {
				operator = append(operator, id)
			}
		}
		if err := platform.AddRolePermissions(app, "administrator", all...); err != nil {
			return err
		}
		if err := platform.AddRolePermissions(app, "manager", all...); err != nil {
			return err
		}
		return platform.AddRolePermissions(app, "operator", operator...)
	}, func(app core.App) error {
		for _, name := range linkedCollections {
			collection, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				continue
			}
			if field := collection.Fields.GetByName("place"); field != nil {
				collection.Fields.RemoveByName("place")
				if err := app.Save(collection); err != nil {
					return err
				}
			}
		}
		for _, name := range []string{"weather_alerts", "weather_alert_rules", "weather_forecasts", "geo_places"} {
			collection, err := app.FindCollectionByNameOrId(name)
			if err == nil {
				if err := app.Delete(collection); err != nil {
					return err
				}
			}
		}
		for _, permission := range weather.Permissions {
			record, err := app.FindFirstRecordByData("permissions", "key", permission.Key)
			if err == nil {
				if err := app.Delete(record); err != nil {
					return err
				}
			}
		}
		return nil
	})
}

// seedDefaultRules gives the module something to say on first boot. Without a
// rule the alert engine is inert and the feature looks broken.
func seedDefaultRules(app core.App, collection *core.Collection) error {
	defaults := []struct {
		name      string
		metric    string
		operator  string
		threshold float64
		horizon   int
		severity  string
	}{
		{"Pioggia intensa", "precipitation_mm", "gte", 20, 3, "warning"},
		{"Vento forte", "wind_ms", "gte", 12, 3, "warning"},
		{"Gelo notturno", "temp_min", "lte", 0, 3, "info"},
	}
	for _, definition := range defaults {
		if _, err := app.FindFirstRecordByData(collection, "name", definition.name); err == nil {
			continue
		}
		record := core.NewRecord(collection)
		record.Set("name", definition.name)
		record.Set("enabled", true)
		record.Set("metric", definition.metric)
		record.Set("operator", definition.operator)
		record.Set("threshold", definition.threshold)
		record.Set("horizon_days", definition.horizon)
		record.Set("scope", "all_places")
		record.Set("severity", definition.severity)
		if err := app.Save(record); err != nil {
			return err
		}
	}
	return nil
}

func pointer[T any](value T) *T { return &value }
