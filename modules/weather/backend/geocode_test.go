package weather

import (
	"math"
	"testing"
)

func TestTruncateCoordinateKeepsFourDecimals(t *testing.T) {
	// The MET terms require truncation, not rounding: 41.78831 must become
	// 41.7883 and never 41.7884.
	cases := []struct {
		name  string
		input float64
		want  float64
	}{
		{"tronca senza arrotondare", 41.788312, 41.7883},
		{"non arrotonda per eccesso", 41.78839, 41.7883},
		{"gia' a quattro decimali", 12.6683, 12.6683},
		{"negativo tronca verso zero", -12.66839, -12.6683},
		{"intero resta intero", 41, 41},
		{"NaN degrada a zero", math.NaN(), 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := truncateCoordinate(tc.input); math.Abs(got-tc.want) > 1e-9 {
				t.Fatalf("truncateCoordinate(%v) = %v, atteso %v", tc.input, got, tc.want)
			}
		})
	}
}

func TestFormatCoordinateNeverUsesScientificNotation(t *testing.T) {
	if got := formatCoordinate(0.00001); got != "0" {
		t.Fatalf("formatCoordinate(0.00001) = %q, atteso \"0\"", got)
	}
	if got := formatCoordinate(41.788312); got != "41.7883" {
		t.Fatalf("formatCoordinate(41.788312) = %q", got)
	}
}

func TestValidCoordinatesRejectsNullIsland(t *testing.T) {
	if validCoordinates(0, 0) {
		t.Fatal("0,0 e' l'esito tipico di una geocodifica fallita, va rifiutato")
	}
	if validCoordinates(91, 12) || validCoordinates(41, 181) {
		t.Fatal("coordinate fuori range accettate")
	}
	if !validCoordinates(41.7883, 12.6683) {
		t.Fatal("coordinate valide rifiutate")
	}
}

func TestNormalizeQueryFoldsHandwrittenAddresses(t *testing.T) {
	// These are the same job site typed by three different operators; they must
	// share one geo_places row and therefore one forecast fetch.
	same := []string{
		"Via Roma 12, Grottaferrata",
		"via roma  12 - grottaferrata",
		"  VIA ROMA 12 (GROTTAFERRATA)  ",
	}
	want := queryHash(same[0])
	if want == "" {
		t.Fatal("hash vuoto per un indirizzo valido")
	}
	for _, variant := range same[1:] {
		if got := queryHash(variant); got != want {
			t.Fatalf("hash divergente per %q: %s != %s", variant, got, want)
		}
	}
	if queryHash("Via Milano 12, Grottaferrata") == want {
		t.Fatal("indirizzi diversi collidono sullo stesso hash")
	}
}

func TestQueryHashIgnoresBlankInput(t *testing.T) {
	for _, blank := range []string{"", "   ", ",,, - ()"} {
		if got := queryHash(blank); got != "" {
			t.Fatalf("queryHash(%q) = %q, atteso vuoto", blank, got)
		}
	}
}
