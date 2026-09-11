package assistant

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase/core"
)

// The voice spike connects the browser to GPT-Live over WebRTC. Session
// creation stays on the server, which owns the API key; the browser only
// exchanges its SDP offer. Responses delegation hosts the reasoning loop, but
// every function call comes back to this package and runs through the same
// dispatchTool allow-list and RBAC checks as the text assistant.

const (
	openAIKeyEnv             = "OPENAI_API_KEY"
	voiceAPIURLEnv           = "CRM_VOICE_API_URL"
	voiceLiveModelEnv        = "CRM_VOICE_MODEL"
	voiceBackendModelEnv     = "CRM_VOICE_BACKEND_MODEL"
	defaultVoiceAPIURL       = "https://api.openai.com/v1"
	defaultVoiceLiveModel    = "gpt-live-1"
	defaultVoiceBackendModel = "gpt-5.6-terra"

	maxVoiceSDPBytes      = 64 * 1024
	maxVoiceToolBodyBytes = 64 * 1024
	voiceBackendTimeout   = 45 * time.Second
)

type voiceSessionRequest struct {
	SDP string `json:"sdp"`
}

type voiceSessionResponse struct {
	SessionID string `json:"sessionId"`
	SDP       string `json:"sdp"`
}

type voiceToolRequest struct {
	SessionID string         `json:"sessionId"`
	Operation string         `json:"operation"`
	Args      map[string]any `json:"args"`
}

type openAILiveSession struct {
	Session struct {
		ID string `json:"id"`
	} `json:"session"`
	Transport struct {
		SDP string `json:"sdp"`
	} `json:"transport"`
}

func envOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

// normalizeSDP preserves the browser line endings and guarantees the final
// CRLF OpenAI's parser expects. Trimming the offer like ordinary text made
// session creation fail with "Failed to parse offer ... EOF".
func normalizeSDP(raw string) string {
	return strings.TrimRight(raw, "\r\n") + "\r\n"
}

func (config runtimeConfig) handleVoiceSession(e *core.RequestEvent) error {
	if config.openAIKey == "" {
		return e.InternalServerError("Assistente vocale non configurato.", nil)
	}
	e.Request.Body = http.MaxBytesReader(e.Response, e.Request.Body, maxVoiceSDPBytes)
	var input voiceSessionRequest
	if err := e.BindBody(&input); err != nil {
		return e.BadRequestError("Richiesta non valida.", err)
	}
	input.SDP = normalizeSDP(input.SDP)
	if strings.TrimSpace(input.SDP) == "" || len(input.SDP) > maxVoiceSDPBytes {
		return e.BadRequestError("SDP non valido.", nil)
	}
	result, err := config.createLiveSession(e.Request.Context(), buildVoiceSessionPayload(config, hasWeatherModule(e.App), input.SDP, time.Now()))
	if err != nil {
		return e.InternalServerError("Impossibile avviare la sessione vocale.", err)
	}
	if result.Session.ID == "" || result.Transport.SDP == "" {
		return e.InternalServerError("La sessione vocale non è stata avviata correttamente.", nil)
	}
	return e.JSON(http.StatusOK, voiceSessionResponse{SessionID: result.Session.ID, SDP: result.Transport.SDP})
}

func (config runtimeConfig) handleVoiceTool(e *core.RequestEvent) error {
	actor := e.Auth
	if actor == nil || !actor.GetBool("active") || !platform.Can(e.App, actor, "assistant.use") {
		return e.UnauthorizedError("Utente non autorizzato.", nil)
	}
	e.Request.Body = http.MaxBytesReader(e.Response, e.Request.Body, maxVoiceToolBodyBytes)
	var input voiceToolRequest
	if err := e.BindBody(&input); err != nil {
		return e.BadRequestError("Parametri strumento non validi.", err)
	}
	input.Operation = strings.TrimSpace(input.Operation)
	if input.Operation == "" {
		return e.BadRequestError("Operazione mancante.", nil)
	}
	// The browser sends back the GPT-Live session id so that pending actions
	// stay traceable to the call that prepared them.
	if !sessionIDPattern.MatchString(input.SessionID) {
		return e.BadRequestError("Sessione non valida.", nil)
	}
	if input.Args == nil {
		input.Args = map[string]any{}
	}
	result, err := dispatchTool(e.App, actor, input.SessionID, input.Operation, input.Args)
	if err != nil {
		return e.BadRequestError(err.Error(), err)
	}
	return e.JSON(http.StatusOK, map[string]any{"result": result})
}

