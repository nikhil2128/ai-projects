# ============================================================
# Production Environment Configuration
# ============================================================

environment = "prod"
aws_region  = "us-east-1"

# Networking
vpc_cidr           = "10.1.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# ECS / Backend (production-grade)
backend_cpu           = 512
backend_memory        = 1024
backend_desired_count = 2
backend_container_port = 3001

# RDS (production-grade)
db_instance_class    = "db.t3.small"
db_allocated_storage = 50
db_name              = "image_annotator"

# CORS — will be updated with actual CloudFront/custom domain after initial apply
cors_origin = "*"
