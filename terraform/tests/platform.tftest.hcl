mock_provider "hcloud" {}

run "platform_plan" {
  command = plan

  variables {
    ssh_public_key   = "ssh-ed25519 AAAATEST terraform-test@example.invalid"
    public_ssh_cidrs = ["203.0.113.10/32"]
  }

  assert {
    condition     = hcloud_server.platform.name == "crm-platform-production"
    error_message = "The default server name must include project and environment."
  }

  assert {
    condition     = hcloud_server.platform.server_type == "cpx32"
    error_message = "The default server type must remain the documented 4 vCPU / 8 GB starting point."
  }

  assert {
    condition     = hcloud_server.platform.delete_protection && hcloud_server.platform.rebuild_protection
    error_message = "Production server protection must be enabled by default."
  }

  assert {
    condition     = strcontains(hcloud_server.platform.user_data, "docker-ce")
    error_message = "Cloud-init must install Docker Engine."
  }

  assert {
    condition     = strcontains(hcloud_server.platform.user_data, "tailscale")
    error_message = "Cloud-init must install Tailscale."
  }

  assert {
    condition     = !strcontains(hcloud_server.platform.user_data, "TAILSCALE_AUTH_KEY")
    error_message = "Tailscale credentials must never enter cloud-init or Terraform state."
  }

  assert {
    condition     = strcontains(hcloud_server.platform.user_data, "ignoreip = 127.0.0.1/8 ::1 203.0.113.10/32")
    error_message = "Fail2ban must not ban the temporary administrative bootstrap CIDR."
  }
}
