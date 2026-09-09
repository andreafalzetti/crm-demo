package weather

import "testing"

func TestResultMatchesQueryRejectsTheWrongCountry(t *testing.T) {
	// Observed in production: the POI name "Studio Lumen" came back as a street
	// in Yerevan, and the CRM stored it without complaint.
	yerevan := GeocodeResult{
		Label:        "Արամի փողոց, Երևան",
		Municipality: "Երևան",
		CountryCode:  "AM",
	}
	if resultMatchesQuery("Studio Lumen", "IT", yerevan) {
		t.Fatal("un risultato in Armenia non deve passare il filtro italiano")
	}
	// With no expected country configured, the check must not block anything.
	if !resultMatchesQuery("Studio Lumen", "", yerevan) {
		t.Fatal("senza paese atteso il filtro non deve intervenire")
	}
}

func TestResultMatchesQueryRejectsTheWrongTown(t *testing.T) {
	// Observed in production: "Viale Europa 42, Roma" resolved to Scandiano,
	// 400 km away, because Photon ranked it first.
	scandiano := GeocodeResult{
		Label:        "Viale Europa 42, Scandiano",
		Municipality: "Scandiano",
		Province:     "Reggio Emilia",
		CountryCode:  "IT",
	}
	if resultMatchesQuery("Viale Europa 42, Roma", "IT", scandiano) {
		t.Fatal("il comune del risultato non corrisponde a quello chiesto")
	}

	rome := GeocodeResult{
		Label:        "Viale Europa 42, Roma",
		Municipality: "Roma",
		Province:     "Roma Capitale",
		CountryCode:  "IT",
	}
	if !resultMatchesQuery("Viale Europa 42, Roma", "IT", rome) {
		t.Fatal("il comune corretto e' stato rifiutato")
	}
}

func TestResultMatchesQueryToleratesRealWorldNaming(t *testing.T) {
	cases := []struct {
		name   string
		query  string
		result GeocodeResult
		want   bool
	}{
		{
			"provincia al posto del comune",
			"Via Emilia 1, Roma",
			GeocodeResult{Municipality: "Ostia", Province: "Roma Capitale", CountryCode: "IT"},
			true,
		},
		{
			"accenti ignorati",
			"Piazza Saffi 1, Forlì",
			GeocodeResult{Municipality: "Forli", CountryCode: "IT"},
			true,
		},
		{
			// People write "Reggio Emilia"; the comune is "Reggio nell'Emilia".
			"nome ufficiale piu' lungo",
			"Via Roma 1, Reggio Emilia",
			GeocodeResult{Municipality: "Reggio nell'Emilia", CountryCode: "IT"},
			true,
		},
		{
			"comune diverso che condivide una parola",
			"Via Roma 1, Reggio Emilia",
			GeocodeResult{Municipality: "Reggio Calabria", CountryCode: "IT"},
			false,
		},
		{
			"query senza localita' passa sul solo paese",
			"Grottaferrata",
			GeocodeResult{Municipality: "Grottaferrata", CountryCode: "IT"},
			true,
		},
		{
			"CAP finale non conta come localita'",
			"Via Roma 12, 00046",
			GeocodeResult{Municipality: "Grottaferrata", Postcode: "00046", CountryCode: "IT"},
			true,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := resultMatchesQuery(tc.query, "IT", tc.result); got != tc.want {
				t.Fatalf("resultMatchesQuery(%q) = %v, atteso %v", tc.query, got, tc.want)
			}
		})
	}
}

func TestQueryLocalitySkipsShortTrailingTokens(t *testing.T) {
	if got := queryLocality("Via Roma 12, Grottaferrata"); got != "Grottaferrata" {
		t.Fatalf("localita' = %q", got)
	}
	// A trailing province code is not a town; fall back to the previous part.
	if got := queryLocality("Via Roma 12, Grottaferrata, RM"); got != "Grottaferrata" {
		t.Fatalf("con sigla provincia = %q", got)
	}
	if got := queryLocality("Studio Lumen"); got != "" {
		t.Fatalf("senza virgola = %q, atteso vuoto", got)
	}
}

func TestFoldForCompareStripsDiacritics(t *testing.T) {
	if foldForCompare("Forlì") != "forli" {
		t.Fatalf("foldForCompare(Forlì) = %q", foldForCompare("Forlì"))
	}
	if foldForCompare("  REGGIO EMILIA ") != "reggio emilia" {
		t.Fatalf("foldForCompare = %q", foldForCompare("  REGGIO EMILIA "))
	}
}
