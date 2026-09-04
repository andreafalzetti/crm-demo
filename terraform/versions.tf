terraform {
  required_version = ">= 1.13, < 2.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.68"
    }
  }

  # Credentials and the concrete bucket live outside Git. See
  # config/production/backend.hcl.example and README.md.
  backend "s3" {}
}
