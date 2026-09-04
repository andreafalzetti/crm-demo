resource "hcloud_ssh_key" "platform" {
  name       = "${local.server_name}-admin"
  public_key = trimspace(var.ssh_public_key)
  labels     = local.labels
}

resource "hcloud_firewall" "platform" {
  name   = "${local.server_name}-firewall"
  labels = local.labels

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "Public HTTP and ACME challenges"
  }

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "Public HTTPS"
  }

  rule {
    direction   = "in"
    protocol    = "udp"
    port        = "443"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "Public HTTP3"
  }

  rule {
    direction   = "in"
    protocol    = "udp"
    port        = "41641"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "Tailscale direct connections"
  }

  dynamic "rule" {
    for_each = length(var.public_ssh_cidrs) == 0 ? [] : [var.public_ssh_cidrs]

    content {
      direction   = "in"
      protocol    = "tcp"
      port        = "22"
      source_ips  = rule.value
      description = "Temporary public SSH bootstrap"
    }
  }

  rule {
    direction   = "in"
    protocol    = "icmp"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "ICMP diagnostics"
  }

  rule {
    direction       = "out"
    protocol        = "tcp"
    port            = "1-65535"
    destination_ips = ["0.0.0.0/0", "::/0"]
    description     = "All TCP outbound"
  }

  rule {
    direction       = "out"
    protocol        = "udp"
    port            = "1-65535"
    destination_ips = ["0.0.0.0/0", "::/0"]
    description     = "All UDP outbound"
  }

  rule {
    direction       = "out"
    protocol        = "icmp"
    destination_ips = ["0.0.0.0/0", "::/0"]
    description     = "ICMP outbound"
  }
}

resource "hcloud_server" "platform" {
  name        = local.server_name
  image       = var.server_image
  server_type = var.server_type
  location    = var.location

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  ssh_keys                 = [hcloud_ssh_key.platform.id]
  firewall_ids             = [hcloud_firewall.platform.id]
  user_data                = local.cloud_init
  backups                  = var.enable_backups
  delete_protection        = var.protect_server
  rebuild_protection       = var.protect_server
  shutdown_before_deletion = true
  labels                   = local.labels

  lifecycle {
    # Both values are first-boot inputs. Rotating the SSH key or changing the
    # bootstrap script must not silently replace a stateful production host.
    ignore_changes = [ssh_keys, user_data]
  }
}
