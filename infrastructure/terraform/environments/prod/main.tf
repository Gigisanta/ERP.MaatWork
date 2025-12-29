# =============================================================================
# MaatWork - Production Environment
# =============================================================================

terraform {
  required_version = ">= 1.6.0"

  # Uncomment and configure after creating the S3 bucket:
  # backend "s3" {
  #   bucket         = "maatwork-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "maatwork-terraform-locks"
  # }
}

module "maatwork" {
  source = "../../"

  # Environment
  environment  = "prod"
  project_name = var.project_name
  aws_region   = var.aws_region

  # Compute
  instance_type = var.instance_type
  volume_size   = var.volume_size
  ssh_key_name  = var.ssh_key_name

  # Database
  db_instance_class        = var.db_instance_class
  db_allocated_storage     = var.db_allocated_storage
  db_max_allocated_storage = var.db_max_allocated_storage
  db_multi_az              = var.db_multi_az
  db_backup_retention_days = var.db_backup_retention_days

  # Cloudflare (recommended for production)
  enable_cloudflare  = var.enable_cloudflare
  cloudflare_zone_id = var.cloudflare_zone_id
  domain             = var.domain
  enable_waf         = var.enable_waf
}




