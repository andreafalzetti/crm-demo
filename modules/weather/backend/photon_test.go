package weather

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

// grottaferrataTown is a verbatim Photon response for a comune, trimmed to the
// fields the CRM reads.
const grottaferrataTown = `{"features":[{"properties":{"osm_key":"place","osm_value":"town","name":"Grottaferrata","county":"Roma Capitale","state":"Lazio","country":"Italia","postcode":"00046","countrycode":"it"},"geometry":{"coordinates":[12.6667408,41.788616]}}]}`

// monasteroHouse is a verbatim Photon response for an address with a house number.
const monasteroHouse = `{"features":[{"properties":{"osm_key":"tourism","type":"house","housenumber":"128","name":"Monastero Esarchico","street":"Corso del Popolo","city":"Grottaferrata","county":"Roma Capitale","postcode":"00046","countrycode":"IT"},"geometry":{"coordinates":[12.6667628,41.7858337]}}]}`

func geocoderReturning(t *testing.T, status int, body string) (*Geocoder, *[]string) {
	t.Helper()
	queries := []string{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		queries = append(queries, r.URL.Query().Get("q"))
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(server.Close)
	return NewGeocoder(server.URL, "crm-test/1.0 test@example.test", server.Client()), &queries
}

func TestLookupResolvesComune(t *testing.T) {
	geocoder, queries := geocoderReturning(t, http.StatusOK, grottaferrataTown)
	result, err := geocoder.Lookup(context.Background(), "Grottaferrata")
	if err != nil {
		t.Fatal(err)
	}
	if result.Latitude != 41.7886 || result.Longitude != 12.6667 {
		t.Fatalf("coordinate non troncate a 4 decimali: %v %v", result.Latitude, result.Longitude)
	}
	if result.Label != "Grottaferrata" {
		t.Fatalf("label = %q", result.Label)
	}
	if result.Municipality != "Grottaferrata" || result.Province != "Roma Capitale" || result.Postcode != "00046" {
		t.Fatalf("campi amministrativi errati: %+v", result)
	}
	if result.CountryCode != "IT" {
		t.Fatalf("country code non normalizzato: %q", result.CountryCode)
	}
	if len(*queries) != 1 || (*queries)[0] != "Grottaferrata" {
		t.Fatalf("query inviate: %v", *queries)
	}
}

func TestLookupBuildsStreetLabelForAddresses(t *testing.T) {
	geocoder, _ := geocoderReturning(t, http.StatusOK, monasteroHouse)
	result, err := geocoder.Lookup(context.Background(), "Corso del Popolo 128 Grottaferrata")
	if err != nil {
		t.Fatal(err)
	}
	// The street form is preferred over the POI name, which is what an operator
	// expects to read back on the job card.
	if result.Label != "Corso del Popolo 128, Grottaferrata" {
		t.Fatalf("label = %q", result.Label)
	}
}

func TestLookupReportsNotFoundDistinctly(t *testing.T) {
	geocoder, _ := geocoderReturning(t, http.StatusOK, `{"features":[]}`)
	_, err := geocoder.Lookup(context.Background(), "indirizzo inesistente")
	if !errors.Is(err, ErrPlaceNotFound) {
		t.Fatalf("atteso ErrPlaceNotFound, ottenuto %v", err)
	}
}

func TestLookupSkipsFeaturesWithoutUsableCoordinates(t *testing.T) {
	body := `{"features":[{"properties":{"name":"Rotto"},"geometry":{"coordinates":[]}},` +
		`{"properties":{"name":"Nullisola"},"geometry":{"coordinates":[0,0]}},` +
		`{"properties":{"name":"Buono","city":"Roma"},"geometry":{"coordinates":[12.5,41.9]}}]}`
	geocoder, _ := geocoderReturning(t, http.StatusOK, body)
	result, err := geocoder.Lookup(context.Background(), "qualcosa")
	if err != nil {
		t.Fatal(err)
	}
	if result.Label != "Buono, Roma" {
		t.Fatalf("ha scelto la feature sbagliata: %+v", result)
	}
}

func TestLookupTreatsUpstreamFailureAsRetryable(t *testing.T) {
	geocoder, _ := geocoderReturning(t, http.StatusBadGateway, "")
	_, err := geocoder.Lookup(context.Background(), "Grottaferrata")
	if err == nil {
		t.Fatal("atteso errore su 502")
	}
	// A transport failure must not be recorded as "address does not exist",
	// otherwise the worker stops retrying a place that is merely unreachable.
	if errors.Is(err, ErrPlaceNotFound) {
		t.Fatal("un 502 non deve degradare a ErrPlaceNotFound")
	}
}

func TestLookupRejectsMalformedBody(t *testing.T) {
	geocoder, _ := geocoderReturning(t, http.StatusOK, "<html>non json</html>")
	if _, err := geocoder.Lookup(context.Background(), "Grottaferrata"); err == nil {
		t.Fatal("atteso errore su body non JSON")
	}
}

func TestLookupWithoutConfiguredEndpointFails(t *testing.T) {
	geocoder := NewGeocoder("", "crm-test/1.0", nil)
	if geocoder.Configured() {
		t.Fatal("un geocoder senza URL non e' configurato")
	}
	if _, err := geocoder.Lookup(context.Background(), "Grottaferrata"); err == nil {
		t.Fatal("atteso errore senza endpoint")
	}
}

func TestLookupSendsUserAgent(t *testing.T) {
	seen := ""
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = r.Header.Get("User-Agent")
		_, _ = w.Write([]byte(grottaferrataTown))
	}))
	defer server.Close()
	geocoder := NewGeocoder(server.URL, "crm-test/1.0 test@example.test", server.Client())
	if _, err := geocoder.Lookup(context.Background(), "Grottaferrata"); err != nil {
		t.Fatal(err)
	}
	if seen != "crm-test/1.0 test@example.test" {
		t.Fatalf("User-Agent = %q", seen)
	}
}
