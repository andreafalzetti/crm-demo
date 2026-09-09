package weather

import (
	"testing"
	"time"
)

func floatPtr(value float64) *float64 { return &value }

func TestMetricValueDistinguishesMissingFromZero(t *testing.T) {
	// A day without a temperature must not read as a day at zero degrees, or
	// the frost rule fires on every gap in the data.
	day := ForecastDay{Precipitation: 33.9, MaxWind: 6.9}
	if _, ok := metricValue(day, "temp_min"); ok {
		t.Fatal("una minima assente non deve essere considerata presente")
	}
	day.MinTemp = floatPtr(0)
	value, ok := metricValue(day, "temp_min")
	if !ok || value != 0 {
		t.Fatalf("minima a zero = (%v, %v)", value, ok)
	}
	if _, ok := metricValue(day, "sconosciuta"); ok {
		t.Fatal("una metrica sconosciuta non deve produrre un valore")
	}
}

func TestBreachesIsInclusiveOnTheThreshold(t *testing.T) {
	cases := []struct {
		name      string
		value     float64
		threshold float64
		operator  string
		want      bool
	}{
		{"sopra soglia", 33.9, 20, "gte", true},
		{"esattamente a soglia", 20, 20, "gte", true},
		{"sotto soglia", 19.9, 20, "gte", false},
		{"gelo esatto", 0, 0, "lte", true},
		{"gelo superato", -1.5, 0, "lte", true},
		{"nessun gelo", 0.1, 0, "lte", false},
		{"operatore ignoto", 100, 0, "eq", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := breaches(tc.value, tc.threshold, tc.operator); got != tc.want {
				t.Fatalf("breaches(%v, %v, %q) = %v", tc.value, tc.threshold, tc.operator, got)
			}
		})
	}
}

func TestSymbolSeverityRanksPrecipitationAboveClouds(t *testing.T) {
	if symbolSeverity("lightrain") >= symbolSeverity("heavyrain") {
		t.Fatal("la pioggia debole non puo' superare quella forte")
	}
	if symbolSeverity("partlycloudy_day") >= symbolSeverity("cloudy") {
		t.Fatal("il parzialmente nuvoloso non puo' superare il nuvoloso")
	}
}

func TestPlaceLocationFallsBackToRome(t *testing.T) {
	if _, err := time.LoadLocation(defaultTimeZone); err != nil {
		t.Skipf("tzdata non disponibile: %v", err)
	}
	if defaultTimeZone != "Europe/Rome" {
		t.Fatalf("il fuso di default e' %q", defaultTimeZone)
	}
}
