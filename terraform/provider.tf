provider "hcloud" {
  # The provider reads HCLOUD_TOKEN from the environment. Keeping the token out
  # of HCL makes switching between the OFC and Design Ferri accounts explicit.
}
