# =============================================================================
# Development Environment - Variables
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "maatwork"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Compute
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

# Database
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Initial storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Max storage for autoscaling in GB"
  type        = number
  default     = 30
}

variable "db_multi_az" {
  description = "Enable Multi-AZ"
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "Backup retention days"
  type        = number
  default     = 1
}

# Cloudflare
variable "enable_cloudflare" {
  description = "Enable Cloudflare integration"
  type        = bool
  default     = false
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
  default     = null
}

variable "domain" {
  description = "Domain name"
  type        = string
  default     = null
}

variable "enable_waf" {
  description = "Enable WAF rules"
  type        = bool
  default     = true
}

variable "restrict_to_cloudflare" {
  description = "Restrict HTTP/HTTPS to Cloudflare IPs only"
  type        = bool
  default     = false
}

variable "cloudflare_api_key" {
  description = "Cloudflare Global API Key"
  type        = string
  default     = null
  sensitive   = true
}

variable "cloudflare_email" {
  description = "Cloudflare account email"
  type        = string
  default     = null
}

# =============================================================================
# CDK Migration Variables
# =============================================================================

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

