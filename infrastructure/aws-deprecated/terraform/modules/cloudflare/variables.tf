# =============================================================================
# Cloudflare Module - Variables
# =============================================================================

variable "zone_id" {
  description = "Cloudflare Zone ID (optional if domain is provided)"
  type        = string
  default     = null
}

variable "domain" {
  description = "Domain name (e.g., example.com)"
  type        = string
}

variable "elastic_ip" {
  description = "Elastic IP address to point DNS records to"
  type        = string
}

variable "enable_waf" {
  description = "Enable WAF rules (rate limiting, security rules)"
  type        = bool
  default     = true
}

variable "create_api_subdomain" {
  description = "Create a separate api.domain.com subdomain"
  type        = bool
  default     = false
}




