GO := mise exec -- go
PNPM := mise exec -- pnpm
# L'app da avviare in sviluppo: demo, o quella creata con pnpm crm:new.
APP ?= demo
DATA_DIR ?= ./apps/$(APP)/server/pb_data
# L'utente di sviluppo, uguale in tutti i gestionali di F2 Labs: solo nel
# database locale, mai in produzione (make dev-user).
DEV_EMAIL := dev@f2labs.test
DEV_PASSWORD := sviluppo-locale

TF_DIR := terraform
TF_ENV ?= production
TF_BACKEND_FILE ?= config/$(TF_ENV)/backend.hcl
TF_VARS_FILE ?= config/$(TF_ENV)/terraform.tfvars
TF_PLAN_FILE ?= plan.out
TF_HCLOUD := ./scripts/terraform-hcloud.sh

.PHONY: dev dev-user deploy-private tf-init tf-fmt tf-fmt-check tf-validate tf-test tf-plan tf-apply tf-output

dev: ## frontend e PocketBase dell'app, con l'utente di sviluppo (Ctrl-C ferma tutto)
	@trap 'kill 0' EXIT; \
	$(PNPM) --filter @crm/$(APP) dev & \
	( until curl -sf http://127.0.0.1:8090/api/health >/dev/null; do sleep 1; done; $(MAKE) dev-user ) & \
	wait

dev-user: ## l'utente di sviluppo nel database locale: dev@f2labs.test, password sviluppo-locale
	@echo '$(DEV_PASSWORD)' | $(GO) run ./apps/$(APP)/server app-user create $(DEV_EMAIL) --name "Sviluppo" --password-stdin --or-update --dir=$(DATA_DIR)

deploy-private:
	./scripts/deploy-private.sh

tf-init:
	@test -f "$(TF_DIR)/$(TF_BACKEND_FILE)" || { echo "Missing $(TF_DIR)/$(TF_BACKEND_FILE); copy the .example file first." >&2; exit 1; }
	terraform -chdir=$(TF_DIR) init -backend-config=$(TF_BACKEND_FILE)

tf-fmt:
	terraform -chdir=$(TF_DIR) fmt -recursive

tf-fmt-check:
	terraform -chdir=$(TF_DIR) fmt -recursive -check

tf-validate:
	terraform -chdir=$(TF_DIR) validate

tf-test:
	terraform -chdir=$(TF_DIR) test

tf-plan:
	@test -f "$(TF_DIR)/$(TF_VARS_FILE)" || { echo "Missing $(TF_DIR)/$(TF_VARS_FILE); copy the .example file first." >&2; exit 1; }
	$(TF_HCLOUD) plan -var-file=$(TF_VARS_FILE) -out=$(TF_PLAN_FILE)

tf-apply:
	@test -f "$(TF_DIR)/$(TF_PLAN_FILE)" || { echo "Missing $(TF_DIR)/$(TF_PLAN_FILE); run make tf-plan first." >&2; exit 1; }
	$(TF_HCLOUD) apply $(TF_PLAN_FILE)

tf-output:
	terraform -chdir=$(TF_DIR) output
