# =============================================================================
# Production Environment - Variables
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
  default     = "t3.medium"
}

variable "volume_size" {
  description = "EBS volume size in GB"
  type        = number
  default     = 50
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
  default     = "db.t3.small"
}

variable "db_allocated_storage" {
  description = "Initial storage in GB"
  type        = number
  default     = 50
}

variable "db_max_allocated_storage" {
  description = "Max storage for autoscaling in GB"
  type        = number
  default     = 100
}

variable "db_multi_az" {
  description = "Enable Multi-AZ"
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "Backup retention days"
  type        = number
  default     = 7
}

# Cloudflare
variable "enable_cloudflare" {
  description = "Enable Cloudflare integration"
  type        = bool
  default     = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
  default     = null
}

variable "domain" {
  description = "Domain name"
  type        = string
}

variable "enable_waf" {
  description = "Enable WAF rules"
  type        = bool
  default     = true
}




