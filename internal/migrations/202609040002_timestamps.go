package migrations

import (
	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

var timestampedCollections = []string{
	"permissions",
	"roles",
	"audit_events",
	"organizations",
	"contacts",
	"notes",
	"activities",
	"documents",
}

func init() {
	m.Register(func(app core.App) error {
		for _, name := range timestampedCollections {
			collection, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				return err
			}
			platform.AddTimestamps(collection)
			if err := app.Save(collection); err != nil {
				return err
			}
		}
		return nil
	}, func(app core.App) error {
		for _, name := range timestampedCollections {
			collection, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				return err
			}
			collection.Fields.RemoveByName("created")
			collection.Fields.RemoveByName("updated")
			if err := app.Save(collection); err != nil {
				return err
			}
		}
		return nil
	})
}
