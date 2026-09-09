package main

import (
	"github.com/designferri/crm-demo/internal/platform"
	addressbook "github.com/designferri/crm-demo/modules/address-book/backend"
	_ "github.com/designferri/crm-demo/modules/address-book/backend/migrations"
	agenda "github.com/designferri/crm-demo/modules/agenda/backend"
	_ "github.com/designferri/crm-demo/modules/agenda/backend/migrations"
	assistant "github.com/designferri/crm-demo/modules/assistant/backend"
	_ "github.com/designferri/crm-demo/modules/assistant/backend/migrations"
	personnel "github.com/designferri/crm-demo/modules/personnel/backend"
	_ "github.com/designferri/crm-demo/modules/personnel/backend/migrations"
	quotes "github.com/designferri/crm-demo/modules/quotes/backend"
	_ "github.com/designferri/crm-demo/modules/quotes/backend/migrations"
	weather "github.com/designferri/crm-demo/modules/weather/backend"
	_ "github.com/designferri/crm-demo/modules/weather/backend/migrations"
	workitems "github.com/designferri/crm-demo/modules/work-items/backend"
	_ "github.com/designferri/crm-demo/modules/work-items/backend/migrations"
)

func crmModules() []platform.Module {
	return []platform.Module{
		addressbook.Module{},
		personnel.Module{},
		workitems.Module{},
		agenda.Module{},
		quotes.Module{IssuerName: "Ferri & Co.", AccentHex: "#087f48"},
		weather.Module{},
		assistant.Module{},
	}
}
