TF_DIR := terraform
TF_ENV ?= production
TF_BACKEND_FILE ?= config/$(TF_ENV)/backend.hcl
TF_VARS_FILE ?= config/$(TF_ENV)/terraform.tfvars
TF_PLAN_FILE ?= plan.out
TF_HCLOUD := ./scripts/terraform-hcloud.sh

.PHONY: tf-init tf-fmt tf-fmt-check tf-validate tf-test tf-plan tf-apply tf-output

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
