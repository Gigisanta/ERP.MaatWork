# 🚀 Aplicar Configuración SSL en Nginx

## ✅ Certificado Encontrado

**Ubicación del certificado:**
- Certificado: `/etc/ssl/cloudflare/origin.crt`
- Clave privada: `/etc/ssl/cloudflare/origin.key` (verificar que existe)

## 🔍 Verificar Clave Privada

```bash
# En el servidor
ls -la /etc/ssl/cloudflare/

# Debe mostrar:
# origin.crt (certificado)
# origin.key (clave privada)
```

Si no existe `origin.key`, necesitas obtenerla de Terraform o generarla.

## 🚀 Aplicar Cambios

### Paso 1: Subir nginx.conf Actualizado

```bash
# Desde tu máquina local
scp infrastructure/mvp/nginx.conf ec2-user@56.125.148.180:/home/ec2-user/nginx.conf
```

### Paso 2: En el Servidor - Hacer Backup y Aplicar

```bash
# En el servidor
ssh ec2-user@56.125.148.180

# 1. Hacer backup de configuración actual
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)

# 2. Copiar nueva configuración
sudo cp /home/ec2-user/nginx.conf /etc/nginx/nginx.conf

# 3. Verificar que la clave privada existe
sudo ls -la /etc/ssl/cloudflare/origin.key

# Si no existe, obtenerla de Terraform (ver abajo)
```

### Paso 3: Verificar Configuración

```bash
# Verificar sintaxis de nginx
sudo nginx -t

# Debe mostrar:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Paso 4: Recargar Nginx

```bash
# Recargar sin downtime
sudo systemctl reload nginx

# O reiniciar si reload falla
sudo systemctl restart nginx

# Verificar estado
sudo systemctl status nginx
```

### Paso 5: Verificar que Escucha en Puerto 443

```bash
# Verificar que nginx escucha en puerto 443
sudo ss -tulpn | grep :443

# Debe mostrar algo como:
# tcp   LISTEN 0  511  0.0.0.0:443  0.0.0.0:*  users:(("nginx",pid=xxx,fd=xxx))
```

## 🧪 Probar Después de Aplicar

```bash
# Desde tu PC (PowerShell)
Invoke-WebRequest -Uri "https://maat.work/health" -Method Head

# Debe responder HTTP 200
```

## ⚠️ Si Falta la Clave Privada

Si `/etc/ssl/cloudflare/origin.key` no existe:

### Opción 1: Obtener de Terraform

```bash
# En tu máquina local
cd infrastructure/terraform
terraform output origin_private_key > /tmp/origin.key

# Copiar al servidor
scp /tmp/origin.key ec2-user@56.125.148.180:/tmp/

# En el servidor
sudo mkdir -p /etc/ssl/cloudflare
sudo mv /tmp/origin.key /etc/ssl/cloudflare/origin.key
sudo chmod 600 /etc/ssl/cloudflare/origin.key
```

### Opción 2: Obtener desde Cloudflare Dashboard

1. Cloudflare Dashboard → SSL/TLS → Origin Server
2. Click en "Create Certificate"
3. Descargar certificado y clave privada
4. Subir al servidor en `/etc/ssl/cloudflare/`

## 📋 Checklist Final

- [ ] Certificado existe: `/etc/ssl/cloudflare/origin.crt`
- [ ] Clave privada existe: `/etc/ssl/cloudflare/origin.key`
- [ ] nginx.conf actualizado con rutas correctas
- [ ] `sudo nginx -t` pasa sin errores
- [ ] Nginx recargado: `sudo systemctl reload nginx`
- [ ] Puerto 443 escuchando: `sudo ss -tulpn | grep :443`
- [ ] HTTPS funciona: `Invoke-WebRequest -Uri "https://maat.work/health"`

## 🎯 Resultado Esperado

Después de aplicar estos cambios:
- ✅ Nginx escucha en puerto 443 (HTTPS)
- ✅ HTTP (80) redirige a HTTPS (443)
- ✅ Cloudflare "Full (Strict)" puede conectarse
- ✅ Error 521 resuelto
