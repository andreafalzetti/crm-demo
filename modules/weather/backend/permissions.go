package weather

import "github.com/designferri/crm-demo/internal/platform"

var Permissions = []platform.PermissionDefinition{
	{Key: "weather.forecast.read", Module: "weather", Label: "Consultare il meteo", Description: "Vede previsioni e luoghi geolocalizzati."},
	{Key: "weather.places.manage", Module: "weather", Label: "Gestire i luoghi", Description: "Corregge coordinate e rigenera la geocodifica."},
	{Key: "weather.rules.read", Module: "weather", Label: "Visualizzare le regole meteo", Description: "Consulta le soglie che generano le allerte."},
	{Key: "weather.rules.manage", Module: "weather", Label: "Gestire le regole meteo", Description: "Crea e modifica le soglie di allerta."},
	{Key: "weather.alerts.read", Module: "weather", Label: "Visualizzare le allerte", Description: "Consulta le allerte meteo generate."},
	{Key: "weather.alerts.acknowledge", Module: "weather", Label: "Prendere in carico le allerte", Description: "Marca un'allerta come gestita."},
}