func (config runtimeConfig) createLiveSession(ctx context.Context, payload map[string]any) (openAILiveSession, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return openAILiveSession{}, err
	}
	endpoint := strings.TrimRight(config.voiceAPIURL, "/") + "/live/sessions"
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return openAILiveSession{}, err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+config.openAIKey)
	response, err := (&http.Client{Timeout: voiceBackendTimeout}).Do(request)
	if err != nil {
		return openAILiveSession{}, err
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, 1024*1024))
	if err != nil {
		return openAILiveSession{}, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return openAILiveSession{}, fmt.Errorf("openai live session status %d: %s", response.StatusCode, truncate(string(responseBody), 300))
	}
	var result openAILiveSession
	if err := json.Unmarshal(responseBody, &result); err != nil {
		return openAILiveSession{}, err
	}
	return result, nil
}

func hasWeatherModule(app core.App) bool {
	_, err := app.FindCollectionByNameOrId("weather_alerts")
	return err == nil
}

func buildVoiceSessionPayload(config runtimeConfig, weatherAvailable bool, sdp string, now time.Time) map[string]any {
	return map[string]any{
		"session": map[string]any{
			"model":        config.voiceModel,
			"instructions": voiceConversationInstructions,
			"delegation": map[string]any{
				"type": "responses",
				"responses": map[string]any{
					"model":        config.voiceBackendModel,
					"instructions": voiceBackendInstructions(now),
					"tools":        voiceToolSpecs(weatherAvailable),
					"tool_choice":  "auto",
				},
			},
		},
		"transport": map[string]any{"type": "webrtc", "sdp": sdp},
	}
}

const voiceConversationInstructions = `Sei l'assistente vocale di un piccolo CRM italiano. Parla in italiano, in modo breve e naturale.
Quando la richiesta riguarda dati o modifiche del CRM, delega al backend e aspetta il risultato prima di rispondere.
Non inventare mai dati. Per le modifiche di' che la proposta è pronta e che va confermata nell'app: non dire che è già stata eseguita.`

func voiceBackendInstructions(now time.Time) string {
	location, err := time.LoadLocation(defaultTimeZone)
	if err != nil {
		location = time.UTC
	}
	return fmt.Sprintf(`Sei il backend di un assistente vocale per un piccolo CRM. Ricevi richieste pronunciate a voce: possono essere incomplete, corrette a metà o contenere errori di trascrizione. Usa gli strumenti per leggere dati reali e non inventare nulla.

Data e ora correnti: %s (%s).

Regole:
- Per ogni scrittura usa prepare_action: crea solo una proposta in attesa di conferma. Non dichiarare mai un'azione come eseguita.
- Rispondi con pochi fatti verificati, adatti a essere letti ad alta voce: niente elenchi lunghi, niente markdown.
- Se un dettaglio necessario manca o è ambiguo, chiedilo invece di scegliere a caso.
- Se lo strumento restituisce un errore di permesso, spiega brevemente che l'utente non è abilitato.`,
		now.In(location).Format("2006-01-02 15:04"), defaultTimeZone)
}

