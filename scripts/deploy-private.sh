#!/bin/bash

set -Eeuo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS_PROFILE_NAME="${AWS_PROFILE:-andrea}"
AWS_REGION_NAME="${AWS_REGION:-eu-central-1}"
AWS_ACCOUNT_ID="766515626185"
REMOTE_HOST="${CRM_REMOTE_HOST:-deploy@crm-platform-production}"
REMOTE_ROOT="/opt/crm-platform/src/crm-demo"
COMPOSE_FILE="deploy/private/compose.yaml"
PB_KEY_PARAMETER="/crm-demo/production/demo/pocketbase/encryption-key"
APP_PASSWORD_PARAMETER="/crm-demo/production/demo/app-user/password"
SUPERUSER_PASSWORD_PARAMETER="/crm-demo/production/demo/pocketbase/superuser-password"
ASSISTANT_SECRET_PARAMETER="/crm-demo/production/demo/assistant/shared-secret"
APP_USER_EMAIL="${CRM_APP_USER_EMAIL:-demo@designferri.local}"
SUPERUSER_EMAIL="${CRM_SUPERUSER_EMAIL:-admin@designferri.local}"

for required_command in aws git mktemp scp ssh; do
  if ! command -v "${required_command}" >/dev/null 2>&1; then
    echo "Comando richiesto non trovato: ${required_command}" >&2
    exit 1
  fi
done

if ! git -C "${ROOT_DIR}" diff --quiet || ! git -C "${ROOT_DIR}" diff --cached --quiet; then
  echo "Il worktree deve essere pulito prima del deploy." >&2
  exit 1
fi

commit="$(git -C "${ROOT_DIR}" rev-parse HEAD)"
remote_commit="$(git -C "${ROOT_DIR}" ls-remote origin refs/heads/main | awk '{print $1}')"
if [[ "${commit}" != "${remote_commit}" ]]; then
  echo "Il commit locale deve coincidere con origin/main prima del deploy." >&2
  exit 1
fi

actual_account="$(aws sts get-caller-identity \
  --profile "${AWS_PROFILE_NAME}" \
  --query Account \
  --output text)"
if [[ "${actual_account}" != "${AWS_ACCOUNT_ID}" ]]; then
  echo "Account AWS errato: atteso ${AWS_ACCOUNT_ID}, trovato ${actual_account}." >&2
  exit 1
fi

get_secret() {
  aws ssm get-parameter \
    --profile "${AWS_PROFILE_NAME}" \
    --region "${AWS_REGION_NAME}" \
    --name "$1" \
    --with-decryption \
    --query Parameter.Value \
    --output text
}

pb_encryption_key="$(get_secret "${PB_KEY_PARAMETER}")"
app_user_password="$(get_secret "${APP_PASSWORD_PARAMETER}")"
superuser_password="$(get_secret "${SUPERUSER_PASSWORD_PARAMETER}")"
assistant_shared_secret="$(get_secret "${ASSISTANT_SECRET_PARAMETER}")"

