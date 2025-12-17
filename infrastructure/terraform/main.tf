# =============================================================================
# Cactus CRM - Main Terraform Configuration
# =============================================================================
#
# This is the root module that orchestrates all infrastructure components.
# Use environments/dev or environments/prod for environment-specific configs.
#
# Usage:
#   cd environments/dev
#   terraform init
#   terraform plan
#   terraform apply
#
# =============================================================================

locals {
  prefix = "${var.project_name}-${var.environment}"
}

# =============================================================================
# Data Sources
# =============================================================================

# Use default VPC for MVP (cost-effective)
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# =============================================================================
# Modules
# =============================================================================

module "storage" {
  source = "./modules/aws-storage"

  project_name = var.project_name
  environment  = var.environment
}

module "database" {
  source = "./modules/aws-database"

  project_name             = var.project_name
  environment              = var.environment
  vpc_id                   = data.aws_vpc.default.id
  subnet_ids               = data.aws_subnets.default.ids
  instance_class           = var.db_instance_class
  allocated_storage        = var.db_allocated_storage
  max_allocated_storage    = var.db_max_allocated_storage
  multi_az                 = var.db_multi_az
  backup_retention_days    = var.db_backup_retention_days
  compute_security_group_id = module.compute.security_group_id

  # CDK migration - use existing resource names
  existing_db_identifier       = var.cdk_db_identifier
  existing_security_group_name = var.cdk_db_sg_name
  existing_secret_name         = var.cdk_secret_name
  existing_subnet_group_name   = var.cdk_subnet_group_name
}

module "compute" {
  source = "./modules/aws-compute"

  project_name   = var.project_name
  environment    = var.environment
  vpc_id         = data.aws_vpc.default.id
  subnet_id      = data.aws_subnets.default.ids[0]
  instance_type  = var.instance_type
  volume_size    = var.volume_size
  ssh_key_name   = var.ssh_key_name
  logs_bucket_arn = module.storage.bucket_arn
  db_secret_arn  = module.database.secret_arn

  # Security - restrict to Cloudflare IPs only
  restrict_to_cloudflare = var.restrict_to_cloudflare

  # CDK migration - use existing resource names
  existing_security_group_name   = var.cdk_compute_sg_name
  existing_iam_role_name         = var.cdk_iam_role_name
  existing_instance_profile_name = var.cdk_instance_profile_name
}

module "cloudflare" {
  count  = var.enable_cloudflare ? 1 : 0
  source = "./modules/cloudflare"

  zone_id    = var.cloudflare_zone_id
  domain     = var.domain
  elastic_ip = module.compute.elastic_ip
  enable_waf = var.enable_waf
}

