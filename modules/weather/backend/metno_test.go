package weather

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func loadFixture(t *testing.T) string {
	t.Helper()
	body, err := os.ReadFile("testdata/grottaferrata.json")
	if err != nil {
		t.Fatal(err)
	}
	return string(body)
}

func rome(t *testing.T) *time.Location {
	t.Helper()
	location, err := time.LoadLocation("Europe/Rome")
	if err != nil {
		t.Skipf("tzdata non disponibile: %v", err)
	}
	return location
}

type metServer struct {
	*httptest.Server
	requests []*http.Request
}

func newMetServer(t *testing.T, handler http.HandlerFunc) *metServer {
	t.Helper()
	captured := &metServer{}
	captured.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured.requests = append(captured.requests, r)
		handler(w, r)
	}))
	t.Cleanup(captured.Close)
	return captured
}

func TestFetchAggregatesRealForecastByLocalDay(t *testing.T) {
	body := loadFixture(t)
	server := newMetServer(t, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Last-Modified", "Wed, 09 Sep 2026 17:11:35 GMT")
		w.Header().Set("Expires", time.Now().Add(29*time.Minute).UTC().Format(http.TimeFormat))
		_, _ = w.Write([]byte(body))
	})
	client := NewMetClient(server.URL, "crm-test/1.0 test@example.test", server.Client())

	result, err := client.Fetch(context.Background(), 41.7883, 12.6683, 329, rome(t), "")
	if err != nil {
		t.Fatal(err)
	}
	if result.Forecast == nil {
		t.Fatal("previsione assente")
	}
	if len(result.Forecast.Days) != forecastDays {
		t.Fatalf("attesi %d giorni, ottenuti %d", forecastDays, len(result.Forecast.Days))
	}

	byDate := map[string]ForecastDay{}
	for _, day := range result.Forecast.Days {
		byDate[day.Date] = day
	}

	// The storm of 10 September is the case this module exists for: ~34 mm, of
	// which ~29 fall between 20:00 and midnight local time.
	storm, ok := byDate["2026-09-10"]
	if !ok {
		t.Fatalf("giorno della perturbazione mancante: %+v", byDate)
	}
	if storm.Precipitation < 33 || storm.Precipitation > 35 {
		t.Fatalf("pioggia del 10 settembre = %v mm, attesi ~33.9", storm.Precipitation)
	}
	if storm.Symbol != "heavyrain" {
		t.Fatalf("simbolo del giorno = %q, atteso heavyrain", storm.Symbol)
	}
	if storm.MaxWind < 6 {
		t.Fatalf("vento massimo = %v m/s, atteso ~6.9", storm.MaxWind)
	}
	if storm.MinTemp == nil || storm.MaxTemp == nil {
		t.Fatal("temperature del giorno mancanti")
	}
	if *storm.MaxTemp < 27 || *storm.MaxTemp > 28 {
		t.Fatalf("massima = %v, attesa ~27.8", *storm.MaxTemp)
	}

	// The day after clears up: same run, almost no rain.
	clear := byDate["2026-09-11"]
	if clear.Precipitation > 1 {
		t.Fatalf("pioggia dell'11 settembre = %v mm, attesa ~0.4", clear.Precipitation)
	}

	if result.Forecast.UpdatedAt.Format(time.RFC3339) != "2026-09-09T13:28:45Z" {
		t.Fatalf("model run = %v", result.Forecast.UpdatedAt)
	}
	if result.Forecast.TimeZone != "Europe/Rome" {
		t.Fatalf("timezone = %q", result.Forecast.TimeZone)
	}
	if len(result.Forecast.Hours) == 0 {
		t.Fatal("nessun passo orario estratto")
	}
}

func TestFetchAggregationIsTimezoneSensitive(t *testing.T) {
	// The heaviest hours fall between 20:00 and 24:00 Rome time, which in UTC
	// belong partly to the same day. Aggregating in UTC therefore yields a
	// different daily total, and the operator would be shown the wrong day.
	body := loadFixture(t)
	server := newMetServer(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(body))
	})
	client := NewMetClient(server.URL, "crm-test/1.0 test@example.test", server.Client())

	local, err := client.Fetch(context.Background(), 41.7883, 12.6683, 329, rome(t), "")
	if err != nil {
		t.Fatal(err)
	}
	utc, err := client.Fetch(context.Background(), 41.7883, 12.6683, 329, time.UTC, "")
	if err != nil {
		t.Fatal(err)
	}
	find := func(forecast *Forecast, date string) float64 {
		for _, day := range forecast.Days {
			if day.Date == date {
				return day.Precipitation
			}
		}
		return -1
	}
	if find(local.Forecast, "2026-09-10") == find(utc.Forecast, "2026-09-10") {
		t.Fatal("l'aggregazione non tiene conto del fuso: locale e UTC coincidono")
	}
}

