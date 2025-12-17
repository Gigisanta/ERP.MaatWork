# =============================================================================
# Development Environment - Configuration with CDK Migration
# =============================================================================

project_name = "cactus"
aws_region   = "sa-east-1"  # Based on discovered resources

# Compute
instance_type = "t3.small"
volume_size   = 30
ssh_key_name  = null  # Update with your key name if needed

# Database
db_instance_class        = "db.t3.micro"
db_allocated_storage     = 20
db_max_allocated_storage = 30
db_multi_az              = false
db_backup_retention_days = 1

# =============================================================================
# Cloudflare Configuration
# =============================================================================
enable_cloudflare = true

# Domain settings
domain             = "maat.work"
cloudflare_zone_id = "59ed3d17a48275c087abbfdc8e4fd48d"

# WAF (Web Application Firewall) - Requires Cloudflare Pro plan
enable_waf = false

# Security - Block direct IP access, only allow Cloudflare
restrict_to_cloudflare = true

# =============================================================================
# CDK Migration - Existing Resource Names
# =============================================================================
# These are the actual names from your CDK deployment

# Compute resources
cdk_compute_sg_name       = "Cactus-Mvp-Dev-MvpComputeInstanceSGAB303A71-jdzIvL2Uq1ym"
cdk_iam_role_name         = "Cactus-Mvp-Dev-MvpComputeInstanceRole4387A1AA-YeFYVN6l5bFq"
cdk_instance_profile_name = "Cactus-Mvp-Dev-MvpComputeInstanceInstanceProfileB9644836-ZAErVIeYmtZo"

# Database resources
cdk_db_identifier     = "cactus-mvp-dev-databaseb269d8bb-s5qrpp48ux92"
cdk_db_sg_name        = "Cactus-Mvp-Dev-DatabaseSG2A23C222-AwJlGvUbvZDi"
cdk_secret_name       = "cactus-dev/db-credentials"
cdk_subnet_group_name = "cactus-mvp-dev-databasesubnetgroup7d60f180-puvsiy02kmwi"

