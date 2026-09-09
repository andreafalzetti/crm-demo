package weather

import (
	"strings"
	"unicode"

	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

// Photon ranks its own results and always answers with its best guess, however
// poor. On real data that produced silent, confident nonsense: "Viale Europa 42,
// Roma" came back as Scandiano, 400 km away, and the POI name "Studio Lumen"
// came back as a street in Yerevan. A forecast for the wrong town is worse than
// no forecast, so a candidate has to agree with what was asked before it is
// accepted.

// foldForCompare lowercases and strips diacritics, so "Reggio Emilia" matches
// "reggio emilia" and "Forlì" matches "Forli".
func foldForCompare(value string) string {
	chain := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	folded, _, err := transform.String(chain, strings.ToLower(strings.TrimSpace(value)))
	if err != nil {
		return strings.ToLower(strings.TrimSpace(value))
	}
	return folded
}

// queryLocality pulls the town out of an address as people write it: the part
// after the last comma, which is where an Italian address puts the comune.
// Returns empty when the query carries no locality to check against.
func queryLocality(query string) string {
	parts := strings.Split(query, ",")
	if len(parts) < 2 {
		return ""
	}
	locality := strings.TrimSpace(parts[len(parts)-1])
	// A trailing postcode or province code is not a locality.
	if len(locality) <= 2 || strings.IndexFunc(locality, unicode.IsLetter) < 0 {
		if len(parts) < 3 {
			return ""
		}
		locality = strings.TrimSpace(parts[len(parts)-2])
	}
	if len([]rune(locality)) < 3 {
		return ""
	}
	return locality
}

// resultMatchesQuery reports whether a candidate is consistent with the request.
// It checks the country first, then the locality when the query stated one.
func resultMatchesQuery(query string, expectedCountry string, result GeocodeResult) bool {
	if expectedCountry != "" && result.CountryCode != "" &&
		!strings.EqualFold(result.CountryCode, expectedCountry) {
		return false
	}

	locality := queryLocality(query)
	if locality == "" {
		return true
	}
	wanted := significantTokens(locality)
	if len(wanted) == 0 {
		return true
	}
	for _, candidate := range []string{result.Municipality, result.Province, result.Label, result.Postcode} {
		if candidateCovers(candidate, wanted) {
			return true
		}
	}
	return false
}

// candidateCovers reports whether every significant word of the requested
// locality appears in the candidate. Token matching rather than substring
// matching is what makes the common Italian naming gap work: people write
// "Reggio Emilia" for the comune officially called "Reggio nell'Emilia", and
// "Roma" must still match "Roma Capitale".
func candidateCovers(candidate string, wanted []string) bool {
	folded := foldForCompare(candidate)
	if folded == "" {
		return false
	}
	for _, token := range wanted {
		if !strings.Contains(folded, token) {
			return false
		}
	}
	return true
}

// significantTokens drops the connecting words an official name adds and a
// person leaves out.
func significantTokens(value string) []string {
	filler := map[string]bool{
		"di": true, "de": true, "del": true, "della": true, "dell": true,
		"nell": true, "nella": true, "in": true, "a": true, "al": true,
		"sul": true, "sui": true, "e": true, "d": true, "l": true,
	}
	tokens := []string{}
	for _, raw := range strings.FieldsFunc(foldForCompare(value), func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsDigit(r)
	}) {
		if len([]rune(raw)) < 2 || filler[raw] {
			continue
		}
		tokens = append(tokens, raw)
	}
	return tokens
}
