package weather

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"
)

const (
	metDefaultBaseURL = "https://api.met.no/weatherapi/locationforecast/2.0/complete"
	metTimeout        = 20 * time.Second
	metMaxBodyBytes   = 4 * 1024 * 1024

	// metFallbackTTL applies when the response carries no usable Expires header.
	// MET currently returns roughly half an hour; staying conservative keeps the
	// CRM well inside the "do not repeat before Expires" rule.
	metFallbackTTL = 30 * time.Minute

	forecastDays = 7
)

// ErrThrottled means MET asked us to back off. The caller must stop the run
// rather than move on to the next place.
var ErrThrottled = errors.New("meteo: troppe richieste, backoff richiesto")

// ErrRejected means MET refused the request outright, which in practice is a
// missing or generic User-Agent, or coordinates with too many decimals.
var ErrRejected = errors.New("meteo: richiesta rifiutata dal servizio")

// ForecastDay is one calendar day in the place's own timezone. Aggregating in
// local time is what makes "giovedi'" mean the same thing to the operator and
// to the alert engine.
type ForecastDay struct {
	Date          string   `json:"date"`
	MinTemp       *float64 `json:"minTemp,omitempty"`
	MaxTemp       *float64 `json:"maxTemp,omitempty"`
	Precipitation float64  `json:"precipitation"`
	MaxWind       float64  `json:"maxWind"`
	Symbol        string   `json:"symbol,omitempty"`
}

// ForecastHour is an hourly step, kept only for the near term where MET itself
// is hourly.
type ForecastHour struct {
	Time          time.Time `json:"time"`
	Temperature   *float64  `json:"temperature,omitempty"`
	Precipitation float64   `json:"precipitation"`
	Wind          float64   `json:"wind"`
	Symbol        string    `json:"symbol,omitempty"`
}

type Forecast struct {
	UpdatedAt time.Time      `json:"updatedAt"`
	TimeZone  string         `json:"timeZone"`
	Days      []ForecastDay  `json:"days"`
	Hours     []ForecastHour `json:"hours"`
}

// ForecastFetch carries the cache metadata the MET terms require us to honour.
type ForecastFetch struct {
	Forecast     *Forecast
	NotModified  bool
	LastModified string
	ExpiresAt    time.Time
}

type MetClient struct {
	baseURL   string
	userAgent string
	client    *http.Client
}

func NewMetClient(baseURL, userAgent string, client *http.Client) *MetClient {
	if strings.TrimSpace(baseURL) == "" {
		baseURL = metDefaultBaseURL
	}
	if client == nil {
		client = &http.Client{Timeout: metTimeout}
	}
	return &MetClient{
		baseURL:   strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		userAgent: strings.TrimSpace(userAgent),
		client:    client,
	}
}

// Configured reports whether the client may legally call MET. The terms make the
// User-Agent mandatory, so an unset one is a configuration error, not a warning.
func (c *MetClient) Configured() bool { return c != nil && c.userAgent != "" }

type metResponse struct {
	Properties struct {
		Meta struct {
			UpdatedAt time.Time `json:"updated_at"`
		} `json:"meta"`
		Timeseries []struct {
			Time time.Time `json:"time"`
			Data struct {
				Instant struct {
					Details struct {
						AirTemperature *float64 `json:"air_temperature"`
						WindSpeed      *float64 `json:"wind_speed"`
					} `json:"details"`
				} `json:"instant"`
				Next1Hours *metPeriod `json:"next_1_hours"`
				Next6Hours *metPeriod `json:"next_6_hours"`
			} `json:"data"`
		} `json:"timeseries"`
	} `json:"properties"`
}

type metPeriod struct {
	Summary struct {
		SymbolCode string `json:"symbol_code"`
	} `json:"summary"`
	Details struct {
		PrecipitationAmount *float64 `json:"precipitation_amount"`
		AirTemperatureMin   *float64 `json:"air_temperature_min"`
		AirTemperatureMax   *float64 `json:"air_temperature_max"`
	} `json:"details"`
}

