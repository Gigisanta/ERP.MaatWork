# =============================================================================
# AWS Database Module - Variables
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
  description = "VPC ID where the database will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "compute_security_group_id" {
  description = "Security group ID of the compute resources (EC2)"
  type        = string
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "Initial storage allocation in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum storage for autoscaling in GB"
  type        = number
  default     = 30
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 1
}

# =============================================================================
# CDK Migration Variables (for importing existing resources)
# =============================================================================

variable "existing_db_identifier" {
  description = "Existing RDS instance identifier from CDK (for import)"
  type        = string
  default     = null
}

variable "existing_security_group_name" {
  description = "Name of existing DB security group from CDK (for import)"
  type        = string
  default     = null
}

variable "existing_secret_name" {
  description = "Name of existing Secrets Manager secret from CDK (for import)"
  type        = string
  default     = null
}

variable "existing_subnet_group_name" {
  description = "Name of existing DB subnet group from CDK (for import)"
  type        = string
  default     = null
}

