package quotes

import "github.com/designferri/crm-demo/internal/platform"

var Permissions = []platform.PermissionDefinition{
	{Key: "quotes.quotes.read", Module: "quotes", Label: "Visualizzare preventivi", Description: "Consulta preventivi e importi."},
	{Key: "quotes.quotes.create", Module: "quotes", Label: "Creare preventivi", Description: "Crea nuovi preventivi."},
	{Key: "quotes.quotes.update", Module: "quotes", Label: "Modificare preventivi", Description: "Aggiorna preventivi e stato."},
	{Key: "quotes.quotes.delete", Module: "quotes", Label: "Eliminare preventivi", Description: "Rimuove i preventivi."},
	{Key: "quotes.lines.read", Module: "quotes", Label: "Visualizzare righe preventivo", Description: "Consulta le voci economiche."},
	{Key: "quotes.lines.create", Module: "quotes", Label: "Creare righe preventivo", Description: "Aggiunge voci economiche."},
	{Key: "quotes.lines.update", Module: "quotes", Label: "Modificare righe preventivo", Description: "Aggiorna le voci economiche."},
	{Key: "quotes.lines.delete", Module: "quotes", Label: "Eliminare righe preventivo", Description: "Rimuove le voci economiche."},
	{Key: "quotes.generate", Module: "quotes", Label: "Generare PDF preventivi", Description: "Genera e archivia il PDF del preventivo."},
}
