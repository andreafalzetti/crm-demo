package platform

import "github.com/pocketbase/pocketbase/core"

func AddTimestamps(collection *core.Collection) {
	if collection.Fields.GetByName("created") == nil {
		collection.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
	}
	if collection.Fields.GetByName("updated") == nil {
		collection.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
	}
}
