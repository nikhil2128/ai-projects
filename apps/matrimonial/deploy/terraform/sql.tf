# ---------------------------------------------------------------------------
# Cloud SQL — PostgreSQL 16 (cost-optimised for low initial traffic)
#
#   db-f1-micro  ~$7-10/mo   (scale up via var.db_tier)
#   HDD 10 GB    ~$0.09/GB   (auto-increase enabled)
#   Zonal        (no HA)
#   Private IP only
# ---------------------------------------------------------------------------

resource "google_sql_database_instance" "main" {
  name             = var.db_instance_name
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = var.db_tier
    availability_type = "ZONAL"
    disk_type         = "PD_HDD"
    disk_size         = 10
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = data.google_compute_network.default.id
      enable_private_path_for_google_cloud_services = true
    }
  }

  deletion_protection = true

  depends_on = [google_service_networking_connection.private_vpc]
}

resource "google_sql_database" "app" {
  name     = var.db_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = var.db_user
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
}
