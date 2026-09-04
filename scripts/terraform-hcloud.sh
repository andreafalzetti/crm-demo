#!/bin/bash

set -Eeuo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="${ROOT_DIR}/terraform"
AWS_PROFILE_NAME="${AWS_PROFILE:-andrea}"
AWS_REGION_NAME="${AWS_REGION:-eu-central-1}"
AWS_ACCOUNT_ID="766515626185"
HCLOUD_TOKEN_PARAMETER="/platform/production/hetzner/api-token"
SSH_PUBLIC_KEY_FILE="${CRM_SSH_PUBLIC_KEY_FILE:-${HOME}/.ssh/id_ed25519.pub}"

for required_command in aws terraform; do
  if ! command -v "${required_command}" >/dev/null 2>&1; then
    echo "Comando richiesto non trovato: ${required_command}" >&2
    exit 1
  fi
done

actual_account="$(aws sts get-caller-identity \
  --profile "${AWS_PROFILE_NAME}" \
  --query Account \
  --output text)"

if [[ "${actual_account}" != "${AWS_ACCOUNT_ID}" ]]; then
  echo "Account AWS errato: atteso ${AWS_ACCOUNT_ID}, trovato ${actual_account}." >&2
  exit 1
fi

if [[ -z "${TF_VAR_ssh_public_key:-}" ]]; then
  if [[ ! -f "${SSH_PUBLIC_KEY_FILE}" ]]; then
    echo "Chiave SSH pubblica mancante: ${SSH_PUBLIC_KEY_FILE}" >&2
    exit 1
  fi
  export TF_VAR_ssh_public_key="$(<"${SSH_PUBLIC_KEY_FILE}")"
fi

# The plaintext exists only in this process environment and is never written to
# argv, Terraform configuration, plans, state, or repository files.
HCLOUD_TOKEN="$(aws ssm get-parameter \
  --profile "${AWS_PROFILE_NAME}" \
  --region "${AWS_REGION_NAME}" \
  --name "${HCLOUD_TOKEN_PARAMETER}" \
  --with-decryption \
  --query Parameter.Value \
  --output text)"

if [[ -z "${HCLOUD_TOKEN}" || "${HCLOUD_TOKEN}" == "None" ]]; then
  echo "Token Hetzner vuoto in ${HCLOUD_TOKEN_PARAMETER}." >&2
  exit 1
fi

export HCLOUD_TOKEN
export AWS_PROFILE="${AWS_PROFILE_NAME}"
export AWS_REGION="${AWS_REGION_NAME}"

exec terraform -chdir="${TF_DIR}" "$@"
