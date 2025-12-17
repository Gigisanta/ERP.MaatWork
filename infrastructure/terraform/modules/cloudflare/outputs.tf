# =============================================================================
# Cloudflare Module - Outputs
# =============================================================================

output "zone_id" {
  description = "Cloudflare Zone ID"
  value       = local.zone_id
}

output "root_record_id" {
  description = "ID of the root DNS record"
  value       = cloudflare_record.root.id
}

output "www_record_id" {
  description = "ID of the www DNS record"
  value       = cloudflare_record.www.id
}

output "nameservers" {
  description = "Cloudflare nameservers for the zone"
  value       = var.zone_id != null ? [] : data.cloudflare_zone.main[0].name_servers
}

# =============================================================================
# Origin Certificate Outputs (for Nginx configuration)
# =============================================================================

output "origin_certificate" {
  description = "Cloudflare Origin CA Certificate (PEM format)"
  value       = cloudflare_origin_ca_certificate.origin.certificate
  sensitive   = true
}

output "origin_private_key" {
  description = "Private key for the origin certificate (PEM format)"
  value       = tls_private_key.origin.private_key_pem
  sensitive   = true
}

output "origin_certificate_expires" {
  description = "Expiration date of the origin certificate"
  value       = cloudflare_origin_ca_certificate.origin.expires_on
}


