# =============================================================================
# Root Variables
# =============================================================================

variable "project_name" {
  description = "Name of the project, used for resource naming and tagging"
  type        = string
  default     = "maatwork"
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be 'dev' or 'prod'."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

# =============================================================================
# Compute Variables
# =============================================================================

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "volume_size" {
  description = "EBS volume size in GB"
  type        = number
  default     = 30
}

variable "ssh_key_name" {
  description = "Name of the SSH key pair"
  type        = string
  default     = null
}

# =============================================================================
# Database Variables
# =============================================================================

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Initial storage allocation in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum storage for autoscaling in GB"
  type        = number
  default     = 30
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 1
}

# =============================================================================
# Cloudflare Variables
# =============================================================================

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for the domain"
  type        = string
  default     = null
}

variable "domain" {
  description = "Primary domain name"
  type        = string
  default     = null
}

variable "enable_waf" {
  description = "Enable Cloudflare WAF"
  type        = bool
  default     = true
}

variable "enable_cloudflare" {
  description = "Enable Cloudflare integration"
  type        = bool
  default     = false
}

variable "restrict_to_cloudflare" {
  description = "Restrict HTTP/HTTPS to Cloudflare IPs only (blocks direct IP access)"
  type        = bool
  default     = false
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token (only required if enable_cloudflare = true and using token auth)"
  type        = string
  default     = null
  sensitive   = true
}

variable "cloudflare_api_key" {
  description = "Cloudflare Global API Key (only required if enable_cloudflare = true and using key auth)"
  type        = string
  default     = null
  sensitive   = true
}

variable "cloudflare_email" {
  description = "Cloudflare account email (required when using api_key)"
  type        = string
  default     = null
}

# =============================================================================
# CDK Migration Variables
# =============================================================================
# Set these to import existing CDK resources without recreating them

variable "cdk_compute_sg_name" {
  description = "Existing EC2 security group name from CDK"
  type        = string
  default     = null
}

variable "cdk_iam_role_name" {
  description = "Existing IAM role name from CDK"
  type        = string
  default     = null
}

variable "cdk_instance_profile_name" {
  description = "Existing IAM instance profile name from CDK"
  type        = string
  default     = null
}

variable "cdk_db_identifier" {
  description = "Existing RDS identifier from CDK"
  type        = string
  default     = null
}

variable "cdk_db_sg_name" {
  description = "Existing RDS security group name from CDK"
  type        = string
  default     = null
}

variable "cdk_secret_name" {
  description = "Existing Secrets Manager secret name from CDK"
  type        = string
  default     = null
}

variable "cdk_subnet_group_name" {
  description = "Existing DB subnet group name from CDK"
  type        = string
  default     = null
}

