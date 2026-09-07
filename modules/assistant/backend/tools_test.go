package assistant

import (
	"strings"
	"testing"
)

func TestDecodeToolArgsJSON(t *testing.T) {
	args, err := decodeToolArgsJSON(`{"action":"create_record","payload":{"resource":"agenda_entry"}}`)
	if err != nil {
		t.Fatalf("decodeToolArgsJSON() error = %v", err)
	}
	if args["action"] != "create_record" {
		t.Fatalf("action = %v, want create_record", args["action"])
	}
	payload, ok := args["payload"].(map[string]any)
	if !ok || payload["resource"] != "agenda_entry" {
		t.Fatalf("payload = %#v, want agenda_entry resource", args["payload"])
	}
}

func TestDecodeToolArgsJSONRejectsInvalidValues(t *testing.T) {
	tests := []struct {
		name  string
		value string
	}{
		{name: "invalid JSON", value: `{`},
		{name: "not an object", value: `"text"`},
		{name: "too long", value: `{"value":"` + strings.Repeat("x", maxToolArgsJSONBytes) + `"}`},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if _, err := decodeToolArgsJSON(test.value); err == nil {
				t.Fatal("decodeToolArgsJSON() error = nil, want error")
			}
		})
	}
}
