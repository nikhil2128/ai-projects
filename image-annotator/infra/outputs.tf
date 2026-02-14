output "frontend_bucket_name" {
  description = "S3 bucket name for frontend static files"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_cloudfront_domain" {
  description = "CloudFront distribution domain name for the frontend"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_cloudfront_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "uploads_bucket_name" {
  description = "S3 bucket name for image uploads"
  value       = aws_s3_bucket.uploads.id
}

output "backend_ecr_repository_url" {
  description = "ECR repository URL for the backend Docker image"
  value       = aws_ecr_repository.backend.repository_url
}

output "backend_alb_dns" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.backend.dns_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name for the backend"
  value       = aws_ecs_service.backend.name
}

output "rds_endpoint" {
  description = "RDS PostgreSQL instance endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "backend_log_group" {
  description = "CloudWatch Log Group for backend container logs"
  value       = aws_cloudwatch_log_group.backend.name
}