func voiceToolSpecs(weatherAvailable bool) []map[string]any {
	specs := []map[string]any{
		functionSpec("search_customers", "Cerca clienti per nome, email o telefono.", map[string]any{
			"query": stringProperty("Testo da cercare."),
		}, "query"),
		functionSpec("customer_context", "Legge scheda, contatti, note, interventi e preventivi di un cliente.", map[string]any{
			"customerId": stringProperty("ID del cliente."),
		}, "customerId"),
		functionSpec("team_availability", "Verifica chi è disponibile e chi è assente in un intervallo di date.", map[string]any{
			"from": stringProperty("Inizio intervallo, ISO 8601. Default: adesso."),
			"to":   stringProperty("Fine intervallo, ISO 8601. Default: fra 14 giorni."),
		}),
		functionSpec("agenda", "Elenca gli impegni in agenda in un intervallo di date.", map[string]any{
			"from":    stringProperty("Inizio intervallo, ISO 8601. Default: adesso."),
			"to":      stringProperty("Fine intervallo, ISO 8601. Default: fra 14 giorni."),
			"staffId": stringProperty("Filtra per membro del personale."),
		}),
		functionSpec("work_items", "Elenca interventi e incarichi, con filtri opzionali.", map[string]any{
			"status":     enumProperty("Stato dell'intervento.", "planned", "in_progress", "done", "cancelled"),
			"customerId": stringProperty("Filtra per cliente."),
		}),
		functionSpec("quotes", "Elenca preventivi, con filtri opzionali.", map[string]any{
			"status":     enumProperty("Stato del preventivo.", "draft", "sent", "accepted", "rejected"),
			"customerId": stringProperty("Filtra per cliente."),
		}),
		functionSpec("prepare_action", "Prepara una modifica al CRM. Restituisce un riepilogo da far confermare all'utente: la modifica non è ancora eseguita.", map[string]any{
			"action": map[string]any{
				"type":        "string",
				"description": "Tipo di modifica da preparare.",
				"enum": []string{
					"create_note", "create_work_item", "create_agenda_entry",
					"update_work_item_status", "update_quote_status", "update_leave_status",
				},
			},
			"payload": map[string]any{
				"type":        "object",
				"description": "Campi della modifica: customerId, contactId, id, status, title, body, startAt, endAt, staffId, workItemId, type, kind, priority, location, description.",
				"properties": map[string]any{
					"customerId":  stringProperty("Cliente collegato."),
					"contactId":   stringProperty("Contatto collegato, per le note."),
					"id":          stringProperty("ID del record da aggiornare."),
					"status":      stringProperty("Nuovo stato, per gli aggiornamenti."),
					"title":       stringProperty("Titolo della nota, dell'intervento o dell'impegno."),
					"body":        stringProperty("Testo della nota."),
					"startAt":     stringProperty("Inizio, ISO 8601."),
					"endAt":       stringProperty("Fine, ISO 8601."),
					"staffId":     stringProperty("Membro del personale assegnato."),
					"workItemId":  stringProperty("Intervento collegato."),
					"type":        stringProperty("Tipo di impegno in agenda."),
					"kind":        stringProperty("Tipo di intervento."),
					"priority":    stringProperty("Priorità dell'intervento."),
					"location":    stringProperty("Luogo dell'intervento."),
					"description": stringProperty("Descrizione estesa dell'intervento."),
				},
			},
		}, "action", "payload"),
	}
	// The weather tools read collections owned by an optional module, so they
	// are offered only when that module is installed.
	if weatherAvailable {
		specs = append(specs,
			functionSpec("weather_forecast", "Legge le previsioni meteo di un luogo, un cliente o un intervento.", map[string]any{
				"placeId":    stringProperty("ID del luogo."),
				"customerId": stringProperty("Cliente di cui usare l'indirizzo."),
				"workItemId": stringProperty("Intervento di cui usare il luogo."),
				"query":      stringProperty("Nome del luogo da cercare."),
				"days":       map[string]any{"type": "integer", "description": "Numero di giorni, da 1 a 7."},
			}),
			functionSpec("weather_alerts", "Elenca le allerte meteo aperte sui cantieri.", map[string]any{}),
		)
	}
	return specs
}

func functionSpec(name, description string, properties map[string]any, required ...string) map[string]any {
	if required == nil {
		required = []string{}
	}
	return map[string]any{
		"type":        "function",
		"name":        name,
		"description": description,
		"parameters": map[string]any{
			"type":       "object",
			"properties": properties,
			"required":   required,
		},
	}
}

func stringProperty(description string) map[string]any {
	return map[string]any{"type": "string", "description": description}
}

func enumProperty(description string, values ...string) map[string]any {
	return map[string]any{"type": "string", "description": description, "enum": values}
}
