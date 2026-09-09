package main

import (
	"context"
	"fmt"
	"time"

	weather "github.com/designferri/crm-demo/modules/weather/backend"
	"github.com/pocketbase/pocketbase"
	"github.com/spf13/cobra"
)

// registerWeatherCommand exposes the weather module's scheduled work as CLI
// commands, so an existing instance can be brought up to date without waiting
// for the crons and so a deploy can seed the data in one pass.
func registerWeatherCommand(app *pocketbase.PocketBase) {
	weatherCommand := &cobra.Command{Use: "weather", Short: "Geocodifica e previsioni meteo"}

	var skipResolve bool
	backfillCommand := &cobra.Command{
		Use:          "backfill",
		Short:        "Collega i luoghi agli indirizzi già presenti e li geocodifica",
		SilenceUsage: true,
		RunE: func(command *cobra.Command, _ []string) error {
			ctx, cancel := context.WithTimeout(command.Context(), 15*time.Minute)
			defer cancel()
			result, err := weather.Backfill(ctx, app, weather.NewGeocoderFromEnv(), !skipResolve)
			if err != nil {
				return err
			}
			fmt.Printf(
				"Luoghi collegati: %d, geocodificati: %d, non risolti: %d, invariati: %d.\n",
				result.Linked, result.Resolved, result.Unresolved, result.Skipped,
			)
			return nil
		},
	}
	backfillCommand.Flags().BoolVar(&skipResolve, "no-resolve", false, "Accoda soltanto, lascia la geocodifica al job schedulato")

	refreshCommand := &cobra.Command{
		Use:          "refresh",
		Short:        "Aggiorna subito le previsioni dei luoghi attivi",
		SilenceUsage: true,
		RunE: func(command *cobra.Command, _ []string) error {
			ctx, cancel := context.WithTimeout(command.Context(), 15*time.Minute)
			defer cancel()
			if err := weather.RefreshActivePlaces(ctx, app, weather.NewMetClientFromEnv()); err != nil {
				return err
			}
			fmt.Println("Previsioni aggiornate.")
			return nil
		},
	}

	alertsCommand := &cobra.Command{
		Use:          "alerts",
		Short:        "Valuta subito le regole di allerta sulle previsioni in cache",
		SilenceUsage: true,
		RunE: func(command *cobra.Command, _ []string) error {
			ctx, cancel := context.WithTimeout(command.Context(), 5*time.Minute)
			defer cancel()
			if err := weather.EvaluateAlerts(ctx, app, time.Now()); err != nil {
				return err
			}
			fmt.Println("Allerte valutate.")
			return nil
		},
	}

	weatherCommand.AddCommand(backfillCommand, refreshCommand, alertsCommand)
	app.RootCmd.AddCommand(weatherCommand)
}