func TestFetchSendsIfModifiedSinceAndHandles304(t *testing.T) {
	server := newMetServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("If-Modified-Since") == "Wed, 09 Sep 2026 17:11:35 GMT" {
			w.Header().Set("Expires", time.Now().Add(30*time.Minute).UTC().Format(http.TimeFormat))
			w.WriteHeader(http.StatusNotModified)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(loadFixture(t)))
	})
	client := NewMetClient(server.URL, "crm-test/1.0 test@example.test", server.Client())

	result, err := client.Fetch(context.Background(), 41.7883, 12.6683, 329, rome(t), "Wed, 09 Sep 2026 17:11:35 GMT")
	if err != nil {
		t.Fatal(err)
	}
	if !result.NotModified {
		t.Fatal("304 non riconosciuto")
	}
	if result.Forecast != nil {
		t.Fatal("un 304 non porta previsione")
	}
	// The stored value must survive a 304, otherwise the next call drops the
	// header and forces a full transfer.
	if result.LastModified != "Wed, 09 Sep 2026 17:11:35 GMT" {
		t.Fatalf("Last-Modified perso sul 304: %q", result.LastModified)
	}
	if result.ExpiresAt.Before(time.Now()) {
		t.Fatal("scadenza non aggiornata sul 304")
	}
}

func TestFetchTruncatesCoordinatesInQuery(t *testing.T) {
	server := newMetServer(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(loadFixture(t)))
	})
	client := NewMetClient(server.URL, "crm-test/1.0 test@example.test", server.Client())
	if _, err := client.Fetch(context.Background(), 41.788312, 12.668411, 329, rome(t), ""); err != nil {
		t.Fatal(err)
	}
	query := server.requests[0].URL.Query()
	// More than four decimals is a 403 on MET's newer products.
	if query.Get("lat") != "41.7883" || query.Get("lon") != "12.6684" {
		t.Fatalf("coordinate non troncate: lat=%q lon=%q", query.Get("lat"), query.Get("lon"))
	}
	if query.Get("altitude") != "329" {
		t.Fatalf("altitudine = %q", query.Get("altitude"))
	}
}

func TestFetchDistinguishesThrottlingFromRejection(t *testing.T) {
	cases := []struct {
		status int
		want   error
	}{
		{http.StatusTooManyRequests, ErrThrottled},
		{http.StatusForbidden, ErrRejected},
	}
	for _, tc := range cases {
		server := newMetServer(t, func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(tc.status)
		})
		client := NewMetClient(server.URL, "crm-test/1.0 test@example.test", server.Client())
		_, err := client.Fetch(context.Background(), 41.7883, 12.6683, 0, rome(t), "")
		if !errors.Is(err, tc.want) {
			t.Fatalf("status %d ha prodotto %v, atteso %v", tc.status, err, tc.want)
		}
	}
}

func TestFetchRefusesWithoutUserAgent(t *testing.T) {
	// MET answers 403 to a missing User-Agent; failing before the request keeps
	// us from burning the application's reputation on their side.
	client := NewMetClient("https://example.test", "", nil)
	if client.Configured() {
		t.Fatal("un client senza User-Agent non e' configurato")
	}
	if _, err := client.Fetch(context.Background(), 41.7883, 12.6683, 0, time.UTC, ""); err == nil {
		t.Fatal("atteso errore senza User-Agent")
	}
}

func TestFetchRejectsUnusableInput(t *testing.T) {
	client := NewMetClient("https://example.test", "crm-test/1.0", nil)
	if _, err := client.Fetch(context.Background(), 0, 0, 0, time.UTC, ""); err == nil {
		t.Fatal("atteso errore su coordinate 0,0")
	}
}

func TestFetchRejectsMalformedAndEmptyPayloads(t *testing.T) {
	for _, body := range []string{"<html>", `{"properties":{"timeseries":[]}}`} {
		server := newMetServer(t, func(w http.ResponseWriter, _ *http.Request) {
			_, _ = w.Write([]byte(body))
		})
		client := NewMetClient(server.URL, "crm-test/1.0 test@example.test", server.Client())
		if _, err := client.Fetch(context.Background(), 41.7883, 12.6683, 0, rome(t), ""); err == nil {
			t.Fatalf("atteso errore per body %q", body)
		}
	}
}

func TestParseExpiresFallsBackConservatively(t *testing.T) {
	now := time.Date(2026, 9, 9, 17, 0, 0, 0, time.UTC)
	if got := parseExpires("", now); !got.Equal(now.Add(metFallbackTTL)) {
		t.Fatalf("fallback = %v", got)
	}
	if got := parseExpires("non una data", now); !got.Equal(now.Add(metFallbackTTL)) {
		t.Fatalf("header illeggibile = %v", got)
	}
	// A past Expires must not authorise an immediate refetch loop.
	if got := parseExpires("Wed, 09 Sep 2026 16:00:00 GMT", now); !got.After(now) {
		t.Fatalf("Expires scaduto = %v", got)
	}
	want := time.Date(2026, 9, 9, 17, 42, 4, 0, time.UTC)
	if got := parseExpires("Wed, 09 Sep 2026 17:42:04 GMT", now); !got.Equal(want) {
		t.Fatalf("Expires valido = %v, atteso %v", got, want)
	}
}

func TestSymbolSeverityPrefersTheWorstCondition(t *testing.T) {
	if symbolSeverity("heavyrain") <= symbolSeverity("cloudy") {
		t.Fatal("la pioggia forte deve prevalere sul nuvoloso")
	}
	if symbolSeverity("thunderstorm") <= symbolSeverity("heavyrain") {
		t.Fatal("il temporale deve prevalere sulla pioggia forte")
	}
	if symbolSeverity("clearsky_day") != 0 {
		t.Fatal("il sereno e' la condizione di base")
	}
}
