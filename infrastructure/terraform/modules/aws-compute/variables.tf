# =============================================================================
# AWS Compute Module - Variables
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for the EC2 instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "volume_size" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 30
}

variable "ssh_key_name" {
  description = "Name of the SSH key pair (optional)"
  type        = string
  default     = null
}

variable "logs_bucket_arn" {
  description = "ARN of the S3 bucket for logs"
  type        = string
}

variable "db_secret_arn" {
  description = "ARN of the database credentials secret"
  type        = string
}

# =============================================================================
# CDK Migration Variables (for importing existing resources)
# =============================================================================

variable "existing_security_group_name" {
  description = "Name of existing security group from CDK (for import)"
  type        = string
  default     = null
}

variable "existing_iam_role_name" {
  description = "Name of existing IAM role from CDK (for import)"
  type        = string
  default     = null
}

variable "existing_instance_profile_name" {
  description = "Name of existing IAM instance profile from CDK (for import)"
  type        = string
  default     = null
}

# =============================================================================
# Security Variables
# =============================================================================

variable "restrict_to_cloudflare" {
  description = "Restrict HTTP/HTTPS access to Cloudflare IPs only (recommended for production)"
  type        = bool
  default     = false
}

