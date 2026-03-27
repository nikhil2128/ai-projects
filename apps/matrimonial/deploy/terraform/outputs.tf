output "project_id" {
  value = var.project_id
}

output "region" {
  value = var.region
}

output "service_name" {
  value = var.service_name
}

output "db_instance_name" {
  value = google_sql_database_instance.main.name
}

output "db_connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}

output "repo_name" {
  value = google_artifact_registry_repository.docker.repository_id
}

output "database_url" {
  description = "Cloud SQL connection string via Unix socket (for Cloud Run)"
  value       = "postgresql://${var.db_user}:${random_password.db_password.result}@/${var.db_name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
  sensitive   = true
}
