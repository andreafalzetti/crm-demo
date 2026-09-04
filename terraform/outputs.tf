output "server_id" {
  description = "Hetzner Cloud server ID."
  value       = hcloud_server.platform.id
}

output "server_name" {
  description = "Hetzner Cloud server name."
  value       = hcloud_server.platform.name
}

output "public_ipv4" {
  description = "Public IPv4 address to use for DNS A records."
  value       = hcloud_server.platform.ipv4_address
}

output "public_ipv6" {
  description = "Public IPv6 address to use for DNS AAAA records."
  value       = hcloud_server.platform.ipv6_address
}

output "tailscale_hostname" {
  description = "Expected MagicDNS hostname after Tailscale enrollment."
  value       = local.tailscale_hostname
}

output "tailscale_ssh_command" {
  description = "OpenSSH command to use after the node has joined Tailscale."
  value       = "ssh ${var.admin_username}@${local.tailscale_hostname}"
}

output "public_bootstrap_ssh_command" {
  description = "Temporary public SSH command, or null when the bootstrap firewall rule is closed."
  value       = length(var.public_ssh_cidrs) > 0 ? "ssh ${var.admin_username}@${hcloud_server.platform.ipv4_address}" : null
}
