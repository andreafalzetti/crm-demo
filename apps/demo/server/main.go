package main

import (
	"errors"
	"fmt"
	"log"

	_ "github.com/designferri/crm-demo/internal/migrations"
	"github.com/designferri/crm-demo/internal/platform"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/spf13/cobra"
)

func main() {
	app := pocketbase.New()
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{Automigrate: false})
	platform.Register(app, crmModules()...)
	registerStaticAssets(app)
	registerUserCommand(app)
	registerSuperuserCommand(app)
	registerDemoSeedCommand(app)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func registerUserCommand(app *pocketbase.PocketBase) {
	userCommand := &cobra.Command{Use: "app-user", Short: "Gestisce gli utenti applicativi CRM"}
	var passwordStdin bool
	var ifNotExists bool
	createCommand := &cobra.Command{
		Use:          "create EMAIL [PASSWORD]",
		Short:        "Crea il primo utente applicativo",
		SilenceUsage: true,
		Args: func(command *cobra.Command, args []string) error {
			return validatePasswordArgs(args, passwordStdin)
		},
		RunE: func(command *cobra.Command, args []string) error {
			name, _ := command.Flags().GetString("name")
			roleKey, _ := command.Flags().GetString("role")
			if name == "" {
				return errors.New("il nome è obbligatorio")
			}
			if ifNotExists {
				if _, err := app.FindAuthRecordByEmail("users", args[0]); err == nil {
					fmt.Printf("Utente %s già presente; nessuna modifica.\n", args[0])
					return nil
				}
			}
			password, err := readPassword(command, args, passwordStdin)
			if err != nil {
				return err
			}
			role, err := app.FindFirstRecordByData("roles", "key", roleKey)
			if err != nil {
				return fmt.Errorf("ruolo %q non trovato: %w", roleKey, err)
			}
			collection, err := app.FindCollectionByNameOrId("users")
			if err != nil {
				return err
			}
			user := core.NewRecord(collection)
			user.SetEmail(args[0])
			user.SetPassword(password)
			user.SetVerified(true)
			user.Set("name", name)
			user.Set("active", true)
			user.Set("must_change_password", false)
			user.Set("roles", []string{role.Id})
			if err := app.Save(user); err != nil {
				return err
			}
			fmt.Printf("Utente %s creato con ruolo %s.\n", args[0], roleKey)
			return nil
		},
	}
	createCommand.Flags().String("name", "", "Nome visualizzato")
	createCommand.Flags().String("role", "administrator", "Chiave del ruolo")
	createCommand.Flags().BoolVar(&passwordStdin, "password-stdin", false, "Legge la password da una singola riga su stdin")
	createCommand.Flags().BoolVar(&ifNotExists, "if-not-exists", false, "Non modifica l'utente se esiste già")
	userCommand.AddCommand(createCommand)
	app.RootCmd.AddCommand(userCommand)
}
