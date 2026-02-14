# ============================================================
# Test Environment Configuration
# ============================================================

environment = "test"
aws_region  = "us-east-1"

# Networking
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# ECS / Backend (smaller for test)
backend_cpu           = 256
backend_memory        = 512
backend_desired_count = 1
backend_container_port = 3001

# RDS (smaller for test)
db_instance_class    = "db.t3.micro"
db_allocated_storage = 20
db_name              = "image_annotator"

# CORS — will be updated with actual CloudFront domain after initial apply
cors_origin = "*"
