# 🔍 Verificar Certificado SSL en el Servidor

## 🎯 Objetivo

Verificar dónde está el certificado SSL y actualizar nginx.conf para usarlo.

## 🔍 Verificar Certificado en el Servidor

Ejecuta estos comandos en el servidor para encontrar el certificado:

```bash
# Buscar certificados comunes
sudo find /etc -name "*.crt" -o -name "*.pem" -o -name "*.cert" 2>/dev/null | grep -E "(ssl|nginx|cert|cloudflare|origin)"

# Verificar ubicaciones comunes
ls -la /etc/nginx/ssl/ 2>/dev/null
ls -la /etc/ssl/certs/ 2>/dev/null
ls -la /etc/ssl/private/ 2>/dev/null
ls -la ~/ssl/ 2>/dev/null
ls -la /home/ec2-user/ssl/ 2>/dev/null

# Verificar si nginx puede leer el certificado
sudo nginx -t 2>&1 | grep -i ssl
```

## 📋 Rutas Comunes de Certificados

- `/etc/nginx/ssl/maat.work.crt` y `/etc/nginx/ssl/maat.work.key`
- `/etc/ssl/certs/maat.work.crt` y `/etc/ssl/private/maat.work.key`
- `/home/ec2-user/ssl/maat.work.crt` y `/home/ec2-user/ssl/maat.work.key`

## ✅ Actualizar nginx.conf

He actualizado `infrastructure/mvp/nginx.conf` para:
1. ✅ Escuchar en puerto 443 con SSL
2. ✅ Redirigir HTTP (80) a HTTPS (443)
3. ✅ Configurar SSL con certificados

**IMPORTANTE:** Ajusta las rutas de certificados en las líneas:
```nginx
ssl_certificate /etc/nginx/ssl/maat.work.crt;
ssl_certificate_key /etc/nginx/ssl/maat.work.key;
```

## 🚀 Aplicar Cambios

```bash
# En el servidor
# 1. Subir nginx.conf actualizado
scp infrastructure/mvp/nginx.conf ec2-user@56.125.148.180:/home/ec2-user/

# 2. En el servidor, hacer backup y aplicar
ssh ec2-user@56.125.148.180
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
sudo cp /home/ec2-user/nginx.conf /etc/nginx/nginx.conf

# 3. Ajustar rutas de certificados si es necesario
sudo nano /etc/nginx/nginx.conf
# Buscar y cambiar:
# ssl_certificate /etc/nginx/ssl/maat.work.crt;
# ssl_certificate_key /etc/nginx/ssl/maat.work.key;

# 4. Verificar configuración
sudo nginx -t

# 5. Si está bien, recargar nginx
sudo systemctl reload nginx

# 6. Verificar que escucha en puerto 443
sudo ss -tulpn | grep :443
```

## 🧪 Verificar Después

```bash
# Verificar que nginx escucha en puerto 443
sudo ss -tulpn | grep :443

# Debe mostrar algo como:
# tcp   LISTEN 0  511  0.0.0.0:443  0.0.0.0:*  users:(("nginx",pid=xxx,fd=xxx))

# Probar desde tu PC
Invoke-WebRequest -Uri "https://maat.work/health" -Method Head
```

## ⚠️ Si el Certificado No Existe

Si no encuentras el certificado, puedes obtenerlo de Terraform:

```bash
# En tu máquina local
cd infrastructure/terraform
terraform output origin_certificate > /tmp/cert.pem
terraform output origin_private_key > /tmp/key.pem

# Copiar al servidor
scp /tmp/cert.pem ec2-user@56.125.148.180:/tmp/
scp /tmp/key.pem ec2-user@56.125.148.180:/tmp/

# En el servidor
sudo mkdir -p /etc/nginx/ssl
sudo mv /tmp/cert.pem /etc/nginx/ssl/maat.work.crt
sudo mv /tmp/key.pem /etc/nginx/ssl/maat.work.key
sudo chmod 600 /etc/nginx/ssl/maat.work.key
sudo chmod 644 /etc/nginx/ssl/maat.work.crt
```
