# =============================================================================
# AWS Compute Module - Outputs
# =============================================================================

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.main.id
}

output "instance_arn" {
  description = "EC2 instance ARN"
  value       = aws_instance.main.arn
}

output "elastic_ip" {
  description = "Elastic IP address"
  value       = aws_eip.main.public_ip
}

output "elastic_ip_id" {
  description = "Elastic IP allocation ID"
  value       = aws_eip.main.id
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.instance.id
}

output "iam_role_arn" {
  description = "IAM role ARN"
  value       = aws_iam_role.instance.arn
}

output "iam_instance_profile_name" {
  description = "IAM instance profile name"
  value       = aws_iam_instance_profile.instance.name
}

output "private_ip" {
  description = "Private IP address"
  value       = aws_instance.main.private_ip
}




