package assistant

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

var sessionIDPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{8,100}$`)

type chatRequest struct {
	Message   string `json:"message"`
	SessionID string `json:"sessionId"`
}

type confirmationView struct {
	ID      string `json:"id"`
	Action  string `json:"action"`
	Summary string `json:"summary"`
	Status  string `json:"status"`
}

type recordLink struct {
	Label string `json:"label"`
	To    string `json:"to"`
}

type chatResponse struct {
	Message       string             `json:"message"`
	Confirmations []confirmationView `json:"confirmations"`
	Links         []recordLink       `json:"links"`
}

func (config runtimeConfig) handleChat(e *core.RequestEvent) error {
	if len(config.sharedSecret) < 32 || config.workflowURL == "" {
		return e.InternalServerError("Assistente non configurato.", nil)
	}
	var input chatRequest
	if err := e.BindBody(&input); err != nil {
		return e.BadRequestError("Richiesta non valida.", err)
	}
	input.Message = strings.TrimSpace(input.Message)
	if input.Message == "" || len([]rune(input.Message)) > 2000 {
		return e.BadRequestError("Il messaggio deve contenere da 1 a 2000 caratteri.", nil)
	}
	if !sessionIDPattern.MatchString(input.SessionID) {
		return e.BadRequestError("Sessione non valida.", nil)
	}

	token, err := signDelegation(config.sharedSecret, delegationClaims{
		UserID:    e.Auth.Id,
		SessionID: input.SessionID,
		ExpiresAt: time.Now().Add(5 * time.Minute).Unix(),
	})
	if err != nil {
		return e.InternalServerError("Impossibile delegare la richiesta.", err)
	}
	payload, err := json.Marshal(map[string]any{
		"chatInput":       input.Message,
		"sessionId":       input.SessionID,
		"delegationToken": token,
		"user": map[string]string{
			"id":   e.Auth.Id,
			"name": e.Auth.GetString("name"),
		},
	})
	if err != nil {
		return e.InternalServerError("Impossibile preparare la richiesta.", err)
	}
	req, err := http.NewRequestWithContext(e.Request.Context(), http.MethodPost, config.workflowURL, bytes.NewReader(payload))
	if err != nil {
		return e.InternalServerError("Endpoint assistente non valido.", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CRM-Assistant-Key", config.sharedSecret)
	response, err := (&http.Client{Timeout: 90 * time.Second}).Do(req)
	if err != nil {
		return e.InternalServerError("L'assistente non è raggiungibile.", err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(io.LimitReader(response.Body, 1024*1024))
	if err != nil {
		return e.InternalServerError("Risposta assistente non leggibile.", err)
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		e.App.Logger().Error("assistant workflow failed", "status", response.StatusCode, "body", string(body))
		return e.InternalServerError("L'assistente ha restituito un errore.", nil)
	}

	result, err := normalizeChatResponse(body)
	if err != nil {
		return e.InternalServerError("Risposta assistente non valida.", err)
	}
	result.Confirmations = canonicalConfirmations(e.App, e.Auth, result.Confirmations)
	result.Links = canonicalLinks(result.Links)
	return e.JSON(http.StatusOK, result)
}

func normalizeChatResponse(body []byte) (chatResponse, error) {
	var envelope map[string]any
	if err := json.Unmarshal(body, &envelope); err != nil {
		return chatResponse{}, err
	}
	candidate := envelope
	if output, ok := envelope["output"].(string); ok {
		output = strings.TrimSpace(strings.TrimPrefix(strings.TrimSuffix(output, "```"), "```json"))
		if err := json.Unmarshal([]byte(output), &candidate); err != nil {
			return chatResponse{Message: output, Confirmations: []confirmationView{}, Links: []recordLink{}}, nil
		}
	}
	raw, err := json.Marshal(candidate)
	if err != nil {
		return chatResponse{}, err
	}
	var result chatResponse
	if err := json.Unmarshal(raw, &result); err != nil {
		return chatResponse{}, err
	}
	result.Message = strings.TrimSpace(result.Message)
	if result.Message == "" {
		return chatResponse{}, fmt.Errorf("missing assistant message")
	}
	if result.Confirmations == nil {
		result.Confirmations = []confirmationView{}
	}
	if result.Links == nil {
		result.Links = []recordLink{}
	}
	return result, nil
}

func canonicalConfirmations(app core.App, actor *core.Record, requested []confirmationView) []confirmationView {
	result := make([]confirmationView, 0, len(requested))
	seen := map[string]bool{}
	for _, item := range requested {
		if seen[item.ID] {
			continue
		}
		record, err := app.FindRecordById("assistant_actions", item.ID)
		if err != nil || record.GetString("actor") != actor.Id || record.GetString("status") != "pending" {
			continue
		}
		seen[item.ID] = true
		result = append(result, confirmationView{
			ID:      record.Id,
			Action:  record.GetString("action"),
			Summary: record.GetString("summary"),
			Status:  record.GetString("status"),
		})
	}
	return result
}

func canonicalLinks(requested []recordLink) []recordLink {
	allowedRoots := []string{
		"/organizations",
		"/work-items",
		"/agenda",
		"/quotes",
		"/personnel",
	}
	result := make([]recordLink, 0, len(requested))
	for _, item := range requested {
		item.Label = truncate(strings.TrimSpace(item.Label), 100)
		item.To = strings.TrimSpace(item.To)
		if item.Label == "" || strings.Contains(item.To, "//") {
			continue
		}
		for _, root := range allowedRoots {
			if item.To == root || strings.HasPrefix(item.To, root+"/") {
				result = append(result, item)
				break
			}
		}
	}
	return result
}