if [[ ${#pb_encryption_key} -ne 32 ]]; then
  echo "La chiave PocketBase deve contenere esattamente 32 caratteri." >&2
  exit 1
fi
if [[ -z "${app_user_password}" || "${app_user_password}" == "None" ]]; then
  echo "Password utente demo mancante in SSM." >&2
  exit 1
fi
if [[ -z "${superuser_password}" || "${superuser_password}" == "None" ]]; then
  echo "Password superuser PocketBase mancante in SSM." >&2
  exit 1
fi
if [[ ${#assistant_shared_secret} -lt 32 ]]; then
  echo "Segreto condiviso assistente mancante o troppo corto in SSM." >&2
  exit 1
fi

umask 077
env_file="$(mktemp "${TMPDIR:-/tmp}/crm-demo-env.XXXXXX")"
cleanup() {
  rm -f "${env_file}"
  unset pb_encryption_key app_user_password superuser_password assistant_shared_secret
}
trap cleanup EXIT INT TERM
printf 'PB_ENCRYPTION_KEY=%s\n' "${pb_encryption_key}" >"${env_file}"
printf 'CRM_ASSISTANT_SHARED_SECRET=%s\n' "${assistant_shared_secret}" >>"${env_file}"
printf 'CRM_ASSISTANT_N8N_URL=http://n8n-assistant:5678/webhook/crm-assistant\n' >>"${env_file}"

ssh "${REMOTE_HOST}" "
  set -Eeuo pipefail
  install -d -m 0750 /opt/crm-platform/src
  if [[ ! -d '${REMOTE_ROOT}/.git' ]]; then
    git clone https://github.com/andreafalzetti/crm-demo.git '${REMOTE_ROOT}'
  fi
  git -C '${REMOTE_ROOT}' fetch --prune origin
  git -C '${REMOTE_ROOT}' checkout --detach '${commit}'
  sudo install -d -m 0750 -o root -g docker /opt/crm-platform/secrets
  sudo install -d -m 0750 -o deploy -g deploy /srv/crm-data/crm-demo
  docker network inspect crm-assistant >/dev/null 2>&1 || docker network create crm-assistant >/dev/null
"

remote_env_file="/tmp/crm-demo.env.${commit}"
scp -q "${env_file}" "${REMOTE_HOST}:${remote_env_file}"
ssh "${REMOTE_HOST}" "
  set -Eeuo pipefail
  sudo install -m 0640 -o root -g docker '${remote_env_file}' /opt/crm-platform/secrets/crm-demo.env
  rm -f '${remote_env_file}'
  cd '${REMOTE_ROOT}'
  CRM_IMAGE_TAG='${commit}' docker compose -f '${COMPOSE_FILE}' build --pull
  CRM_IMAGE_TAG='${commit}' docker compose -f '${COMPOSE_FILE}' run --rm -T crm-demo migrate up --dir=/data --encryptionEnv=PB_ENCRYPTION_KEY
"

printf '%s\n' "${superuser_password}" | ssh "${REMOTE_HOST}" "
  set -Eeuo pipefail
  cd '${REMOTE_ROOT}'
  CRM_IMAGE_TAG='${commit}' docker compose -f '${COMPOSE_FILE}' run --rm -T crm-demo app-superuser '${SUPERUSER_EMAIL}' --password-stdin --dir=/data --encryptionEnv=PB_ENCRYPTION_KEY
"

printf '%s\n' "${app_user_password}" | ssh "${REMOTE_HOST}" "
  set -Eeuo pipefail
  cd '${REMOTE_ROOT}'
  CRM_IMAGE_TAG='${commit}' docker compose -f '${COMPOSE_FILE}' run --rm -T crm-demo app-user create '${APP_USER_EMAIL}' --password-stdin --if-not-exists --name 'Utente Demo' --role administrator --dir=/data --encryptionEnv=PB_ENCRYPTION_KEY
"

ssh "${REMOTE_HOST}" "
  set -Eeuo pipefail
  cd '${REMOTE_ROOT}'
  CRM_IMAGE_TAG='${commit}' docker compose -f '${COMPOSE_FILE}' run --rm -T crm-demo demo-seed '${APP_USER_EMAIL}' --dir=/data --encryptionEnv=PB_ENCRYPTION_KEY
  CRM_IMAGE_TAG='${commit}' docker compose -f '${COMPOSE_FILE}' up -d --remove-orphans
  for attempt in \$(seq 1 30); do
    if curl -fsS http://127.0.0.1:8080/api/health >/dev/null; then
      docker compose -f '${COMPOSE_FILE}' ps
      exit 0
    fi
    sleep 2
  done
  docker compose -f '${COMPOSE_FILE}' logs --tail=100
  exit 1
"

echo "Deploy ${commit} completato. Configura Tailscale Serve verso http://127.0.0.1:8080."
