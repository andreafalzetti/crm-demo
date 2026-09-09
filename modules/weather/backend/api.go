package weather

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// attribution is required by the CC BY 4.0 licence covering MET Norway data.
// Serving it with every response means no surface can quietly forget it.
const attribution = "Dati meteo: MET Norway (CC BY 4.0)"

type placeView struct {
	ID           string  `json:"id"`
	Label        string  `json:"label"`
	Municipality string  `json:"municipality,omitempty"`
	Province     string  `json:"province,omitempty"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	Resolved     bool    `json:"resolved"`
}

func newPlaceView(place *core.Record) placeView {
	return placeView{
		ID:           place.Id,
		Label:        place.GetString("label"),
		Municipality: place.GetString("municipality"),
		Province:     place.GetString("province"),
		Latitude:     place.GetFloat("latitude"),
		Longitude:    place.GetFloat("longitude"),
		Resolved:     placeIsResolved(place),
	}
}

type forecastResponse struct {
	Place       placeView `json:"place"`
	Forecast    *Forecast `json:"forecast"`
	Attribution string    `json:"attribution"`
}

func (config runtimeConfig) handleForecast(e *core.RequestEvent) error {
	placeID := strings.TrimSpace(e.Request.URL.Query().Get("placeId"))
	if placeID == "" {
		return e.BadRequestError("Indicare il luogo.", nil)
	}
	place, err := e.App.FindRecordById("geo_places", placeID)
	if err != nil {
		return e.NotFoundError("Luogo non trovato.", err)
	}
	return config.respondWithForecast(e, place)
}

// handleForecastByCoords backs the dashboard widget. A browser position is
// snapped to an existing place when one is close by, so a device moving around
// town does not create a row and an upstream fetch on every load.
func (config runtimeConfig) handleForecastByCoords(e *core.RequestEvent) error {
	query := e.Request.URL.Query()
	latitude, latErr := strconv.ParseFloat(strings.TrimSpace(query.Get("lat")), 64)
	longitude, lonErr := strconv.ParseFloat(strings.TrimSpace(query.Get("lon")), 64)
	if latErr != nil || lonErr != nil {
		return e.BadRequestError("Coordinate non valide.", nil)
	}
	latitude = truncateCoordinate(latitude)
	longitude = truncateCoordinate(longitude)
	if !validCoordinates(latitude, longitude) {
		return e.BadRequestError("Coordinate fuori intervallo.", nil)
	}

	if existing, err := nearbyPlace(e.App, latitude, longitude); err == nil && existing != nil {
		return config.respondWithForecast(e, existing)
	}

	place, err := config.createGeolocatedPlace(e.Request.Context(), e.App, latitude, longitude)
	if err != nil {
		return e.InternalServerError("Impossibile registrare la posizione.", err)
	}
	return config.respondWithForecast(e, place)
}

// createGeolocatedPlace stores a browser position as a resolved place. Reverse
// geocoding is best effort: without it the place still works, it just carries
// coordinates instead of a street name.
func (config runtimeConfig) createGeolocatedPlace(ctx context.Context, app core.App, latitude, longitude float64) (*core.Record, error) {
	label := formatCoordinate(latitude) + ", " + formatCoordinate(longitude)
	result := GeocodeResult{Label: label, Latitude: latitude, Longitude: longitude}
	if config.geocoder.Configured() {
		reverseCtx, cancel := context.WithTimeout(ctx, geocoderTimeout)
		defer cancel()
		if reversed, err := config.geocoder.Reverse(reverseCtx, latitude, longitude); err == nil {
			// Keep the device's own coordinates: they are more precise than the
			// centre of whatever feature the geocoder matched.
			reversed.Latitude, reversed.Longitude = latitude, longitude
			result = reversed
		} else if !errors.Is(err, ErrPlaceNotFound) {
			app.Logger().Warn("reverse geocoding failed", "error", err)
		}
	}

	collection, err := app.FindCollectionByNameOrId("geo_places")
	if err != nil {
		return nil, err
	}
	record := core.NewRecord(collection)
	record.Set("query", label)
	record.Set("query_hash", queryHash("geo:"+label))
	record.Set("source", "geolocation")
	applyGeocodeResult(record, result)
	if record.GetString("label") == "" {
		record.Set("label", label)
	}
	if err := app.Save(record); err != nil {
		if existing, lookupErr := app.FindFirstRecordByData("geo_places", "query_hash", queryHash("geo:"+label)); lookupErr == nil {
			return existing, nil
		}
		return nil, err
	}
	return record, nil
}

// handleForecastByAddress backs the widget's fallback to the client's operating
// base. Unlike the scheduled worker it resolves the address inline: this is one
// user-initiated call, and making them wait five minutes for the queue would
// leave the dashboard empty on first load.
func (config runtimeConfig) handleForecastByAddress(e *core.RequestEvent) error {
	query := strings.TrimSpace(e.Request.URL.Query().Get("q"))
	if query == "" {
		return e.BadRequestError("Indicare un indirizzo.", nil)
	}
	place, err := ensurePlace(e.App, query)
	if err != nil || place == nil {
		return e.BadRequestError("Indirizzo non utilizzabile.", err)
	}
	if !placeIsResolved(place) && config.geocoder.Configured() {
		ctx, cancel := context.WithTimeout(e.Request.Context(), geocoderTimeout)
		defer cancel()
		if err := resolvePlace(ctx, e.App, config.geocoder, place); err != nil {
			e.App.Logger().Warn("inline geocoding failed", "error", err, "place", place.Id)
		}
	}
	return config.respondWithForecast(e, place)
}

func (config runtimeConfig) respondWithForecast(e *core.RequestEvent, place *core.Record) error {
	view := newPlaceView(place)
	if !view.Resolved {
		// The place is queued for geocoding: say so instead of pretending the
		// forecast is merely missing.
		return e.JSON(http.StatusOK, forecastResponse{Place: view, Attribution: attribution})
	}
	ctx, cancel := context.WithTimeout(e.Request.Context(), metTimeout+5*time.Second)
	defer cancel()
	forecast, err := forecastForPlace(ctx, e.App, config.met, place)
	if err != nil {
		return e.InternalServerError("Previsione non disponibile.", err)
	}
	return e.JSON(http.StatusOK, forecastResponse{Place: view, Forecast: forecast, Attribution: attribution})
}

type alertView struct {
	ID       string    `json:"id"`
	Day      string    `json:"day"`
	Severity string    `json:"severity"`
	Headline string    `json:"headline"`
	Status   string    `json:"status"`
	Place    placeView `json:"place"`
	WorkItem string    `json:"workItem,omitempty"`
}

func (config runtimeConfig) handleAlerts(e *core.RequestEvent) error {
	alerts, err := openAlerts(e.App, alertListLimit)
	if err != nil {
		return e.InternalServerError("Impossibile leggere le allerte.", err)
	}
	views := make([]alertView, 0, len(alerts))
	for _, alert := range alerts {
		view := alertView{
			ID:       alert.Id,
			Day:      alert.GetDateTime("day").Time().Format("2006-01-02"),
			Severity: alert.GetString("severity"),
			Headline: alert.GetString("headline"),
			Status:   alert.GetString("status"),
			WorkItem: alert.GetString("work_item"),
		}
		if place, err := e.App.FindRecordById("geo_places", alert.GetString("place")); err == nil {
			view.Place = newPlaceView(place)
		}
		views = append(views, view)
	}
	return e.JSON(http.StatusOK, map[string]any{"alerts": views, "attribution": attribution})
}

func (config runtimeConfig) handleAcknowledge(e *core.RequestEvent) error {
	alert, err := e.App.FindRecordById("weather_alerts", e.Request.PathValue("id"))
	if err != nil {
		return e.NotFoundError("Allerta non trovata.", err)
	}
	if alert.GetString("status") == "open" {
		alert.Set("status", "acknowledged")
		if err := e.App.Save(alert); err != nil {
			return e.InternalServerError("Impossibile aggiornare l'allerta.", err)
		}
	}
	return e.JSON(http.StatusOK, map[string]any{"id": alert.Id, "status": alert.GetString("status")})
}

// parseDay reads a YYYY-MM-DD boundary in the given location. Building the
// bound explicitly avoids the malformed ISO strings that come from string
// interpolation.
func parseDay(value string, location *time.Location) (types.DateTime, error) {
	parsed, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(value), location)
	if err != nil {
		return types.DateTime{}, err
	}
	return types.ParseDateTime(parsed.UTC())
}
