# =============================================================================
# Production Environment - Outputs
# =============================================================================

output "ec2_public_ip" {
  description = "Elastic IP of the EC2 instance"
  value       = module.maatwork.ec2_public_ip
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = module.maatwork.ssh_command
}

output "db_endpoint" {
  description = "RDS endpoint"
  value       = module.maatwork.db_endpoint
}

output "db_secret_arn" {
  description = "Secret ARN for DB credentials"
  value       = module.maatwork.db_secret_arn
  sensitive   = true
}

output "logs_bucket" {
  description = "S3 logs bucket name"
  value       = module.maatwork.logs_bucket_name
}

output "web_url" {
  description = "Web URL"
  value       = module.maatwork.web_url
}

output "api_url" {
  description = "API URL"
  value       = module.maatwork.api_url
}




