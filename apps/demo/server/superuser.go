package main

import (
	"fmt"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/spf13/cobra"
)

func registerSuperuserCommand(app *pocketbase.PocketBase) {
	var passwordStdin bool
	command := &cobra.Command{
		Use:          "app-superuser EMAIL [PASSWORD]",
		Short:        "Crea o aggiorna un superuser leggendo la password in modo sicuro",
		SilenceUsage: true,
		Args: func(command *cobra.Command, args []string) error {
			return validatePasswordArgs(args, passwordStdin)
		},
		RunE: func(command *cobra.Command, args []string) error {
			password, err := readPassword(command, args, passwordStdin)
			if err != nil {
				return err
			}
			collection, err := app.FindCachedCollectionByNameOrId(core.CollectionNameSuperusers)
			if err != nil {
				return fmt.Errorf("collection superuser non disponibile: %w", err)
			}
			superuser, err := app.FindAuthRecordByEmail(collection, args[0])
			if err != nil {
				superuser = core.NewRecord(collection)
			}
			superuser.SetEmail(args[0])
			superuser.SetPassword(password)
			if err := app.Save(superuser); err != nil {
				return fmt.Errorf("salvataggio superuser: %w", err)
			}
			fmt.Printf("Superuser %s configurato.\n", args[0])
			return nil
		},
	}
	command.Flags().BoolVar(&passwordStdin, "password-stdin", false, "Legge la password da una singola riga su stdin")
	app.RootCmd.AddCommand(command)
}
