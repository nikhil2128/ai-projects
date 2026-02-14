variable "project_name" {
  description = "Name of the project used for resource naming"
  type        = string
  default     = "image-annotator"
}

variable "environment" {
  description = "Deployment environment (test or prod)"
  type        = string
  validation {
    condition     = contains(["test", "prod"], var.environment)
    error_message = "Environment must be 'test' or 'prod'."
  }
}

variable "aws_region" {
  description = "AWS region for resource deployment"
  type        = string
  default     = "us-east-1"
}

# ---- Networking ----
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# ---- ECS / Backend ----
variable "backend_cpu" {
  description = "CPU units for backend Fargate task (1 vCPU = 1024)"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Memory (MiB) for backend Fargate task"
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Number of backend service instances"
  type        = number
  default     = 2
}

variable "backend_container_port" {
  description = "Port the backend container listens on"
  type        = number
  default     = 3001
}

# ---- RDS ----
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB for the RDS instance"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "image_annotator"
}

variable "db_username" {
  description = "Master username for the RDS instance"
  type        = string
  default     = "app_admin"
  sensitive   = true
}

# ---- Application Secrets ----
variable "jwt_secret" {
  description = "Secret key for JWT token signing"
  type        = string
  sensitive   = true
}

variable "cors_origin" {
  description = "Allowed CORS origin for the backend"
  type        = string
  default     = "*"
}

# ---- Domain (optional) ----
variable "domain_name" {
  description = "Custom domain name (optional). Leave empty to use default CloudFront domain."
  type        = string
  default     = ""
}