// Fetch retrieves a forecast, sending the previous Last-Modified so MET can
// answer 304 and skip the transfer, as their terms require.
func (c *MetClient) Fetch(ctx context.Context, latitude, longitude, altitude float64, location *time.Location, lastModified string) (ForecastFetch, error) {
	if !c.Configured() {
		return ForecastFetch{}, errors.New("meteo: User-Agent non configurato")
	}
	if !validCoordinates(latitude, longitude) {
		return ForecastFetch{}, errors.New("meteo: coordinate non valide")
	}
	if location == nil {
		location = time.UTC
	}

	endpoint := fmt.Sprintf("%s?lat=%s&lon=%s", c.baseURL, formatCoordinate(latitude), formatCoordinate(longitude))
	if altitude > 0 {
		endpoint += fmt.Sprintf("&altitude=%d", int(altitude))
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return ForecastFetch{}, err
	}
	request.Header.Set("User-Agent", c.userAgent)
	if lastModified != "" {
		request.Header.Set("If-Modified-Since", lastModified)
	}

	response, err := c.client.Do(request)
	if err != nil {
		return ForecastFetch{}, err
	}
	defer response.Body.Close()

	result := ForecastFetch{
		LastModified: response.Header.Get("Last-Modified"),
		ExpiresAt:    parseExpires(response.Header.Get("Expires"), time.Now()),
	}
	switch {
	case response.StatusCode == http.StatusNotModified:
		result.NotModified = true
		if result.LastModified == "" {
			result.LastModified = lastModified
		}
		return result, nil
	case response.StatusCode == http.StatusTooManyRequests:
		return result, ErrThrottled
	case response.StatusCode == http.StatusForbidden:
		return result, ErrRejected
	case response.StatusCode < 200 || response.StatusCode >= 300:
		return result, fmt.Errorf("meteo: risposta %d", response.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(response.Body, metMaxBodyBytes))
	if err != nil {
		return result, err
	}
	var decoded metResponse
	if err := json.Unmarshal(body, &decoded); err != nil {
		return result, fmt.Errorf("meteo: risposta illeggibile: %w", err)
	}
	if len(decoded.Properties.Timeseries) == 0 {
		return result, errors.New("meteo: previsione vuota")
	}
	result.Forecast = aggregate(decoded, location)
	return result, nil
}

// parseExpires honours the Expires header, which the MET terms make binding.
// A missing or unparseable value falls back to a conservative TTL rather than
// to "fetch again immediately".
func parseExpires(header string, now time.Time) time.Time {
	if header != "" {
		if parsed, err := http.ParseTime(header); err == nil && parsed.After(now) {
			return parsed.UTC()
		}
	}
	return now.Add(metFallbackTTL).UTC()
}

// aggregate folds the MET timeseries into calendar days in the place's own
// timezone. Precipitation is summed from whichever period block is present,
// taking the 1-hour one when both exist so nothing is counted twice.
func aggregate(source metResponse, location *time.Location) *Forecast {
	type dayAccumulator struct {
		mins          []float64
		maxs          []float64
		precipitation float64
		maxWind       float64
		symbol        string
		symbolRank    int
	}

	days := map[string]*dayAccumulator{}
	order := []string{}
	hours := []ForecastHour{}

	for _, entry := range source.Properties.Timeseries {
		local := entry.Time.In(location)
		key := local.Format("2006-01-02")
		accumulator, seen := days[key]
		if !seen {
			accumulator = &dayAccumulator{}
			days[key] = accumulator
			order = append(order, key)
		}

		instant := entry.Data.Instant.Details
		if instant.AirTemperature != nil {
			accumulator.mins = append(accumulator.mins, *instant.AirTemperature)
			accumulator.maxs = append(accumulator.maxs, *instant.AirTemperature)
		}
		if instant.WindSpeed != nil && *instant.WindSpeed > accumulator.maxWind {
			accumulator.maxWind = *instant.WindSpeed
		}

		period := entry.Data.Next1Hours
		hourly := period != nil
		if period == nil {
			period = entry.Data.Next6Hours
		}
		if period == nil {
			continue
		}

		precipitation := 0.0
		if period.Details.PrecipitationAmount != nil {
			precipitation = *period.Details.PrecipitationAmount
		}
		accumulator.precipitation += precipitation

		// A 6-hour block spans two days near midnight; attribute its extremes to
		// the day holding its midpoint rather than to its first instant.
		if !hourly {
			target := days[key]
			midpoint := local.Add(3 * time.Hour).Format("2006-01-02")
			if other, ok := days[midpoint]; ok {
				target = other
			}
			if period.Details.AirTemperatureMin != nil {
				target.mins = append(target.mins, *period.Details.AirTemperatureMin)
			}
			if period.Details.AirTemperatureMax != nil {
				target.maxs = append(target.maxs, *period.Details.AirTemperatureMax)
			}
		}

		if symbol := period.Summary.SymbolCode; symbol != "" {
			if rank := symbolSeverity(symbol); rank > accumulator.symbolRank {
				accumulator.symbolRank = rank
				accumulator.symbol = symbol
			}
			if hourly {
				var temperature *float64
				if instant.AirTemperature != nil {
					value := *instant.AirTemperature
					temperature = &value
				}
				wind := 0.0
				if instant.WindSpeed != nil {
					wind = *instant.WindSpeed
				}
				hours = append(hours, ForecastHour{
					Time:          entry.Time.UTC(),
					Temperature:   temperature,
					Precipitation: precipitation,
					Wind:          wind,
					Symbol:        symbol,
				})
			}
		}
	}

	sort.Strings(order)
	result := &Forecast{
		UpdatedAt: source.Properties.Meta.UpdatedAt.UTC(),
		TimeZone:  location.String(),
		Days:      make([]ForecastDay, 0, len(order)),
		Hours:     hours,
	}
	for _, key := range order {
		accumulator := days[key]
		day := ForecastDay{
			Date:          key,
			Precipitation: round1(accumulator.precipitation),
			MaxWind:       round1(accumulator.maxWind),
			Symbol:        accumulator.symbol,
		}
		if len(accumulator.mins) > 0 {
			value := round1(minOf(accumulator.mins))
			day.MinTemp = &value
		}
		if len(accumulator.maxs) > 0 {
			value := round1(maxOf(accumulator.maxs))
			day.MaxTemp = &value
		}
		result.Days = append(result.Days, day)
		if len(result.Days) == forecastDays {
			break
		}
	}
	return result
}

// symbolSeverity ranks MET symbol codes so a day showing three hours of heavy
// rain is labelled by the rain, not by the clear sky around it.
func symbolSeverity(symbol string) int {
	base := strings.SplitN(symbol, "_", 2)[0]
	switch {
	case strings.Contains(base, "thunder"):
		return 7
	case strings.HasPrefix(base, "heavy"):
		return 6
	case strings.Contains(base, "sleet"), strings.Contains(base, "snow"):
		return 5
	case strings.HasPrefix(base, "light"):
		return 3
	case strings.Contains(base, "rain"):
		return 4
	case base == "cloudy":
		return 2
	case strings.HasPrefix(base, "partlycloudy"), base == "fair":
		return 1
	default:
		return 0
	}
}

func minOf(values []float64) float64 {
	result := values[0]
	for _, value := range values[1:] {
		if value < result {
			result = value
		}
	}
	return result
}

func maxOf(values []float64) float64 {
	result := values[0]
	for _, value := range values[1:] {
		if value > result {
			result = value
		}
	}
	return result
}

func round1(value float64) float64 {
	return float64(int(value*10+copySign(0.5, value))) / 10
}

func copySign(magnitude, sign float64) float64 {
	if sign < 0 {
		return -magnitude
	}
	return magnitude
}
