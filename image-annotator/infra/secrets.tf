# ============================================================
# AWS Secrets Manager
# ============================================================

# ---- Database URL Secret ----
resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${local.name_prefix}/database-url"
  description             = "PostgreSQL connection string for ${local.name_prefix}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = { Name = "${local.name_prefix}-database-url" }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.db_username}:${aws_db_instance.postgres.master_user_secret[0].secret_arn}@${aws_db_instance.postgres.endpoint}/${var.db_name}?schema=public"

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ---- JWT Secret ----
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${local.name_prefix}/jwt-secret"
  description             = "JWT signing secret for ${local.name_prefix}"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = { Name = "${local.name_prefix}-jwt-secret" }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret

  lifecycle {
    ignore_changes = [secret_string]
  }
}
