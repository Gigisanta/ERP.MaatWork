# 🔍 Diagnóstico Completo: Security Group vs Cloudflare

## ✅ Estado Actual del Security Group

Según el output que compartiste:

### Puerto 80 (HTTP)
- ✅ **15 rangos IPv4** de Cloudflare configurados
- ✅ **7 rangos IPv6** de Cloudflare configurados
- ✅ Configuración parece completa

### Puerto 443 (HTTPS)
- ✅ **14 rangos IPv4** de Cloudflare configurados
- ✅ **7 rangos IPv6** de Cloudflare configurados
- ✅ Configuración parece completa

### Puerto 22 (SSH)
- ⚠️ **0.0.0.0/0** (desde cualquier lugar)
- ⚠️ Esto es normal para SSH, pero podrías restringirlo más tarde

## 🔍 Verificar si Faltan Rangos

Cloudflare actualiza sus rangos IP periódicamente. Ejecuta este script para verificar:

```bash
# En el servidor
chmod +x verificar-rangos-cloudflare-completos.sh
./verificar-rangos-cloudflare-completos.sh
```

Este script:
1. Obtiene los rangos **actuales** de Cloudflare
2. Compara con los rangos configurados en tu Security Group
3. Te dice si faltan rangos o hay rangos obsoletos

## 🎯 Si Todos los Rangos Están Configurados

Si el script confirma que todos los rangos están configurados, **el problema NO es el Security Group**. El problema está en:

### 1. Cloudflare SSL Mode

**Verificar:**
1. Cloudflare Dashboard → Tu dominio (`maat.work`)
2. SSL/TLS → Overview
3. **Debe estar en "Full"** (no "Flexible")

**Si está en "Flexible":**
- Cloudflare intenta HTTPS → tu servidor
- Tu servidor solo tiene HTTP
- Cloudflare no puede validar SSL → Error 521

**Solución:** Cambiar a "Full"

### 2. DNS en Cloudflare

**Verificar:**
1. Cloudflare Dashboard → DNS → Records
2. Verifica registro A:
   - ✅ Apunta a: `56.125.148.180`
   - ✅ Está "Proxied" (nube naranja activada)

### 3. Probar Acceso Directo

**Desde tu PC:**
```powershell
Invoke-WebRequest -Uri "http://56.125.148.180/health" -Method Head -TimeoutSec 5
```

**Si responde HTTP 200:**
- ✅ Servidor es accesible
- ✅ Security Group está bien
- ❌ Problema es Cloudflare (SSL Mode, DNS)

**Si da timeout:**
- ❌ Security Group aún bloquea (faltan rangos o hay otro problema)

## 🛠️ Próximos Pasos

1. **Ejecuta el script de verificación:**
   ```bash
   ./verificar-rangos-cloudflare-completos.sh
   ```

2. **Si faltan rangos**, agrégalos con:
   ```bash
   ./agregar-cloudflare-sg-seguro.sh
   ```

3. **Si todos los rangos están**, verifica:
   - Cloudflare SSL Mode → "Full"
   - DNS apunta correctamente
   - Cloudflare está "Proxied"

4. **Prueba desde tu PC:**
   ```powershell
   Invoke-WebRequest -Uri "http://56.125.148.180/health" -Method Head
   ```

## 📋 Checklist Final

- [ ] Todos los rangos de Cloudflare están en Security Group
- [ ] Cloudflare SSL Mode está en "Full"
- [ ] DNS en Cloudflare apunta a `56.125.148.180`
- [ ] Cloudflare está "Proxied" (nube naranja)
- [ ] Servidor responde desde fuera (test desde PC)
