#!/usr/bin/env bash
# Downloads and unpacks the Photon geocoding index on the CRM platform VPS.
#
# Idempotent: it does nothing when the index is already in place. Run it once
# before the first deploy that enables the weather module, and again only to
# adopt a newer index.
#
# Two upstream facts drive the shape of this script:
#   - the "-latest" alias for country extracts is broken (HTTP 404); only the
#     dated build resolves, so the version is pinned here and bumped by hand;
#   - the archive is ~2.5 GB and expands several times over, so free space is
#     checked before anything is downloaded rather than after the disk fills.
#
# PHOTON_INDEX is pinned as a PAIR with PHOTON_VERSION in
# deploy/private/photon/Dockerfile. The index format is version-coupled and the
# country extracts carry no version in their name, so bumping one without the
# other leaves Photon unable to open the index.
set -Eeuo pipefail

REMOTE_HOST="${REMOTE_HOST:-crm-platform}"
PHOTON_DATA_DIR="${PHOTON_DATA_DIR:-/srv/photon-data}"
PHOTON_INDEX="${PHOTON_INDEX:-photon-db-it-250720.tar.bz2}"
PHOTON_BASE_URL="${PHOTON_BASE_URL:-https://download1.graphhopper.com/public/extracts/by-country-code/it}"
REQUIRED_GIB="${REQUIRED_GIB:-25}"

ssh "${REMOTE_HOST}" "
  set -Eeuo pipefail

  if [[ -d '${PHOTON_DATA_DIR}/photon_data' ]]; then
    echo 'Indice Photon presente in ${PHOTON_DATA_DIR}: nulla da fare.'
    exit 0
  fi

  sudo install -d -m 0755 -o deploy -g deploy '${PHOTON_DATA_DIR}'

  available_gib=\$(df -BG --output=avail '${PHOTON_DATA_DIR}' | tail -1 | tr -dc '0-9')
  if (( available_gib < ${REQUIRED_GIB} )); then
    echo \"Spazio insufficiente: \${available_gib} GiB liberi, ne servono almeno ${REQUIRED_GIB}.\" >&2
    exit 1
  fi

  cd '${PHOTON_DATA_DIR}'
  curl -fSL --retry 3 -o '${PHOTON_INDEX}' '${PHOTON_BASE_URL}/${PHOTON_INDEX}'
  curl -fSL --retry 3 -o '${PHOTON_INDEX}.md5' '${PHOTON_BASE_URL}/${PHOTON_INDEX}.md5'

  # The published digest is the only integrity check available for a 2.5 GB
  # download over a link that may drop.
  expected=\$(tr -dc '0-9a-f' < '${PHOTON_INDEX}.md5' | head -c 32)
  actual=\$(md5sum '${PHOTON_INDEX}' | cut -d' ' -f1)
  if [[ \"\${expected}\" != \"\${actual}\" ]]; then
    echo \"Checksum non corrispondente: atteso \${expected}, ottenuto \${actual}.\" >&2
    rm -f '${PHOTON_INDEX}'
    exit 1
  fi

  pbzip2 -dc '${PHOTON_INDEX}' 2>/dev/null | tar x || tar xjf '${PHOTON_INDEX}'
  rm -f '${PHOTON_INDEX}' '${PHOTON_INDEX}.md5'

  if [[ ! -d '${PHOTON_DATA_DIR}/photon_data' ]]; then
    echo \"L'archivio non contiene photon_data/: struttura inattesa.\" >&2
    exit 1
  fi

  # The container runs as uid 1000 and Elasticsearch writes inside its own data
  # directory, so ownership has to match.
  sudo chown -R 1000:1000 '${PHOTON_DATA_DIR}'
  echo 'Indice Photon pronto in ${PHOTON_DATA_DIR}.'
"
