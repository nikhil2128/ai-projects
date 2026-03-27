variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "asia-south1"
}

variable "service_name" {
  description = "Cloud Run service name (also used as prefix for related resources)"
  type        = string
  default     = "matrimonial"
}

variable "db_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "matrimonial-db"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "matrimonial"
}

variable "db_user" {
  description = "PostgreSQL application user"
  type        = string
  default     = "matrimonial_app"
}

variable "db_tier" {
  description = "Cloud SQL machine tier (db-f1-micro is cheapest)"
  type        = string
  default     = "db-f1-micro"
}

variable "repo_name" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "matrimonial"
}
