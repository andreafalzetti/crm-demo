variable "project_name" {
  description = "Short project identifier used in resource names."
  type        = string
  default     = "crm-platform"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$", var.project_name))
    error_message = "project_name must be a lowercase, hyphenated identifier between 3 and 32 characters."
  }
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "production"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,20}[a-z0-9]$", var.environment))
    error_message = "environment must be a lowercase, hyphenated identifier between 3 and 22 characters."
  }
}

variable "location" {
  description = "Hetzner Cloud location, for example fsn1, nbg1 or hel1."
  type        = string
  default     = "fsn1"
}

variable "server_type" {
  description = "Hetzner server type. CPX32 is a sensible starting point for n8n and several lightweight CRM demos."
  type        = string
  default     = "cpx32"
}

variable "server_image" {
  description = "Hetzner image used to create the host."
  type        = string
  default     = "ubuntu-24.04"
}

variable "admin_username" {
  description = "Non-root account used for OpenSSH over Tailscale."
  type        = string
  default     = "deploy"

  validation {
    condition     = can(regex("^[a-z_][a-z0-9_-]{0,30}$", var.admin_username))
    error_message = "admin_username must be a valid lowercase Linux username."
  }
}

variable "ssh_public_key" {
  description = "SSH public key installed for the administrative user. Prefer TF_VAR_ssh_public_key over a committed tfvars value."
  type        = string

  validation {
    condition     = can(regex("^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(256|384|521)) ", trimspace(var.ssh_public_key)))
    error_message = "ssh_public_key must contain a supported OpenSSH public key."
  }
}

variable "public_ssh_cidrs" {
  description = "Temporary public CIDRs allowed to reach port 22 during Tailscale bootstrap. Keep empty after Tailscale access is verified."
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for cidr in var.public_ssh_cidrs : can(cidrhost(cidr, 0))])
    error_message = "Every public_ssh_cidrs entry must be a valid IPv4 or IPv6 CIDR."
  }
}

variable "tailscale_hostname" {
  description = "MagicDNS hostname. When empty, the Hetzner server name is used."
  type        = string
  default     = ""

  validation {
    condition     = trimspace(var.tailscale_hostname) == "" || can(regex("^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$", var.tailscale_hostname))
    error_message = "tailscale_hostname must be empty or a valid hostname label between 2 and 63 characters."
  }
}

variable "enable_backups" {
  description = "Enable Hetzner backups for the server root disk. Application-level off-site backups are still required."
  type        = bool
  default     = true
}

variable "protect_server" {
  description = "Enable Hetzner delete and rebuild protection."
  type        = bool
  default     = true
}

variable "extra_labels" {
  description = "Additional Hetzner labels."
  type        = map(string)
  default     = {}
}
