# Infrastruttura Hetzner

Terraform crea una singola VPS per ospitare Docker Compose, n8n, PostgreSQL e
più istanze isolate del CRM. La struttura riprende il repository OFC, ma non ne
riutilizza account, profili AWS, secret SSM, tailnet o stato Terraform.

## Confine di responsabilità

Terraform gestisce:

- VPS Ubuntu 24.04;
- firewall Hetzner;
- chiave SSH;
- backup Hetzner del disco di sistema;
- bootstrap di Docker Engine, Compose, hardening SSH e Tailscale;
- directory host per stack, dati e backup.

Docker Compose gestirà Caddy, n8n, PostgreSQL e le singole demo CRM. DNS,
bucket applicativi e secret applicativi non sono creati da questo modulo.

## Account separati

Il token del nuovo account Hetzner è conservato come `SecureString` nel profilo
AWS personale `andrea`, al path `/platform/production/hetzner/api-token`.
`../scripts/terraform-hcloud.sh` lo legge solo in memoria per `plan` e `apply`,
dopo aver verificato l'account AWS `766515626185`. Non esportare o copiare il
token nella shell e non usare profili, secret o tailnet OFC.

Il collegamento al tailnet Design Ferri è intenzionalmente interattivo: nessuna
auth key Tailscale entra nel cloud-init o nello state Terraform.

## Stato remoto

Il backend usa il bucket AWS S3 privato, versionato e cifrato KMS gestito dal
repository `andreafalzetti/aws`.

```bash
cp terraform/config/production/backend.hcl.example \
  terraform/config/production/backend.hcl
cp terraform/config/production/terraform.tfvars.example \
  terraform/config/production/terraform.tfvars
```

I file locali sono ignorati da Git. Nel solo `backend.hcl` locale abilita il
profilo personale:

```hcl
profile = "andrea"
```

Lo script usa per default `~/.ssh/id_ed25519.pub`; puoi scegliere un'altra
chiave pubblica con `CRM_SSH_PUBLIC_KEY_FILE=/percorso/chiave.pub`. La chiave
privata non viene mai letta.

## Provisioning

```bash
mise trust
mise install
make tf-init
make tf-fmt-check
make tf-validate
make tf-test
make tf-plan
make tf-apply
make tf-output
```

## Bootstrap Tailscale interattivo

1. imposta temporaneamente `public_ssh_cidrs` sul tuo IP pubblico `/32`;
2. applica Terraform e collegati usando l'output
   `public_bootstrap_ssh_command`;
3. attendi `sudo cloud-init status --wait`;
4. esegui `sudo tailscale up --hostname=crm-platform-production --ssh=false`;
5. verifica una seconda sessione OpenSSH sul nome MagicDNS;
6. svuota `public_ssh_cidrs`, applica nuovamente Terraform e rimuovi anche la
   regola UFW temporanea dal server.

La console Hetzner rimane il percorso di recupero se il bootstrap Tailscale
fallisce mentre SSH pubblico è chiuso.

## Rete e dati

Sono pubbliche soltanto HTTP/HTTPS e la porta UDP di Tailscale. SSH è permesso
sull'interfaccia Tailscale; l'apertura pubblica è opzionale e temporanea.

I dati inizialmente risiedono sul disco root, incluso nei backup server Hetzner.
Questo non sostituisce i backup applicativi: PocketBase deve produrre backup
off-site distinti per cliente e PostgreSQL/n8n richiede dump logici, copia dei
file persistenti e conservazione sicura di `N8N_ENCRYPTION_KEY`.

Il bootstrap prepara:

```text
/opt/crm-platform          configurazione Docker Compose
/srv/crm-data              dati persistenti delle istanze CRM
/var/backups/crm-platform  staging locale dei backup
```

Non pubblicare direttamente porte PocketBase, PostgreSQL o n8n in Compose.
Soltanto il reverse proxy dovrà esporre `80` e `443`.
