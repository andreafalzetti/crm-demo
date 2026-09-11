package assistant

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestBuildVoiceSessionPayload(t *testing.T) {
	config := runtimeConfig{
		voiceModel:        "gpt-live-test",
		voiceBackendModel: "gpt-backend-test",
	}
	now := time.Date(2026, time.September, 10, 9, 30, 0, 0, time.UTC)
	payload := buildVoiceSessionPayload(config, true, "v=0", now)

	session, ok := payload["session"].(map[string]any)
	if !ok {
		t.Fatalf("session missing: %#v", payload["session"])
	}
	if session["model"] != "gpt-live-test" {
		t.Fatalf("voice model = %v", session["model"])
	}
	delegation, ok := session["delegation"].(map[string]any)
	if !ok || delegation["type"] != "responses" {
		t.Fatalf("delegation = %#v", session["delegation"])
	}
	responses, ok := delegation["responses"].(map[string]any)
	if !ok || responses["model"] != "gpt-backend-test" {
		t.Fatalf("responses delegation = %#v", delegation["responses"])
	}
	if responses["tool_choice"] != "auto" {
		t.Fatalf("tool_choice = %v", responses["tool_choice"])
	}
	instructions, _ := responses["instructions"].(string)
	if !strings.Contains(instructions, "2026-09-10 11:30") {
		t.Fatalf("backend instructions missing current time: %s", instructions)
	}
	for _, name := range []string{"search_customers", "prepare_action", "weather_forecast"} {
		if !hasFunctionTool(t, responses["tools"], name) {
			t.Fatalf("tool %s not offered", name)
		}
	}
	transport, ok := payload["transport"].(map[string]any)
	if !ok || transport["type"] != "webrtc" || transport["sdp"] != "v=0" {
		t.Fatalf("transport = %#v", payload["transport"])
	}
}

func TestVoiceToolSpecsSkipWeatherWithoutModule(t *testing.T) {
	specs := voiceToolSpecs(false)
	if hasFunctionTool(t, specs, "weather_forecast") || hasFunctionTool(t, specs, "weather_alerts") {
		t.Fatal("weather tools offered without the weather module")
	}
	if !hasFunctionTool(t, specs, "search_customers") {
		t.Fatal("core tools missing")
	}
}

func TestNormalizeSDPKeepsTrailingNewline(t *testing.T) {
	if got := normalizeSDP("v=0\r\na=1"); got != "v=0\r\na=1\r\n" {
		t.Fatalf("normalizeSDP() = %q", got)
	}
	if got := normalizeSDP("v=0\r\n"); got != "v=0\r\n" {
		t.Fatalf("normalizeSDP() = %q", got)
	}
	if got := normalizeSDP("v=0\n"); got != "v=0\r\n" {
		t.Fatalf("normalizeSDP() = %q", got)
	}
}

func TestCreateLiveSession(t *testing.T) {
	var gotAuth string
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		gotAuth = request.Header.Get("Authorization")
		if request.Method != http.MethodPost || request.URL.Path != "/live/sessions" {
			t.Errorf("unexpected request %s %s", request.Method, request.URL.Path)
		}
		writer.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(writer, `{"session":{"id":"live_123"},"transport":{"type":"webrtc","sdp":"answer-sdp"}}`)
	}))
	defer server.Close()

	config := runtimeConfig{openAIKey: "test-key", voiceAPIURL: server.URL}
	result, err := config.createLiveSession(context.Background(), map[string]any{"session": map[string]any{}})
	if err != nil {
		t.Fatal(err)
	}
	if gotAuth != "Bearer test-key" {
		t.Fatalf("authorization header = %q", gotAuth)
	}
	if result.Session.ID != "live_123" || result.Transport.SDP != "answer-sdp" {
		t.Fatalf("unexpected result: %#v", result)
	}
}

func TestCreateLiveSessionReportsUpstreamErrors(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.WriteHeader(http.StatusUnauthorized)
		_, _ = io.WriteString(writer, `{"error":{"message":"invalid key"}}`)
	}))
	defer server.Close()

	config := runtimeConfig{openAIKey: "test-key", voiceAPIURL: server.URL}
	_, err := config.createLiveSession(context.Background(), map[string]any{})
	if err == nil || !strings.Contains(err.Error(), "401") {
		t.Fatalf("error = %v, want upstream status", err)
	}
}

func hasFunctionTool(t *testing.T, tools any, name string) bool {
	t.Helper()
	items, ok := tools.([]map[string]any)
	if !ok {
		t.Fatalf("tools are not a spec list: %#v", tools)
	}
	for _, item := range items {
		if item["type"] == "function" && item["name"] == name {
			if _, ok := item["parameters"].(map[string]any); !ok {
				t.Fatalf("tool %s has no parameters schema", name)
			}
			return true
		}
	}
	return false
}
