# =============================================================================
# Root Outputs
# =============================================================================

output "ec2_public_ip" {
  description = "Elastic IP address of the EC2 instance"
  value       = module.compute.elastic_ip
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = module.compute.instance_id
}

output "db_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.database.db_endpoint
}

output "db_port" {
  description = "RDS PostgreSQL port"
  value       = module.database.db_port
}

output "db_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = module.database.secret_arn
}

output "logs_bucket_name" {
  description = "Name of the S3 logs bucket"
  value       = module.storage.bucket_name
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.project_name}-${var.environment}.pem ec2-user@${module.compute.elastic_ip}"
}

output "web_url" {
  description = "Web application URL"
  value       = var.enable_cloudflare && var.domain != null ? "https://${var.domain}" : "http://${module.compute.elastic_ip}"
}

output "api_url" {
  description = "API URL"
  value       = var.enable_cloudflare && var.domain != null ? "https://${var.domain}/api" : "http://${module.compute.elastic_ip}/api"
}

# =============================================================================
# SSL Certificate Outputs (when Cloudflare is enabled)
# =============================================================================

output "origin_certificate" {
  description = "Cloudflare Origin CA Certificate for Nginx"
  value       = var.enable_cloudflare ? module.cloudflare[0].origin_certificate : null
  sensitive   = true
}

output "origin_private_key" {
  description = "Private key for the origin certificate"
  value       = var.enable_cloudflare ? module.cloudflare[0].origin_private_key : null
  sensitive   = true
}

output "origin_certificate_expires" {
  description = "Origin certificate expiration date"
  value       = var.enable_cloudflare ? module.cloudflare[0].origin_certificate_expires : null
}


