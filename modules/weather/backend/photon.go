package weather

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// ErrPlaceNotFound separates "the geocoder answered, and knows nothing about
// this address" from a transport failure. Only the latter is worth retrying.
var ErrPlaceNotFound = errors.New("nessun luogo corrisponde alla ricerca")

const (
	geocoderTimeout      = 10 * time.Second
	geocoderMaxBodyBytes = 512 * 1024
	geocoderQueryMaxLen  = 250
)

// GeocodeResult is the subset of a Photon feature the CRM stores. Everything
// else in the response is discarded on purpose: the record must stay readable
// and stable even when the upstream index is reimported.
type GeocodeResult struct {
	Label        string
	Latitude     float64
	Longitude    float64
	Municipality string
	Province     string
	Postcode     string
	CountryCode  string
}

// Geocoder talks to a Photon instance. The base URL is configuration, not a
// constant, so the same binary runs against the self-hosted container in
// production and against the public instance while that container is built.
type Geocoder struct {
	baseURL   string
	userAgent string
	client    *http.Client
}

func NewGeocoder(baseURL, userAgent string, client *http.Client) *Geocoder {
	if client == nil {
		client = &http.Client{Timeout: geocoderTimeout}
	}
	return &Geocoder{
		baseURL:   strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		userAgent: strings.TrimSpace(userAgent),
		client:    client,
	}
}

func (g *Geocoder) Configured() bool { return g != nil && g.baseURL != "" }

type photonResponse struct {
	Features []struct {
		Properties struct {
			Name        string `json:"name"`
			Street      string `json:"street"`
			HouseNumber string `json:"housenumber"`
			City        string `json:"city"`
			District    string `json:"district"`
			County      string `json:"county"`
			State       string `json:"state"`
			Postcode    string `json:"postcode"`
			CountryCode string `json:"countrycode"`
		} `json:"properties"`
		Geometry struct {
			Coordinates []float64 `json:"coordinates"`
		} `json:"geometry"`
	} `json:"features"`
}

// Lookup resolves a free-text address to a single best candidate. Photon ranks
// its own results, so the first feature carrying usable coordinates wins.
func (g *Geocoder) Lookup(ctx context.Context, query string) (GeocodeResult, error) {
	if !g.Configured() {
		return GeocodeResult{}, errors.New("geocoder non configurato")
	}
	query = strings.TrimSpace(query)
	if query == "" {
		return GeocodeResult{}, ErrPlaceNotFound
	}
	if len(query) > geocoderQueryMaxLen {
		query = query[:geocoderQueryMaxLen]
	}

	endpoint := fmt.Sprintf("%s/api?q=%s&limit=1", g.baseURL, url.QueryEscape(query))
	return g.fetchFeature(ctx, endpoint)
}

// fetchFeature performs the request shared by forward and reverse geocoding and
// returns the first feature carrying usable coordinates.
func (g *Geocoder) fetchFeature(ctx context.Context, endpoint string) (GeocodeResult, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return GeocodeResult{}, err
	}
	if g.userAgent != "" {
		request.Header.Set("User-Agent", g.userAgent)
	}

	response, err := g.client.Do(request)
	if err != nil {
		return GeocodeResult{}, err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return GeocodeResult{}, fmt.Errorf("geocoder ha risposto %d", response.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(response.Body, geocoderMaxBodyBytes))
	if err != nil {
		return GeocodeResult{}, err
	}
	var decoded photonResponse
	if err := json.Unmarshal(body, &decoded); err != nil {
		return GeocodeResult{}, fmt.Errorf("risposta geocoder illeggibile: %w", err)
	}

	for _, feature := range decoded.Features {
		if len(feature.Geometry.Coordinates) < 2 {
			continue
		}
		longitude := truncateCoordinate(feature.Geometry.Coordinates[0])
		latitude := truncateCoordinate(feature.Geometry.Coordinates[1])
		if !validCoordinates(latitude, longitude) {
			continue
		}
		properties := feature.Properties
		municipality := firstNonEmpty(properties.City, properties.District, properties.Name)
		return GeocodeResult{
			Label:        photonLabel(properties.Street, properties.HouseNumber, properties.Name, municipality),
			Latitude:     latitude,
			Longitude:    longitude,
			Municipality: municipality,
			Province:     properties.County,
			Postcode:     properties.Postcode,
			CountryCode:  strings.ToUpper(properties.CountryCode),
		}, nil
	}
	return GeocodeResult{}, ErrPlaceNotFound
}

// Reverse names a coordinate pair. The dashboard widget uses it so a browser
// position becomes "Via Garibaldi, Grottaferrata" instead of two numbers.
func (g *Geocoder) Reverse(ctx context.Context, latitude, longitude float64) (GeocodeResult, error) {
	if !g.Configured() {
		return GeocodeResult{}, errors.New("geocoder non configurato")
	}
	if !validCoordinates(latitude, longitude) {
		return GeocodeResult{}, ErrPlaceNotFound
	}
	endpoint := fmt.Sprintf("%s/reverse?lat=%s&lon=%s&limit=1", g.baseURL, formatCoordinate(latitude), formatCoordinate(longitude))
	return g.fetchFeature(ctx, endpoint)
}

// photonLabel rebuilds a human label. Photon splits an address across fields and
// leaves "name" set for POIs, so the street form is preferred when present and
// the POI name is the fallback.
func photonLabel(street, houseNumber, name, municipality string) string {
	var head string
	switch {
	case street != "" && houseNumber != "":
		head = street + " " + houseNumber
	case street != "":
		head = street
	default:
		head = name
	}
	if head == "" {
		return municipality
	}
	if municipality != "" && !strings.EqualFold(head, municipality) {
		return head + ", " + municipality
	}
	return head
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

// formatCoordinate renders a coordinate for the MET query string with at most
// four decimals and no scientific notation.
func formatCoordinate(value float64) string {
	return strconv.FormatFloat(truncateCoordinate(value), 'f', -1, 64)
}
