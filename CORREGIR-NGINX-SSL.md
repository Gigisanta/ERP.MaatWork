# 🔧 Problema: Nginx No Tiene Configuración SSL

## 🔍 Problema Identificado

**Terraform configura Cloudflare para "Full (Strict)" SSL:**
- ✅ Genera certificados SSL (Origin CA Certificate)
- ✅ Configura Cloudflare SSL Mode = "strict"
- ❌ **Pero nginx.conf solo escucha en puerto 80 (HTTP)**
- ❌ **No hay configuración para puerto 443 (HTTPS)**
- ❌ **No se instalan los certificados SSL en el servidor**

**Resultado:** Cloudflare intenta conectarse por HTTPS pero nginx no tiene SSL → Error 521

## ✅ Solución: Dos Opciones

### Opción 1: Cambiar Cloudflare a "Full" (Más Fácil - Recomendado)

**"Full" no requiere certificado SSL en el servidor:**
- Cloudflare → HTTPS (termina SSL)
- Cloudflare → Tu servidor → HTTP (sin SSL)
- Cloudflare no valida SSL del servidor

**Pasos:**
1. Cloudflare Dashboard → Tu dominio
2. SSL/TLS → Overview
3. Cambiar de "Full (Strict)" a **"Full"**
4. Guardar y esperar 1-2 minutos

**Ventajas:**
- ✅ No requiere cambios en código
- ✅ Funciona inmediatamente
- ✅ Nginx puede seguir escuchando solo en puerto 80

**Desventajas:**
- ⚠️ Menos seguro (pero aceptable si Cloudflare está como proxy)

### Opción 2: Agregar SSL a Nginx (Más Seguro)

**Requiere:**
1. Obtener certificados SSL de Terraform
2. Instalar certificados en el servidor
3. Actualizar nginx.conf para escuchar en puerto 443
4. Configurar SSL en nginx

**Pasos:**

#### 2.1 Obtener Certificados de Terraform

```bash
# En tu máquina local (donde tienes Terraform)
cd infrastructure/terraform

# Obtener certificado y clave privada
terraform output origin_certificate > /tmp/cert.pem
terraform output origin_private_key > /tmp/key.pem
```

#### 2.2 Instalar Certificados en el Servidor

```bash
# En el servidor
sudo mkdir -p /etc/nginx/ssl
sudo chmod 700 /etc/nginx/ssl

# Copiar certificados (desde tu máquina local)
scp /tmp/cert.pem ec2-user@56.125.148.180:/tmp/
scp /tmp/key.pem ec2-user@56.125.148.180:/tmp/

# En el servidor
sudo mv /tmp/cert.pem /etc/nginx/ssl/maat.work.crt
sudo mv /tmp/key.pem /etc/nginx/ssl/maat.work.key
sudo chmod 600 /etc/nginx/ssl/maat.work.key
sudo chmod 644 /etc/nginx/ssl/maat.work.crt
```

#### 2.3 Actualizar nginx.conf

Agregar bloque `server` para puerto 443 con SSL (ver `nginx.conf.ssl` que creé)

## 🎯 Recomendación

**Para resolver rápido:** Usa Opción 1 (cambiar Cloudflare a "Full")

**Para máxima seguridad:** Usa Opción 2 (agregar SSL a nginx)

## 📋 Verificar Después

```bash
# Verificar que nginx escucha en puerto 443 (si usaste Opción 2)
sudo ss -tulpn | grep :443

# Probar desde tu PC
Invoke-WebRequest -Uri "https://maat.work" -Method Head
```
