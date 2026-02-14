# ============================================================
# RDS — PostgreSQL Database
# ============================================================

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name_prefix}-db-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier = "${local.name_prefix}-postgres"

  engine         = "postgres"
  engine_version = "16.4"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  # Password managed by Secrets Manager
  manage_master_user_password = true

  multi_az               = var.environment == "prod" ? true : false
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = var.environment == "prod" ? 14 : 3
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:05:00-sun:06:00"

  skip_final_snapshot       = var.environment == "test" ? true : false
  final_snapshot_identifier = var.environment == "prod" ? "${local.name_prefix}-final-snapshot" : null
  deletion_protection       = var.environment == "prod" ? true : false

  performance_insights_enabled = var.environment == "prod" ? true : false

  tags = { Name = "${local.name_prefix}-postgres" }
}
