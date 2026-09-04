package agenda

import "github.com/designferri/crm-demo/internal/platform"

var Permissions = []platform.PermissionDefinition{
	{Key: "agenda.entries.read", Module: "agenda", Label: "Visualizzare agenda", Description: "Consulta appuntamenti e scadenze."},
	{Key: "agenda.entries.create", Module: "agenda", Label: "Creare appuntamenti", Description: "Aggiunge appuntamenti indipendenti."},
	{Key: "agenda.entries.update", Module: "agenda", Label: "Modificare appuntamenti", Description: "Aggiorna gli appuntamenti."},
	{Key: "agenda.entries.delete", Module: "agenda", Label: "Eliminare appuntamenti", Description: "Rimuove gli appuntamenti."},
}
