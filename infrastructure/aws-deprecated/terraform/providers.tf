# =============================================================================
# Provider Configuration
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# =============================================================================
# Cloudflare Provider Configuration
# =============================================================================
# When enable_cloudflare = true, set environment variables:
#   $env:CLOUDFLARE_API_KEY = "your-global-api-key"
#   $env:CLOUDFLARE_EMAIL = "your-email@example.com"
#
# Required permissions:
# - Zone: Read
# - DNS: Edit
# - Firewall Services: Edit
# - Zone Settings: Edit
# =============================================================================

provider "cloudflare" {
  # Credentials are read from environment variables:
  # CLOUDFLARE_API_KEY and CLOUDFLARE_EMAIL
  # When enable_cloudflare = false, dummy values are acceptable
}

