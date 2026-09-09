package assistant

import (
	"encoding/json"
	"testing"
)

func TestForecastPayloadParsesTheStoredShape(t *testing.T) {
	// This is the JSON the weather module writes into weather_forecasts. The two
	// modules are decoupled on purpose, so this test is what keeps the shared
	// shape honest: if the producer changes it, this fails.
	stored := `{"updatedAt":"2026-09-09T13:28:45Z","timeZone":"Europe/Rome","days":[
		{"date":"2026-09-10","minTemp":19.5,"maxTemp":27.8,"precipitation":33.9,"maxWind":6.9,"symbol":"heavyrain"},
		{"date":"2026-09-11","precipitation":0.4,"maxWind":5,"symbol":"clearsky_day"}]}`

	var payload forecastPayload
	if err := json.Unmarshal([]byte(stored), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.TimeZone != "Europe/Rome" {
		t.Fatalf("timezone = %q", payload.TimeZone)
	}
	if len(payload.Days) != 2 {
		t.Fatalf("attesi 2 giorni, ottenuti %d", len(payload.Days))
	}
	storm := payload.Days[0]
	if storm.Precipitation != 33.9 || storm.Symbol != "heavyrain" {
		t.Fatalf("giorno della perturbazione = %+v", storm)
	}
	if storm.MinTemp == nil || *storm.MinTemp != 19.5 {
		t.Fatal("minima non letta")
	}
	// A day without temperatures must stay nil, so the assistant reports "non
	// disponibile" rather than inventing zero degrees.
	if payload.Days[1].MinTemp != nil || payload.Days[1].MaxTemp != nil {
		t.Fatal("temperature assenti lette come zero")
	}
}

func TestArgIntClampsToTheCallerIntent(t *testing.T) {
	// n8n sends numbers as float64 through JSON.
	if got := argInt(map[string]any{"days": float64(3)}, "days", 7); got != 3 {
		t.Fatalf("float64 = %d", got)
	}
	if got := argInt(map[string]any{"days": 2}, "days", 7); got != 2 {
		t.Fatalf("int = %d", got)
	}
	if got := argInt(map[string]any{"days": "tre"}, "days", 7); got != 7 {
		t.Fatalf("valore non numerico = %d, atteso il default", got)
	}
	if got := argInt(map[string]any{}, "days", 7); got != 7 {
		t.Fatalf("chiave assente = %d", got)
	}
}
