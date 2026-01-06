# Nginx SSL/TLS Configuration

## Overview

Nginx está configurado para usar **Cloudflare Origin CA Certificate** con modo **Full (Strict)** SSL. Esto proporciona:

- ✅ HTTPS en puerto 443
- ✅ Redirección automática HTTP (80) → HTTPS (443)
- ✅ HTTP/2 habilitado
- ✅ Protocolos TLSv1.2 y TLSv1.3
- ✅ Headers de seguridad configurados

## Configuración

**Archivo:** `infrastructure/mvp/nginx.conf`

### Certificados SSL

Los certificados Cloudflare Origin CA están ubicados en:
- Certificado: `/etc/ssl/cloudflare/origin.crt`
- Clave privada: `/etc/ssl/cloudflare/origin.key`

**Permisos requeridos:**
```bash
sudo chmod 644 /etc/ssl/cloudflare/origin.crt
sudo chmod 600 /etc/ssl/cloudflare/origin.key
sudo chown nginx:nginx /etc/ssl/cloudflare/origin.*
```

### Configuración SSL en nginx.conf

```nginx
# SSL Configuration (bloque http)
ssl_certificate /etc/ssl/cloudflare/origin.crt;
ssl_certificate_key /etc/ssl/cloudflare/origin.key;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...';
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# HTTPS Server
server {
    listen 443 ssl;
    http2 on;  # HTTP/2 habilitado (directiva separada, no deprecated)
    server_name maat.work www.maat.work;
    # ... configuración ...
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name maat.work www.maat.work;
    return 301 https://$host$request_uri;
}
```

## Aplicar Cambios

### Paso 1: Subir Configuración

```bash
# Desde tu máquina local
scp infrastructure/mvp/nginx.conf ec2-user@SERVER_IP:/home/ec2-user/
```

### Paso 2: Aplicar en el Servidor

```bash
# En el servidor
sudo cp /home/ec2-user/nginx.conf /etc/nginx/nginx.conf
sudo nginx -t  # Verificar sintaxis
sudo systemctl reload nginx  # Aplicar cambios
```

### Paso 3: Verificar

```bash
# Verificar que escucha en puerto 443
sudo ss -tulpn | grep :443

# Debe mostrar:
# tcp   LISTEN 0  511  0.0.0.0:443  0.0.0.0:*  users:(("nginx",pid=xxx,fd=xxx))
```

## Cloudflare Configuration

### SSL Mode

Terraform configura Cloudflare para usar **Full (Strict)** mode:
- Cloudflare → HTTPS (termina SSL)
- Cloudflare → Servidor → HTTPS (valida certificado)
- Requiere certificado válido en el servidor

**Verificar en Cloudflare Dashboard:**
1. SSL/TLS → Overview
2. Debe estar en "Full (Strict)"

### Security Group

El Security Group de AWS está configurado para permitir tráfico solo desde rangos IP de Cloudflare:
- Puerto 80 (HTTP): Solo rangos Cloudflare IPv4/IPv6
- Puerto 443 (HTTPS): Solo rangos Cloudflare IPv4/IPv6

**Verificar rangos actualizados:**
```bash
# En el servidor
curl -s https://www.cloudflare.com/ips-v4 | wc -l  # Debe ser 15
curl -s https://www.cloudflare.com/ips-v6 | wc -l  # Debe ser 7
```

## Troubleshooting

### Puerto 443 No Escucha

1. **Verificar certificados:**
   ```bash
   sudo ls -la /etc/ssl/cloudflare/
   sudo -u nginx test -r /etc/ssl/cloudflare/origin.crt
   sudo -u nginx test -r /etc/ssl/cloudflare/origin.key
   ```

2. **Verificar sintaxis:**
   ```bash
   sudo nginx -t
   ```

3. **Verificar logs:**
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   ```

4. **Reiniciar nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

### Error 521 (Cloudflare)

Si Cloudflare muestra error 521:
1. Verificar que nginx escucha en puerto 443
2. Verificar Security Group permite rangos Cloudflare
3. Verificar Cloudflare SSL Mode está en "Full (Strict)"
4. Verificar certificados son válidos y no expirados

## Referencias

- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Cloudflare Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
- [Cloudflare IP Ranges](https://www.cloudflare.com/ips/)
