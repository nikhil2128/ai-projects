data "google_project" "current" {}

locals {
  cloud_run_sa = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"

  cloud_run_roles = [
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
  ]
}

resource "google_project_iam_member" "cloud_run" {
  for_each = toset(local.cloud_run_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${local.cloud_run_sa}"
}
