# =============================================================================
# Cloudflare Module - DNS, SSL, WAF, Origin Certificate
# =============================================================================

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

# =============================================================================
# Data Source - Zone Information
# =============================================================================

data "cloudflare_zone" "main" {
  count   = var.zone_id != null ? 0 : 1
  name    = var.domain
}

locals {
  zone_id = var.zone_id != null ? var.zone_id : data.cloudflare_zone.main[0].id
}

# =============================================================================
# DNS Records
# =============================================================================

# Root domain A record
resource "cloudflare_record" "root" {
  zone_id = local.zone_id
  name    = "@"
  content = var.elastic_ip
  type    = "A"
  proxied = true
  ttl     = 1  # Auto when proxied

  comment = "Managed by Terraform - Cactus CRM"
}

# WWW subdomain CNAME
resource "cloudflare_record" "www" {
  zone_id = local.zone_id
  name    = "www"
  content = var.domain
  type    = "CNAME"
  proxied = true
  ttl     = 1

  comment = "Managed by Terraform - Cactus CRM"
}

# API subdomain (optional, if you want api.domain.com)
resource "cloudflare_record" "api" {
  count   = var.create_api_subdomain ? 1 : 0
  zone_id = local.zone_id
  name    = "api"
  content = var.elastic_ip
  type    = "A"
  proxied = true
  ttl     = 1

  comment = "Managed by Terraform - Cactus CRM API"
}

# =============================================================================
# Origin CA Certificate - For Full (Strict) SSL
# =============================================================================

# Generate a private key for the origin certificate
resource "tls_private_key" "origin" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# Create a CSR (Certificate Signing Request)
resource "tls_cert_request" "origin" {
  private_key_pem = tls_private_key.origin.private_key_pem

  subject {
    common_name  = var.domain
    organization = "Cactus CRM"
  }

  dns_names = [
    var.domain,
    "*.${var.domain}"
  ]
}

# Request an Origin CA Certificate from Cloudflare (valid for 15 years)
resource "cloudflare_origin_ca_certificate" "origin" {
  csr                = tls_cert_request.origin.cert_request_pem
  hostnames          = [var.domain, "*.${var.domain}"]
  request_type       = "origin-rsa"
  requested_validity = 5475  # 15 years in days
}

# =============================================================================
# SSL/TLS Configuration - Full (Strict) Mode
# =============================================================================

resource "cloudflare_zone_settings_override" "ssl" {
  zone_id = local.zone_id

  settings {
    # SSL Mode: Full (Strict) - HTTPS everywhere with validated certificate
    ssl = "strict"

    # Always use HTTPS (users always see HTTPS)
    always_use_https = "on"

    # Automatic HTTPS Rewrites
    automatic_https_rewrites = "on"

    # Minimum TLS version
    min_tls_version = "1.2"

    # Brotli compression
    brotli = "on"

    # Rocket Loader (disabled to avoid JS issues)
    rocket_loader = "off"

    # IP geolocation header
    ip_geolocation = "on"
  }

  # Wait for certificate to be created first
  depends_on = [cloudflare_origin_ca_certificate.origin]
}

# =============================================================================
# WAF - Rate Limiting
# =============================================================================

resource "cloudflare_ruleset" "rate_limiting" {
  count       = var.enable_waf ? 1 : 0
  zone_id     = local.zone_id
  name        = "Cactus Rate Limiting"
  description = "Rate limiting rules for Cactus CRM"
  kind        = "zone"
  phase       = "http_ratelimit"

  # Rate limit API endpoints
  rules {
    action = "block"
    ratelimit {
      characteristics     = ["ip.src"]
      period              = 60
      requests_per_period = 100
      mitigation_timeout  = 600
    }
    expression  = "(http.request.uri.path contains \"/api/\")"
    description = "Rate limit API requests"
    enabled     = true
  }

  # Strict rate limit on auth endpoints
  rules {
    action = "block"
    ratelimit {
      characteristics     = ["ip.src"]
      period              = 60
      requests_per_period = 10
      mitigation_timeout  = 3600
    }
    expression  = "(http.request.uri.path contains \"/api/v1/auth/login\")"
    description = "Strict rate limit on login"
    enabled     = true
  }
}

# =============================================================================
# WAF - Security Rules
# =============================================================================

resource "cloudflare_ruleset" "security" {
  count       = var.enable_waf ? 1 : 0
  zone_id     = local.zone_id
  name        = "Cactus Security Rules"
  description = "Custom security rules for Cactus CRM"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  # Block known bad bots
  rules {
    action      = "block"
    expression  = "(cf.client.bot) or (cf.threat_score gt 30)"
    description = "Block bad bots and high threat scores"
    enabled     = true
  }

  # Block requests from Tor exit nodes (optional)
  rules {
    action      = "managed_challenge"
    expression  = "(ip.src in $cf.anonymizer)"
    description = "Challenge anonymous proxies"
    enabled     = false  # Disabled by default
  }

  # Protect admin routes
  rules {
    action      = "managed_challenge"
    expression  = "(http.request.uri.path contains \"/admin\") and (cf.threat_score gt 5)"
    description = "Extra protection for admin routes"
    enabled     = true
  }
}

# =============================================================================
# Page Rules (Optional)
# =============================================================================

# Cache static assets
resource "cloudflare_page_rule" "cache_static" {
  zone_id  = local.zone_id
  target   = "${var.domain}/_next/static/*"
  priority = 1

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 604800  # 7 days
    browser_cache_ttl = 604800
  }
}

# Bypass cache for API
resource "cloudflare_page_rule" "bypass_api" {
  zone_id  = local.zone_id
  target   = "${var.domain}/api/*"
  priority = 2

  actions {
    cache_level = "bypass"
    disable_performance = true
  }
}

