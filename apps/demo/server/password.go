package main

import (
	"bufio"
	"errors"
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

func validatePasswordArgs(args []string, passwordStdin bool) error {
	if len(args) < 1 || len(args) > 2 {
		return errors.New("specifica EMAIL e la password come argomento oppure con --password-stdin")
	}
	if passwordStdin && len(args) == 2 {
		return errors.New("non specificare PASSWORD insieme a --password-stdin")
	}
	if !passwordStdin && len(args) != 2 {
		return errors.New("PASSWORD mancante: usa l'argomento o --password-stdin")
	}
	return nil
}

func readPassword(command *cobra.Command, args []string, passwordStdin bool) (string, error) {
	if !passwordStdin {
		return validatePassword(args[1])
	}

	scanner := bufio.NewScanner(command.InOrStdin())
	scanner.Buffer(make([]byte, 1024), 4096)
	if !scanner.Scan() {
		if err := scanner.Err(); err != nil {
			return "", fmt.Errorf("lettura password da stdin: %w", err)
		}
		return "", errors.New("password vuota su stdin")
	}
	password := scanner.Text()
	if scanner.Scan() {
		return "", errors.New("la password su stdin deve essere una singola riga")
	}
	return validatePassword(password)
}

func validatePassword(password string) (string, error) {
	if strings.TrimSpace(password) == "" {
		return "", errors.New("la password non può essere vuota")
	}
	return password, nil
}
