package assistant

import (
	"errors"
	"fmt"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type recordFieldKind string

const (
	recordFieldString recordFieldKind = "string"
	recordFieldNumber recordFieldKind = "number"
	recordFieldJSON   recordFieldKind = "json"
)

type recordFieldSpec struct {
	target  string
	label   string
	kind    recordFieldKind
	allowed []string
}

type recordActionSpec struct {
	collection       string
	label            string
	createPermission string
	updatePermission string
	fields           map[string]recordFieldSpec
	required         []string
	defaults         func() map[string]any
	display          func(map[string]any) string
	link             func(*core.Record) string
}

func stringField(target, label string, allowed ...string) recordFieldSpec {
	return recordFieldSpec{target: target, label: label, kind: recordFieldString, allowed: allowed}
}

func numberField(target, label string) recordFieldSpec {
	return recordFieldSpec{target: target, label: label, kind: recordFieldNumber}
}

func jsonField(target, label string) recordFieldSpec {
	return recordFieldSpec{target: target, label: label, kind: recordFieldJSON}
}

func recordActionSpecs() map[string]recordActionSpec {
	addressBookLink := func(record *core.Record) string {
		if record.Collection().Name == "organizations" {
			return "/organizations/" + record.Id
		}
		if organization := record.GetString("organization"); organization != "" {
			return "/organizations/" + organization
		}
		return "/organizations"
	}
	personDisplay := func(values map[string]any) string {
		return strings.TrimSpace(valueString(values, "first_name") + " " + valueString(values, "last_name"))
	}
	return map[string]recordActionSpec{
		"customer": {
			collection: "organizations", label: "cliente",
			createPermission: "addressbook.organizations.create", updatePermission: "addressbook.organizations.update",
			fields: map[string]recordFieldSpec{
				"name": stringField("name", "nome"), "legalName": stringField("legal_name", "ragione sociale"),
				"vatNumber": stringField("vat_number", "partita IVA"), "email": stringField("email", "email"),
				"phone": stringField("phone", "telefono"), "website": stringField("website", "sito web"),
				"address": stringField("address", "indirizzo"), "tags": jsonField("tags", "tag"),
				"status":     stringField("status", "stato", "prospect", "active", "archived"),
				"assignedTo": stringField("assigned_to", "assegnatario"),
			},
			required: []string{"name"}, defaults: func() map[string]any { return map[string]any{"status": "prospect"} },
			display: func(values map[string]any) string { return valueString(values, "name") }, link: addressBookLink,
		},
		"contact": {
			collection: "contacts", label: "contatto",
			createPermission: "addressbook.contacts.create", updatePermission: "addressbook.contacts.update",
			fields: map[string]recordFieldSpec{
				"customerId": stringField("organization", "cliente"), "firstName": stringField("first_name", "nome"),
				"lastName": stringField("last_name", "cognome"), "position": stringField("position", "ruolo"),
				"email": stringField("email", "email"), "phone": stringField("phone", "telefono"),
				"mobile": stringField("mobile", "cellulare"), "tags": jsonField("tags", "tag"),
				"status":     stringField("status", "stato", "active", "inactive"),
				"assignedTo": stringField("assigned_to", "assegnatario"),
			},
			required: []string{"firstName", "lastName"}, defaults: func() map[string]any { return map[string]any{"status": "active"} },
			display: personDisplay, link: addressBookLink,
		},
		"note": {
			collection: "notes", label: "nota",
			createPermission: "addressbook.notes.create", updatePermission: "addressbook.notes.update",
			fields: map[string]recordFieldSpec{
				"customerId": stringField("organization", "cliente"), "contactId": stringField("contact", "contatto"),
				"body": stringField("body", "testo"),
			},
			required: []string{"body"}, display: func(values map[string]any) string { return truncate(valueString(values, "body"), 80) }, link: addressBookLink,
		},
		"activity": {
			collection: "activities", label: "attività",
			createPermission: "addressbook.activities.create", updatePermission: "addressbook.activities.update",
			fields: map[string]recordFieldSpec{
				"subject": stringField("subject", "oggetto"), "type": stringField("type", "tipo", "call", "email", "meeting", "task"),
				"status": stringField("status", "stato", "open", "done", "cancelled"),
				"dueAt":  stringField("due_at", "scadenza"), "completedAt": stringField("completed_at", "completata il"),
				"customerId": stringField("organization", "cliente"), "contactId": stringField("contact", "contatto"),
				"assigneeId": stringField("assignee", "assegnatario"),
			},
			required: []string{"subject", "type"}, defaults: func() map[string]any { return map[string]any{"status": "open"} },
			display: func(values map[string]any) string { return valueString(values, "subject") }, link: addressBookLink,
		},
		"work_item": {
			collection: "work_items", label: "intervento",
			createPermission: "workitems.items.create", updatePermission: "workitems.items.update",
			fields: map[string]recordFieldSpec{
				"code": stringField("code", "codice"), "title": stringField("title", "titolo"),
				"kind":       stringField("kind", "tipo", "intervention", "assignment", "event", "session"),
				"status":     stringField("status", "stato", "planned", "in_progress", "done", "cancelled"),
				"priority":   stringField("priority", "priorità", "low", "normal", "high"),
				"customerId": stringField("organization", "cliente"), "startAt": stringField("start_at", "inizio"),
				"endAt": stringField("end_at", "fine"), "location": stringField("location", "luogo"),
				"description": stringField("description", "descrizione"),
			},
			required: []string{"title", "customerId"}, defaults: func() map[string]any {
				return map[string]any{"code": fmt.Sprintf("INT-AI-%d", time.Now().UnixNano()), "kind": "intervention", "status": "planned", "priority": "normal"}
			},
			display: func(values map[string]any) string { return valueString(values, "title") }, link: func(*core.Record) string { return "/work-items" },
		},
		"agenda_entry": {
			collection: "agenda_entries", label: "impegno in agenda",
			createPermission: "agenda.entries.create", updatePermission: "agenda.entries.update",
			fields: map[string]recordFieldSpec{
				"title": stringField("title", "titolo"), "type": stringField("type", "tipo", "appointment", "reminder", "block"),
				"startAt": stringField("start_at", "inizio"), "endAt": stringField("end_at", "fine"),
				"customerId": stringField("organization", "cliente"), "staffId": stringField("staff", "collaboratore"),
				"workItemId": stringField("work_item", "intervento"), "notes": stringField("notes", "note"),
			},
			required: []string{"title", "startAt"}, defaults: func() map[string]any { return map[string]any{"type": "appointment"} },
			display: func(values map[string]any) string { return valueString(values, "title") }, link: func(*core.Record) string { return "/agenda" },
		},
		"staff_member": {
			collection: "staff_members", label: "collaboratore",
			createPermission: "personnel.staff.create", updatePermission: "personnel.staff.update",
			fields: map[string]recordFieldSpec{
				"employeeCode": stringField("employee_code", "codice dipendente"), "firstName": stringField("first_name", "nome"),
				"lastName": stringField("last_name", "cognome"), "email": stringField("email", "email"),
				"phone": stringField("phone", "telefono"), "jobTitle": stringField("job_title", "ruolo"),
				"status": stringField("status", "stato", "active", "inactive"), "userId": stringField("user", "utente"),
			},
			required: []string{"employeeCode", "firstName", "lastName"}, defaults: func() map[string]any { return map[string]any{"status": "active"} },
			display: personDisplay, link: func(*core.Record) string { return "/personnel" },
		},
		"attendance_entry": {
			collection: "attendance_entries", label: "presenza",
			createPermission: "personnel.attendance.create", updatePermission: "personnel.attendance.update",
			fields: map[string]recordFieldSpec{
				"staffId": stringField("staff", "collaboratore"), "day": stringField("day", "giorno"),
				"kind":    stringField("kind", "tipo", "present", "remote", "absent"),
				"clockIn": stringField("clock_in", "entrata"), "clockOut": stringField("clock_out", "uscita"),
				"note": stringField("note", "nota"),
			},
			required: []string{"staffId", "day", "kind"}, display: func(values map[string]any) string { return valueString(values, "day") },
			link: func(*core.Record) string { return "/personnel/attendance" },
		},
		"leave_request": {
			collection: "leave_requests", label: "richiesta ferie/assenza",
			createPermission: "personnel.leave.create", updatePermission: "personnel.leave.update",
			fields: map[string]recordFieldSpec{
				"staffId": stringField("staff", "collaboratore"), "type": stringField("type", "tipo", "vacation", "sick", "permit"),
				"startDate": stringField("start_date", "inizio"), "endDate": stringField("end_date", "fine"),
				"status": stringField("status", "stato", "pending", "approved", "rejected"), "note": stringField("note", "nota"),
			},
			required: []string{"staffId", "type", "startDate", "endDate"}, defaults: func() map[string]any { return map[string]any{"status": "pending"} },
			display: func(values map[string]any) string {
				return valueString(values, "start_date") + " – " + valueString(values, "end_date")
			},
			link: func(*core.Record) string { return "/personnel/attendance" },
		},
		"quote": {
			collection: "quotes", label: "preventivo",
			createPermission: "quotes.quotes.create", updatePermission: "quotes.quotes.update",
			fields: map[string]recordFieldSpec{
				"number": stringField("number", "numero"), "title": stringField("title", "titolo"),
				"status":     stringField("status", "stato", "draft", "sent", "accepted", "rejected"),
				"customerId": stringField("organization", "cliente"), "workItemId": stringField("work_item", "intervento"),
				"validUntil": stringField("valid_until", "valido fino al"), "subtotal": numberField("subtotal", "imponibile"),
				"taxTotal": numberField("tax_total", "imposte"), "total": numberField("total", "totale"),
				"notes": stringField("notes", "note"),
			},
			required: []string{"number", "title", "customerId"}, defaults: func() map[string]any { return map[string]any{"status": "draft"} },
			display: func(values map[string]any) string { return valueString(values, "number") }, link: func(*core.Record) string { return "/quotes" },
		},
		"quote_line": {
			collection: "quote_lines", label: "riga preventivo",
			createPermission: "quotes.lines.create", updatePermission: "quotes.lines.update",
			fields: map[string]recordFieldSpec{
				"quoteId": stringField("quote", "preventivo"), "description": stringField("description", "descrizione"),
				"quantity": numberField("quantity", "quantità"), "unitPrice": numberField("unit_price", "prezzo unitario"),
				"taxRate": numberField("tax_rate", "aliquota"), "position": numberField("position", "posizione"),
			},
			required: []string{"quoteId", "description", "quantity"}, display: func(values map[string]any) string { return valueString(values, "description") },
			link: func(*core.Record) string { return "/quotes" },
		},
	}
}

func validateRecordAction(app core.App, actor *core.Record, action string, payload map[string]any) (string, error) {
	resource := argString(payload, "resource")
	spec, ok := recordActionSpecs()[resource]
	if !ok {
		return "", errors.New("tipo di record non consentito")
	}
	fields, _ := payload["fields"].(map[string]any)
	values, labels, err := normalizeRecordFields(spec, fields, action == "create_record")
	if err != nil {
		return "", err
	}

	switch action {
	case "create_record":
		if err := requirePermission(app, actor, spec.createPermission); err != nil {
			return "", err
		}
		return fmt.Sprintf("Creare %s “%s”", articleFor(spec.label), truncate(spec.display(values), 120)), nil
	case "update_record":
		if err := requirePermission(app, actor, spec.updatePermission); err != nil {
			return "", err
		}
		record, err := app.FindRecordById(spec.collection, argString(payload, "id"))
		if err != nil {
			return "", errors.New("record da modificare non trovato")
		}
		return fmt.Sprintf("Modificare %s “%s”: %s", articleFor(spec.label), truncate(recordDisplay(spec, record), 120), strings.Join(labels, ", ")), nil
	default:
		return "", errors.New("azione record non consentita")
	}
}

func findAssistantRecords(app core.App, actor *core.Record, args map[string]any) (map[string]any, error) {
	resource := argString(args, "resource")
	spec, ok := recordActionSpecs()[resource]
	if !ok {
		return nil, errors.New("tipo di record non consentito")
	}
	readPermission := strings.TrimSuffix(spec.createPermission, ".create") + ".read"
	if err := requirePermission(app, actor, readPermission); err != nil {
		return nil, err
	}
	if id := argString(args, "id"); id != "" {
		record, err := app.FindRecordById(spec.collection, id)
		if err != nil {
			return nil, errors.New("record non trovato")
		}
		return map[string]any{"record": assistantRecordView(resource, spec, record)}, nil
	}

	query := argString(args, "query")
	if len(query) > 120 {
		return nil, errors.New("ricerca troppo lunga")
	}
	filter := ""
	params := dbx.Params{}
	if query != "" {
		parts := make([]string, 0, len(recordSearchFields(spec.collection)))
		for index, field := range recordSearchFields(spec.collection) {
			parameter := fmt.Sprintf("query%d", index)
			parts = append(parts, field+" ~ {:"+parameter+"}")
			params[parameter] = query
		}
		filter = strings.Join(parts, " || ")
	}
	records, err := app.FindRecordsByFilter(spec.collection, filter, "-created", 20, 0, params)
	if err != nil {
		return nil, err
	}
	items := make([]map[string]any, 0, len(records))
	for _, record := range records {
		items = append(items, assistantRecordView(resource, spec, record))
	}
	return map[string]any{"records": items, "count": len(items), "resource": resource}, nil
}

func applyRecordAction(app core.App, actor *core.Record, action string, payload map[string]any) (map[string]any, error) {
	resource := argString(payload, "resource")
	spec, ok := recordActionSpecs()[resource]
	if !ok {
		return nil, errors.New("tipo di record non consentito")
	}
	fields, _ := payload["fields"].(map[string]any)
	values, _, err := normalizeRecordFields(spec, fields, action == "create_record")
	if err != nil {
		return nil, err
	}

	var record *core.Record
	var before map[string]any
	operation := "create"
	if action == "create_record" {
		collection, findErr := app.FindCollectionByNameOrId(spec.collection)
		if findErr != nil {
			return nil, findErr
		}
		record = core.NewRecord(collection)
	} else {
		operation = "update"
		record, err = app.FindRecordById(spec.collection, argString(payload, "id"))
		if err != nil {
			return nil, err
		}
		before = record.PublicExport()
	}

	for key, value := range values {
		record.Set(key, value)
	}
	if action == "create_record" {
		setRecordCreator(record, actor)
	}
	if spec.collection == "leave_requests" {
		if status, changed := values["status"].(string); changed {
			if status == "approved" || status == "rejected" {
				record.Set("decided_by", actor.Id)
			} else {
				record.Set("decided_by", "")
			}
		}
	}
	if err := app.Save(record); err != nil {
		return nil, err
	}
	platform.RecordAudit(app, actor, operation, spec.collection, record.Id, before, record.PublicExport())
	return map[string]any{
		"id": record.Id, "resource": resource, "collection": spec.collection,
		"operation": operation, "link": spec.link(record),
	}, nil
}

func normalizeRecordFields(spec recordActionSpec, fields map[string]any, creating bool) (map[string]any, []string, error) {
	if len(fields) == 0 {
		return nil, nil, errors.New("fields deve contenere almeno un campo")
	}
	if len(fields) > len(spec.fields) {
		return nil, nil, errors.New("troppi campi nella modifica")
	}
	values := map[string]any{}
	labels := make([]string, 0, len(fields))
	for name, value := range fields {
		field, ok := spec.fields[name]
		if !ok {
			return nil, nil, fmt.Errorf("campo %s non consentito per questo record", name)
		}
		if err := validateRecordField(name, field, value); err != nil {
			return nil, nil, err
		}
		if slices.Contains(spec.required, name) && isEmptyRecordValue(value) {
			return nil, nil, fmt.Errorf("il campo %s non può essere vuoto", name)
		}
		values[field.target] = value
		labels = append(labels, field.label)
	}
	if creating && spec.defaults != nil {
		for key, value := range spec.defaults() {
			if _, exists := values[key]; !exists {
				values[key] = value
			}
		}
	}
	if creating {
		for _, required := range spec.required {
			field := spec.fields[required]
			if isEmptyRecordValue(values[field.target]) {
				return nil, nil, fmt.Errorf("campo obbligatorio mancante: %s", required)
			}
		}
		if spec.collection == "notes" && valueString(values, "organization") == "" && valueString(values, "contact") == "" {
			return nil, nil, errors.New("la nota richiede cliente o contatto")
		}
	}
	sort.Strings(labels)
	return values, labels, nil
}

func validateRecordField(name string, field recordFieldSpec, value any) error {
	if value == nil {
		return fmt.Errorf("il campo %s non può essere null", name)
	}
	switch field.kind {
	case recordFieldString:
		text, ok := value.(string)
		if !ok {
			return fmt.Errorf("il campo %s deve essere una stringa", name)
		}
		if len(field.allowed) > 0 && !slices.Contains(field.allowed, strings.TrimSpace(text)) {
			return fmt.Errorf("valore non valido per %s", name)
		}
	case recordFieldNumber:
		switch value.(type) {
		case float64, float32, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		default:
			return fmt.Errorf("il campo %s deve essere numerico", name)
		}
	case recordFieldJSON:
		// PocketBase validates JSON size and shape when saving the record.
	default:
		return fmt.Errorf("tipo campo non supportato per %s", name)
	}
	return nil
}

func setRecordCreator(record *core.Record, actor *core.Record) {
	switch record.Collection().Name {
	case "notes":
		record.Set("author", actor.Id)
	case "activities", "work_items", "agenda_entries", "attendance_entries", "leave_requests", "quotes":
		record.Set("created_by", actor.Id)
	}
}

func recordDisplay(spec recordActionSpec, record *core.Record) string {
	values := map[string]any{}
	for _, field := range spec.fields {
		values[field.target] = record.Get(field.target)
	}
	if display := strings.TrimSpace(spec.display(values)); display != "" {
		return display
	}
	return record.Id
}

func assistantRecordView(resource string, spec recordActionSpec, record *core.Record) map[string]any {
	fields := make(map[string]any, len(spec.fields))
	for name, field := range spec.fields {
		fields[name] = record.Get(field.target)
	}
	return map[string]any{
		"id": record.Id, "resource": resource, "fields": fields,
		"created": record.GetString("created"), "updated": record.GetString("updated"), "link": spec.link(record),
	}
}

func recordSearchFields(collection string) []string {
	switch collection {
	case "organizations":
		return []string{"name", "legal_name", "email", "phone", "vat_number"}
	case "contacts":
		return []string{"first_name", "last_name", "email", "phone", "mobile"}
	case "notes":
		return []string{"body"}
	case "activities":
		return []string{"subject"}
	case "work_items":
		return []string{"code", "title", "description"}
	case "agenda_entries":
		return []string{"title", "notes"}
	case "staff_members":
		return []string{"employee_code", "first_name", "last_name", "email"}
	case "attendance_entries", "leave_requests":
		return []string{"note"}
	case "quotes":
		return []string{"number", "title", "notes"}
	case "quote_lines":
		return []string{"description"}
	default:
		return []string{"id"}
	}
}

func valueString(values map[string]any, key string) string {
	value, _ := values[key].(string)
	return strings.TrimSpace(value)
}

func isEmptyRecordValue(value any) bool {
	if value == nil {
		return true
	}
	text, ok := value.(string)
	return ok && strings.TrimSpace(text) == ""
}

func articleFor(label string) string {
	if label == "attività" || label == "intervento" || label == "impegno in agenda" {
		return "l’" + label
	}
	if strings.HasSuffix(label, "a") {
		return "la " + label
	}
	return "il " + label
}
