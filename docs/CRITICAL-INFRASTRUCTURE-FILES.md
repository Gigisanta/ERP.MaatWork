# Archivos Críticos de Infraestructura y Redes

## ⚠️ ADVERTENCIA

Los siguientes archivos son **CRÍTICOS** para la operación de producción. Si se modifican incorrectamente, pueden:

- ❌ **Romper conectividad** (puertos, SSL, Security Groups)
- ❌ **Exponer el servidor** (Security Groups mal configurados)
- ❌ **Cortar acceso a la aplicación** (Nginx mal configurado)
- ❌ **Romper SSL/TLS** (certificados, Cloudflare)
- ❌ **Causar downtime** (PM2, servicios)

## 📋 Archivos Críticos

### 1. Configuración de Nginx

**Archivo:** `infrastructure/mvp/nginx.conf`

**Por qué es crítico:**
- Define puertos HTTP (80) y HTTPS (443)
- Configura SSL/TLS con Cloudflare Origin CA
- Define upstreams para API (3001), Web (3000), Analytics (3002)
- Configura rate limiting y headers de seguridad
- Redirección HTTP → HTTPS

**Riesgos de modificación incorrecta:**
- Cambiar puertos rompe la conectividad
- Modificar rutas SSL rompe HTTPS
- Cambiar upstreams rompe el routing
- Modificar headers rompe Cloudflare

**✅ Está en `.cursorignore`** (la IA tendrá más cuidado)
**❌ NO está en `.gitignore`** (debe versionarse)

---

### 2. Configuración de Terraform

**Archivos:** `infrastructure/terraform/**/*.tf`

**Por qué es crítico:**
- Define Security Groups (puertos 80, 443, 22)
- Configura rangos IP de Cloudflare
- Define recursos EC2, RDS, VPC
- Configura Cloudflare SSL mode (Full Strict)
- Define DNS records

**Riesgos de modificación incorrecta:**
- Cambiar Security Groups puede exponer/bloquear el servidor
- Modificar rangos Cloudflare rompe conectividad
- Cambiar recursos EC2/RDS puede causar downtime
- Modificar SSL mode rompe HTTPS

**✅ Está en `.cursorignore`** (la IA tendrá más cuidado)
**❌ NO está en `.gitignore`** (debe versionarse)

**Archivos específicos más críticos:**
- `infrastructure/terraform/modules/aws-compute/main.tf` - Security Groups
- `infrastructure/terraform/modules/cloudflare/main.tf` - SSL/DNS
- `infrastructure/terraform/environments/prod/*.tf` - Configuración producción

---

### 3. Configuración de PM2

**Archivo:** `ecosystem.config.js`

**Por qué es crítico:**
- Define puertos de servicios: API (3001), Web (3000), Analytics (3002)
- Configura hosts (127.0.0.1 para Nginx proxy)
- Define límites de memoria y restart policies

**Riesgos de modificación incorrecta:**
- Cambiar puertos rompe el routing de Nginx
- Modificar hosts puede exponer servicios públicamente
- Cambiar límites de memoria puede causar crashes

**✅ Está en `.cursorignore`** (la IA tendrá más cuidado)
**❌ NO está en `.gitignore`** (debe versionarse)

---

### 4. Scripts de Deploy

**Archivos:**
- `scripts/deploy.sh`
- `infrastructure/scripts/deploy.sh`
- `infrastructure/scripts/deploy.ps1`

**Por qué es crítico:**
- Aplican configuración de Nginx al servidor
- Reinician servicios PM2
- Pueden modificar configuración de red

**Riesgos de modificación incorrecta:**
- Cambios incorrectos se aplican directamente a producción
- Pueden romper servicios durante deploy

**✅ Está en `.cursorignore`** (la IA tendrá más cuidado)
**❌ NO está en `.gitignore`** (debe versionarse)

---

## 🔒 Protección

### `.cursorignore`

Estos archivos están en `.cursorignore` para que la IA tenga **EXTREMO cuidado** al sugerir cambios automáticos. La IA debería:

1. ⚠️ Advertir antes de modificar
2. ⚠️ Explicar el impacto
3. ⚠️ Sugerir revisión manual
4. ⚠️ No hacer cambios automáticos sin confirmación

### `.gitignore`

**❌ NO están en `.gitignore`** porque:

- Son parte del código fuente
- Deben versionarse para control de cambios
- Permiten rollback si algo sale mal
- Permiten revisión de cambios en PRs

---

## ✅ Checklist Antes de Modificar

Antes de modificar cualquier archivo crítico:

- [ ] **Entender el impacto** en producción
- [ ] **Probar en desarrollo** primero
- [ ] **Revisar cambios línea por línea**
- [ ] **Verificar puertos** no cambian (80, 443, 3000, 3001, 3002)
- [ ] **Verificar SSL** no se rompe
- [ ] **Verificar Security Groups** no se modifican incorrectamente
- [ ] **Verificar upstreams** de Nginx coinciden con PM2
- [ ] **Hacer backup** de configuración actual
- [ ] **Tener plan de rollback** listo

---

## 🚨 Qué Hacer Si Algo Sale Mal

### Si Nginx no funciona:
```bash
# Restaurar configuración anterior
sudo cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl reload nginx
```

### Si Security Groups están mal:
```bash
# Revertir cambios en Terraform
cd infrastructure/terraform/environments/prod
terraform plan  # Ver qué cambió
terraform apply  # Revertir si es necesario
```

### Si PM2 no inicia servicios:
```bash
# Verificar configuración
pm2 list
pm2 logs

# Reiniciar con configuración anterior
pm2 delete all
pm2 start ecosystem.config.js
```

---

## 📚 Referencias

- [NGINX-SSL-CONFIGURATION.md](./NGINX-SSL-CONFIGURATION.md) - Configuración SSL
- [OPERATIONS.md](./OPERATIONS.md) - Guía de operaciones
- [infrastructure/README.md](../infrastructure/README.md) - Infraestructura
