# =============================================================================
# Development Environment - Outputs
# =============================================================================

output "ec2_public_ip" {
  description = "Elastic IP of the EC2 instance"
  value       = module.cactus.ec2_public_ip
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = module.cactus.ssh_command
}

output "db_endpoint" {
  description = "RDS endpoint"
  value       = module.cactus.db_endpoint
}

output "db_secret_arn" {
  description = "Secret ARN for DB credentials"
  value       = module.cactus.db_secret_arn
}

output "logs_bucket" {
  description = "S3 logs bucket name"
  value       = module.cactus.logs_bucket_name
}

output "web_url" {
  description = "Web URL"
  value       = module.cactus.web_url
}

output "api_url" {
  description = "API URL"
  value       = module.cactus.api_url
}

# SSL Certificate outputs (for Nginx)
output "origin_certificate" {
  description = "Cloudflare Origin Certificate"
  value       = module.cactus.origin_certificate
  sensitive   = true
}

output "origin_private_key" {
  description = "Origin Certificate Private Key"
  value       = module.cactus.origin_private_key
  sensitive   = true
}


