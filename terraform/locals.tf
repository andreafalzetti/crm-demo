locals {
  server_name        = "${var.project_name}-${var.environment}"
  tailscale_hostname = trimspace(var.tailscale_hostname) != "" ? var.tailscale_hostname : local.server_name

  labels = merge({
    managed_by  = "terraform"
    application = "crm-platform"
    repository  = "andreafalzetti-crm-demo"
    environment = var.environment
  }, var.extra_labels)

  cloud_init = templatefile("${path.module}/templates/cloud-init.sh.tftpl", {
    admin_username   = var.admin_username
    public_ssh_cidrs = var.public_ssh_cidrs
    ssh_public_key   = trimspace(var.ssh_public_key)
  })
}
