package weather

import (
	"crypto/sha256"
	"encoding/hex"
	"math"
	"strings"
	"unicode"
)

// coordinateDecimals is imposed by the MET Norway terms of service: requests
// carrying more than four decimals are rejected with 403 on newer products, and
// truncating also lets their cache serve nearby callers the same response.
const coordinateDecimals = 4

// truncateCoordinate cuts a coordinate to four decimals without rounding, which
// is what the MET terms ask for ("truncate all coordinates to max 4 decimals").
func truncateCoordinate(value float64) float64 {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return 0
	}
	factor := math.Pow10(coordinateDecimals)
	return math.Trunc(value*factor) / factor
}

// validCoordinates rejects the null island and out-of-range pairs, both of which
// are the usual shape of a failed geocode rather than a real place.
func validCoordinates(latitude, longitude float64) bool {
	if latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 {
		return false
	}
	return latitude != 0 || longitude != 0
}

// normalizeQuery folds an address written by hand into a stable lookup key, so
// that "Via Roma 12, Grottaferrata" and "via roma  12 - grottaferrata" share one
// geo_places row and therefore one forecast fetch.
func normalizeQuery(raw string) string {
	var builder strings.Builder
	builder.Grow(len(raw))
	lastWasSpace := true
	for _, r := range strings.ToLower(strings.TrimSpace(raw)) {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			builder.WriteRune(r)
			lastWasSpace = false
		case !lastWasSpace:
			builder.WriteRune(' ')
			lastWasSpace = true
		}
	}
	return strings.TrimSpace(builder.String())
}

// queryHash keys geo_places by normalized address. It is a lookup key, never a
// security boundary, so a truncated digest keeps the index small.
func queryHash(raw string) string {
	normalized := normalizeQuery(raw)
	if normalized == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(normalized))
	return hex.EncodeToString(sum[:])[:32]
}
