# Guía de Operaciones

Esta guía consolida toda la información sobre deploy, configuración, monitoreo y troubleshooting del proyecto MAATWORK.

## Índice

1. [Requisitos y Setup](#requisitos-y-setup)
2. [Configuración](#configuración)
3. [Desarrollo Local](#desarrollo-local)
4. [Base de Datos](#base-de-datos)
5. [Deploy en Producción](#deploy-en-producción)
6. [Nginx y SSL/TLS](#nginx-y-ssltls)
7. [Monitoreo y Métricas](#monitoreo-y-métricas)
8. [Troubleshooting](#troubleshooting)
9. [Seguridad y Performance](#seguridad-y-performance)
10. [Archivos Críticos de Infraestructura](#archivos-críticos-de-infraestructura)

---

## Requisitos y Setup

### Requisitos del Sistema

- Node.js >=22.0.0 <25.0.0
- pnpm >=9.0.0
- PostgreSQL 16 (o `docker compose up -d`)
- Python 3.10+ (opcional, para analytics-service)
- PM2 en VPS (producción)

### Instalación Inicial

```bash
# 1. Instalar dependencias
pnpm install

# 2. Iniciar PostgreSQL (Docker)
docker compose up -d

# 3. Configurar variables de entorno
cp apps/api/config-example.env apps/api/.env
# Editar apps/api/.env con tus valores

# 4. Instalar dependencias Python (opcional)
pnpm -F @maatwork/analytics-service install
```

---

## Configuración

### Variables de Entorno

#### API (`apps/api/.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/maatwork
PORT=3001
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000
CSP_ENABLED=false
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d

# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/v1/auth/google/callback
GOOGLE_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

#### Web (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
JWT_SECRET=change-me  # Debe coincidir con API
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

**Nota:** El archivo `.env.local` debe crearse manualmente ya que está en `.gitignore` para proteger secretos.

---

## Desarrollo Local

### Iniciar Servicios

```bash
# Iniciar todos los servicios (consola única con logs coloreados)
pnpm dev

# Modo básico (sin consola unificada)
pnpm dev:basic

# Detener todos los servicios
pnpm dev:kill
```

**URLs de Desarrollo:**

- Web: <http://localhost:3000>
- API: <http://localhost:3001>
- Analytics: <http://localhost:3002> (ajusta `ANALYTICS_PORT` si el puerto está ocupado)

### Verificar Salud

```bash
# Verificar API
curl http://localhost:3001/health

# Verificar servicios en consola (logs en vivo)
```

---

## Base de Datos

### Migraciones (Drizzle)

```bash
# Generar migraciones desde schema (si cambias schema)
pnpm -F @maatwork/db run generate

# Aplicar migraciones (usa baseline en migrations_squashed)
pnpm -F @maatwork/db run migrate

# Seeds esenciales (opcional; la API también los ejecuta en startup)
pnpm -F @maatwork/db run db:init
```

**Notas Importantes:**

- ❌ **NUNCA usar `drizzle-kit push`** en CI/prod (es destructivo)
- Migraciones: baseline unificada en `packages/db/migrations_squashed`
- En desarrollo, la API corre migraciones automáticamente al iniciar si `AUTO_MIGRATE=true` (por defecto cuando `NODE_ENV !== 'production'`)

### Verificar Estado de Base de Datos

```bash
# Verificar salud de BD
pnpm tsx scripts/check-db-health.ts

# Verificar migraciones
pnpm tsx scripts/verify-migrations.ts
```

---

### Deploy en Producción

El deploy se gestiona mediante el script centralizado en `scripts/deploy.sh`.

```bash
# Ejecutar deploy completo (pull, install, build, restart)
./scripts/deploy.sh
```

### Build y Deploy de API (Manual)

```bash
# 1. Build de la API
pnpm -F @maatwork/api build

# 2. Iniciar con PM2
pm2 start infrastructure/pm2/ecosystem.config.js --env production

# 3. Ver logs
pm2 logs maatwork-api

# 4. Ver estado
pm2 status

# 5. Reiniciar
pm2 restart maatwork-api

# 6. Detener
pm2 stop maatwork-api
```

### Configurar Logrotate PM2

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 60
pm2 set pm2-logrotate:rotateInterval 0 0 * * *
```

### Deploy de Web (Next.js)

```bash
# Build de producción
pnpm -F @maatwork/web build

# Iniciar servidor de producción
pnpm -F @maatwork/web start

# O usar PM2
pm2 start "pnpm -F @maatwork/web start" --name maatwork-web
```

---

### Deploy en Fly.io (Producción)

**URLs:**
- **Web:** https://maatwork.fly.dev
- **API:** https://maatwork-api.fly.dev

**Configuración:**

| Setting | Value |
|---------|-------|
| Region | `sjc` (San Jose) |
| Web App | `maatwork` |
| API App | `maatwork-api` |
| Database | PostgreSQL (`maatwork-db`) |

**Comandos:**

```bash
# Deploy web
fly deploy --config fly-web.toml

# Deploy API
fly deploy --config apps/api/fly.toml

# Ver logs
fly logs maatwork
fly logs maatwork-api

# Redeploy
fly deploy --config fly-web.toml --force
```

**Notas:**
- La base de datos PostgreSQL está gestionada por Fly.io
- La variable `DATABASE_URL` se inyecta automáticamente al hacer `fly postgres attach`
- Secrets: `JWT_SECRET`, `NEXT_PUBLIC_API_URL` configurados

**Comandos:**

```bash
# Deploy web
fly deploy --config fly-web.toml

# Deploy API
fly deploy --config apps/api/fly.toml

# Ver logs
fly logs maatwork
fly logs maatwork-api

# Redeploy
fly deploy --config fly-web.toml --force
```

**Errores comunes:**

1. **Error de build:**
   - Usar `node-linker=hoisted` en `.npmrc`
   - Limpiar node_modules y reconstruir

2. **Cannot connect to database:**
   - Verificar `fly postgres attach` se ejecutó
   - Revisar secrets con `fly secrets list`

## Comandos Deploy (Fly.io)

```bash
# Web app
fly deploy --config fly-web.toml

# API
fly deploy --config apps/api/fly.toml

fly logs maatwork-api
```

## Notas Finales
fly logs maatwork
fly logs maatwork-api
```
- La variable `DATABASE_URL` se inyecta automáticamente al hacer `fly postgres attach`
- Secrets: `JWT_SECRET`, `NEXT_PUBLIC_API_URL` configurados

**URL:** https://maatwork-production.up.railway.app

**Configuración:**

| Setting | Value |
|---------|-------|
| Root Directory | `/` |
| Build Command | `pnpm install --frozen-lockfile && pnpm -F @maatwork/types build && pnpm -F @maatwork/utils build && pnpm -F @maatwork/logger build && pnpm -F @maatwork/db build && pnpm -F @maatwork/ui build && pnpm -F @maatwork/web build` |
| Start Command | `pnpm -F @maatwork/web start` |
| Port | 3000 (auto-detected) |

**Notas importantes:**

- **Solo se deploya la web app** - No API ni analytics
- **NO usar standalone mode** - Causa errores 502
- **Comandos:**

```bash
# Trigger deployment
git push origin feature/railway-migration

# O usar CLI
railway up --detach

# Ver logs
railway logs --lines 100

# Redeploy
railway redeploy --yes
```

**Errores comunes:**

1. **502 Application failed to respond:**
   - Verificar que el start command sea `pnpm -F @maatwork/web start`
   - NO usar `output: 'standalone'` en next.config
   - Verificar PORT = 3000

2. **Build fails:**
   - Verificar Root Directory sea `/`
   - Verificar pnpm está disponible

```bash
# Build de producción
pnpm -F @maatwork/web build

# Iniciar servidor de producción
pnpm -F @maatwork/web start

# O usar PM2
pm2 start "pnpm -F @maatwork/web start" --name maatwork-web
```

### Variables de Entorno en Producción

**API (`apps/api/.env`):**

- `DATABASE_URL` - URL de PostgreSQL
- `PORT` - Puerto del servidor (default: 3001)
- `LOG_LEVEL` - Nivel de logging (info/warn/error)
- `CORS_ORIGINS` - Orígenes permitidos (separados por coma)
- `JWT_SECRET` - Secret para JWT tokens (debe ser fuerte)
- `JWT_EXPIRES_IN` - Expiración de tokens (default: 7d)
- `CSP_ENABLED` - Habilitar CSP (opcional)

**Web (`apps/web/.env.local`):**

- `NEXT_PUBLIC_API_URL` - URL de la API en producción
- `JWT_SECRET` - Debe coincidir con API

---

## Monitoreo y Métricas

### Métricas de Queries

#### Endpoints Disponibles

- **GET `/v1/admin/query-metrics`**: Métricas en tiempo real de queries
- **GET `/v1/admin/query-analysis`**: Análisis completo con recomendaciones
- **GET `/v1/admin/query-analysis?format=text`**: Reporte en formato texto

#### Interpretación de Métricas

##### Latencia (p50, p95, p99)

- **p50 (mediana)**: 50% de las queries son más rápidas que este valor
- **p95**: 95% de las queries son más rápidas que este valor
- **p99**: 99% de las queries son más rápidas que este valor

**Umbrales recomendados:**

- `< 100ms`: Excelente
- `100-500ms`: Bueno
- `500-1000ms`: Aceptable (revisar optimización)
- `> 1000ms`: Crítico (requiere optimización inmediata)

##### Queries N+1

Patrones N+1 se detectan automáticamente cuando:

- Múltiples queries similares (mismo patrón base) se ejecutan en una ventana de 100ms
- Al menos 5 queries similares en la ventana

**Acción:** Consolidar queries usando JOINs o batch loading.

##### Cache Hit Rate

- **> 70%**: Excelente
- **50-70%**: Bueno (considerar aumentar TTL)
- **< 50%**: Bajo (revisar estrategia de caché)

### EXPLAIN ANALYZE

#### Ejecutar EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON) 
SELECT * FROM contacts WHERE assigned_advisor_id = '...' AND deleted_at IS NULL;
```

#### Interpretar el Plan

##### Tipos de Scans

1. **Index Scan**: Usa índice (óptimo)
2. **Index Only Scan**: Lee solo del índice (muy óptimo)
3. **Seq Scan**: Escanea toda la tabla (ineficiente para tablas grandes)
4. **Bitmap Index Scan**: Escaneo de índice con filtrado adicional

##### Operaciones Costosas

- **Nested Loop**: Puede ser costoso si el loop interno es grande
- **Hash Join**: Eficiente para joins grandes
- **Merge Join**: Eficiente cuando datos están ordenados

##### Métricas Clave

- **Execution Time**: Tiempo total de ejecución
- **Planning Time**: Tiempo de planificación
- **Total Cost**: Costo estimado del plan
- **Buffers**: Uso de memoria compartida y disco

#### Identificar Problemas

##### Sequential Scans en Tablas Grandes

**Problema:** `Seq Scan` en tabla con >10k filas  
**Solución:** Agregar índice en columnas filtradas

##### Nested Loops Costosos

**Problema:** `Nested Loop` con muchas iteraciones  
**Solución:** Considerar Hash Join o agregar índice

##### Alto Planning Time

**Problema:** `Planning Time > 100ms`  
**Solución:** Simplificar query o aumentar `default_statistics_target`

##### Alto Execution Time

**Problema:** `Execution Time > 1000ms`  
**Solución:** Revisar índices, considerar materialized views, optimizar JOINs

### Scripts de Análisis

#### Generar Baseline

```bash
pnpm tsx scripts/generate-performance-baseline.ts
```

Genera reportes de baseline de performance para análisis comparativo.

#### Analizar Queries Críticas

```bash
pnpm tsx scripts/analyze-critical-queries.ts
```

Genera análisis detallado de queries con recomendaciones de optimización.

#### Verificar Uso de Índices

```bash
pnpm tsx scripts/verify-index-usage.ts
```

Genera reporte de uso de índices para identificar índices no utilizados o subutilizados.

### Dashboard de Performance

Acceder a `/admin/performance` para visualizar:

- Métricas en tiempo real
- Top queries lentas
- Cache hit rate
- Queries N+1 detectadas

### Alertas Automáticas

El job `query-performance-alerts` ejecuta diariamente y detecta:

- Queries degradadas (>2x tiempo promedio)
- Queries lentas persistentes (p95 > 1000ms)
- Patrones N+1
- Cache hit rate bajo (<50%)

Las alertas se envían como notificaciones a usuarios admin.

### Reportes Semanales

El job `weekly-performance-report` ejecuta semanalmente y genera:

- Comparación semana a semana
- Identificación de tendencias
- Reportes semanales de performance en formato JSON y texto para análisis de tendencias

### Mejores Prácticas de Monitoreo

1. **Monitoreo continuo**: Revisar métricas regularmente
2. **Baseline antes de cambios**: Generar baseline antes de optimizaciones
3. **Comparar después**: Comparar métricas después de optimizaciones
4. **Documentar cambios**: Documentar optimizaciones y su impacto
5. **Revisar alertas**: Revisar y actuar sobre alertas automáticas

---

## Troubleshooting

### Problemas Comunes

#### API no arranca

**Síntomas:** Error al iniciar la API

**Soluciones:**

1. Verificar `DATABASE_URL` está configurado correctamente
2. Verificar `JWT_SECRET` está configurado
3. Verificar puertos no están ocupados:

   ```bash
   # Windows
   netstat -ano | findstr :3001
   
   # Linux/Mac
   lsof -i :3001
   ```

4. Verificar PostgreSQL está corriendo:

   ```bash
   docker ps | grep postgres
   # Si no está corriendo
   docker compose up -d
   ```

#### 403/Redirects inesperados

**Síntomas:** Usuario autenticado recibe 403 o redirects inesperados

**Soluciones:**

1. Verificar cookie `token` está presente en navegador
2. Verificar `JWT_SECRET` es consistente entre API y Web
3. Verificar token no ha expirado (verificar `JWT_EXPIRES_IN`)
4. Limpiar cookies y hacer login nuevamente

#### Lento al buscar instrumentos

**Síntomas:** Búsqueda de instrumentos es muy lenta

**Soluciones:**

1. Verificar `apps/analytics-service` está corriendo:

   ```bash
   curl http://localhost:3002/health  # Ajusta el puerto si sobrescribiste ANALYTICS_PORT
   ```

2. Verificar conectividad entre API y analytics-service
3. Los timeouts protegerán la API (15s normal, 5min backfill)
4. Verificar logs del servicio Python para errores

#### Seeds fallan por duplicados

**Síntomas:** Error al ejecutar seeds por datos duplicados

**Soluciones:**

1. Asegurarse de idempotencia en seeds
2. Revisar `onConflict*` en código de seeds
3. Limpiar datos antes de re-ejecutar seeds si es necesario

#### Servicios no se detienen correctamente

**Síntomas:** Procesos quedan corriendo después de Ctrl+C

**Soluciones:**

```bash
# Detener todos los servicios
pnpm dev:kill

# O manualmente matar procesos
pkill -f "tsx watch src/index.ts"
pkill -f "next dev"
pkill -f "python.*main.py"
pkill -f "uvicorn.*main:app"
```

#### Servicio Analytics (Python) no inicia

**Síntomas:** El servicio Python no responde

**Soluciones:**

1. El servicio es opcional. Si no está disponible, el API usará fallback a base de datos
2. Verificar Python:

   ```bash
   python3 --version
   ```

3. Instalar dependencias:

   ```bash
   pnpm -F @maatwork/analytics-service install
   ```

4. Iniciar servicio:

   ```bash
   pnpm -F @maatwork/analytics-service dev
   ```

---

## Google OAuth2 y Calendar Integration

### Configuración Inicial

1. **Crear proyecto en Google Cloud Console:**
   - Ir a <https://console.cloud.google.com/>
   - Crear nuevo proyecto o seleccionar existente
   - Habilitar Google Calendar API

2. **Crear credenciales OAuth2:**
   - Ir a "APIs & Services" > "Credentials"
   - Crear "OAuth 2.0 Client ID"
   - Tipo: "Web application"
   - **Authorized redirect URIs** (CRÍTICO - debe coincidir exactamente):
     - Desarrollo: `http://localhost:3001/v1/auth/google/callback`
     - Producción: `https://[tu-dominio]/v1/auth/google/callback`
     - **Importante**: La URI debe coincidir **exactamente** (case-sensitive, sin trailing slash, protocolo correcto)
     - Puedes agregar múltiples URIs (una por línea) para desarrollo y producción

3. **Configurar variables de entorno:**
   - Ver sección [Variables de Entorno](#variables-de-entorno) para `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
   - **GOOGLE_REDIRECT_URI** debe coincidir **exactamente** con una de las URIs configuradas en Google Cloud Console
   - Generar `GOOGLE_ENCRYPTION_KEY` (32 caracteres mínimo):

     ```bash
     openssl rand -base64 32
     ```

4. **Aplicar migraciones de base de datos:**

   ```bash
   pnpm -F @maatwork/db generate
   pnpm -F @maatwork/db migrate
   ```

### Troubleshooting

#### Error 400: redirect_uri_mismatch

Este es el error más común al configurar Google OAuth. Ocurre cuando la URI de redirección no coincide exactamente con la configurada en Google Cloud Console.

**Síntomas:**

- Error al intentar iniciar sesión con Google: "Error 400: redirect_uri_mismatch"
- Mensaje: "No puedes acceder porque esta app envió una solicitud no válida"

**Solución paso a paso:**

1. **Verificar Google Cloud Console:**
   - Ir a <https://console.cloud.google.com/apis/credentials>
   - Seleccionar tu OAuth 2.0 Client ID
   - En "Authorized redirect URIs", verificar que esté configurada exactamente:
     - Desarrollo: `http://localhost:3001/v1/auth/google/callback`
     - Producción: `https://[tu-dominio]/v1/auth/google/callback`
   - **Importante**:
     - Sin trailing slash al final
     - Protocolo correcto (http para dev, https para prod)
     - Path exacto: `/v1/auth/google/callback`
     - Case-sensitive

2. **Verificar variable de entorno:**
   - Abrir `apps/api/.env`
   - Verificar que `GOOGLE_REDIRECT_URI` coincida **exactamente** con una de las URIs en Google Cloud Console
   - Ejemplo desarrollo: `GOOGLE_REDIRECT_URI=http://localhost:3001/v1/auth/google/callback`
   - Ejemplo producción: `GOOGLE_REDIRECT_URI=https://maat.work/v1/auth/google/callback`

3. **Reiniciar servidor:**

   ```bash
   # Después de cambiar variables de entorno, reiniciar el servidor API
   pnpm -F @maatwork/api dev
   ```

4. **Verificar logs:**
   - Al iniciar el servidor, revisar los warnings sobre `GOOGLE_REDIRECT_URI`
   - El sistema valida automáticamente el formato y muestra warnings si hay problemas

**Errores comunes:**

- ❌ `http://localhost:3001/v1/auth/google/callback/` (trailing slash)
- ❌ `https://localhost:3001/v1/auth/google/callback` (https en localhost)
- ❌ `http://localhost:3001/v1/auth/google/callbacks` (path incorrecto)
- ✅ `http://localhost:3001/v1/auth/google/callback` (correcto para desarrollo)
- ✅ `https://maat.work/v1/auth/google/callback` (correcto para producción)

#### Error "Google Calendar not connected"

- Verificar que el usuario haya completado el flujo OAuth2
- Verificar que los tokens no estén expirados (se refrescan automáticamente cada 10 minutos)
- Revisar logs del backend para errores de refresh de tokens

#### Error "Failed to refresh token"

- Verificar que `GOOGLE_ENCRYPTION_KEY` sea el mismo en todos los entornos
- Verificar que el refresh token no haya sido revocado en Google Account
- El usuario puede necesitar re-autenticarse

#### Error "Unsupported state or unable to authenticate data" / "encryption key mismatch"

Este error ocurre cuando los tokens de Google OAuth no pueden ser desencriptados.

**Causa:**

- La clave `GOOGLE_ENCRYPTION_KEY` cambió después de que los tokens fueron guardados
- Los tokens fueron encriptados con una clave diferente (ej: en otro entorno o con una clave anterior)
- La clave actual no coincide con la clave usada para encriptar los tokens existentes

**Síntomas:**

- Error en logs: `Failed to decrypt token: encryption key mismatch`
- Error al intentar acceder a calendario de Google: `Unsupported state or unable to authenticate data`
- El job de refresh de tokens falla continuamente

**Solución:**

1. **Reconectar cuenta de Google (Recomendado):**
   - Ir al perfil de usuario en la aplicación
   - Desconectar la cuenta de Google (usando el botón de desconectar)
   - Volver a conectar la cuenta de Google
   - Esto creará nuevos tokens encriptados con la clave actual

2. **Verificar GOOGLE_ENCRYPTION_KEY:**
   - Asegurar que la clave tenga al menos 32 caracteres
   - Verificar que sea la misma en todos los entornos (dev/prod)
   - **Importante**: No cambiar la clave después de que los tokens ya están guardados
   - Si necesitas cambiar la clave, todos los usuarios deben reconectar su cuenta

3. **Si el problema persiste:**
   - Eliminar manualmente los tokens corruptos de la base de datos:

     ```sql
     DELETE FROM google_oauth_tokens WHERE user_id = 'user-id-here';
     ```

   - O usar el endpoint DELETE `/v1/auth/google/disconnect` para limpiar tokens
   - Luego el usuario debe reconectar su cuenta de Google

**Prevención:**

- Generar una clave única y segura al inicio: `openssl rand -base64 32`
- Guardar la clave de forma segura (no en el código)
- **Nunca cambiar** `GOOGLE_ENCRYPTION_KEY` después de que los tokens están en producción
- Si es absolutamente necesario cambiar la clave, planificar una migración donde todos los usuarios reconecten

#### CSP bloquea recursos de Google

- Si `CSP_ENABLED=true`, verificar que la configuración en `apps/api/src/index.ts` incluya dominios de Google
- Ver sección [Seguridad](#seguridad-y-performance) para más detalles

### Verificación de Dominio para Google OAuth

Para que Google apruebe tu aplicación OAuth y permita que usuarios externos la utilicen, necesitas verificar la propiedad del dominio. Google requiere esto para asegurar que la aplicación es legítima y cumple con sus políticas.

#### Paso 1: Verificar Dominio en Google Search Console

1. **Ir a Google Search Console:**
   - Acceder a <https://search.google.com/search-console>
   - Iniciar sesión con la misma cuenta de Google que usa tu proyecto en Google Cloud Console

2. **Agregar propiedad:**
   - Click en "Agregar propiedad"
   - Ingresar: `https://maat.work` (o tu dominio de producción)
   - Seleccionar método de verificación:
     - **HTML file upload** (Recomendado): Subir archivo HTML a `apps/web/public/`
     - **HTML tag**: Agregar meta tag en `apps/web/app/layout.tsx` dentro del `<head>`
     - **DNS record**: Agregar registro TXT en el DNS del dominio (más complejo pero permanente)

3. **Completar verificación:**
   - Seguir las instrucciones del método elegido
   - Google verificará la propiedad (puede tardar hasta 48 horas)
   - Una vez verificado, aparecerá como "Verificado" en Search Console

#### Paso 2: Verificar Requisitos de la Página Principal

Google requiere que la página principal (`https://maat.work`) incluya:

1. **Enlace visible a política de privacidad:**
   - Debe ser accesible desde la página principal sin necesidad de hacer scroll excesivo
   - El enlace ya está en el footer y en el formulario de contacto
   - URL: `https://maat.work/legal/privacy-policy.html`

2. **Descripción clara del propósito:**
   - La página debe explicar claramente qué hace la aplicación
   - La sección hero ahora incluye: "MaatWork es una plataforma CRM profesional para gestión patrimonial y asesoramiento financiero"

3. **Información de contacto:**
   - Debe incluir forma de contactar al desarrollador/empresa
   - Ya está incluida en la sección de contacto de la landing page

#### Paso 3: Solicitar Verificación en Google Cloud Console

1. **Completar OAuth consent screen:**
   - Ir a Google Cloud Console > APIs & Services > OAuth consent screen
   - Completar todos los campos requeridos:
     - App name: "MaatWork"
     - User support email: Tu email de soporte
     - Developer contact information: Tu email
     - App domain: `maat.work`
     - Home page URL: `https://maat.work`
     - Privacy policy URL: `https://maat.work/legal/privacy-policy.html`
     - Terms of service URL: `https://maat.work/legal/terms-of-service.html` (si existe)

2. **Agregar scopes:**
   - Seleccionar los scopes necesarios (email, profile, calendar)
   - Agregar descripción para cada scope solicitado

3. **Enviar para revisión:**
   - Una vez completado, click en "Submit for verification"
   - Google revisará la aplicación (puede tardar varios días)
   - Pueden solicitar información adicional o videos de demostración

#### Troubleshooting de Verificación

**Error: "The website of your home page URL is not registered to you"**

- Verificar que el dominio esté verificado en Google Search Console
- Asegurar que uses la misma cuenta de Google en Search Console y Cloud Console
- Esperar hasta 48 horas después de verificar el dominio

**Error: "Your home page URL does not include a link to your privacy policy"**

- Verificar que el enlace a `/legal/privacy-policy.html` sea visible
- El enlace debe estar en el HTML de la página principal (no solo en JavaScript)
- Verificar que la URL sea accesible públicamente

**Error: "Your home page does not explain the purpose of your app"**

- Asegurar que la descripción del propósito sea clara y visible
- Debe estar en el contenido HTML principal, no solo en meta tags
- La descripción debe explicar específicamente qué hace la aplicación

---

## Seguridad y Performance

### Seguridad

#### API

- **Helmet**: Middleware de seguridad HTTP habilitado
- **Pino**: Logs estructurados con `redact` en producción (oculta headers sensibles)
- **CORS**: Configurado con orígenes permitidos
- **CSP**: Opcional vía `CSP_ENABLED` (Content Security Policy)
- **Google OAuth**: Tokens encriptados con AES-256-GCM, refresh automático cada 10 minutos

#### Web

- **CSP**: Estricta en producción, ajustada por entorno
- **Cookies httpOnly**: Autenticación usa cookies httpOnly exclusivamente (inmune a XSS)
- **Secure cookies**: Automático cuando hay HTTPS

### Nginx y SSL/TLS

El servidor de producción usa **Nginx como reverse proxy** con **SSL/TLS** configurado para Cloudflare:

**Configuración:**

- Archivo: `infrastructure/mvp/nginx.conf`
- Puerto HTTP (80): Redirige a HTTPS
- Puerto HTTPS (443): SSL con Cloudflare Origin CA Certificate
- Certificados: `/etc/ssl/cloudflare/origin.crt` y `origin.key`
- Protocolos: TLSv1.2, TLSv1.3
- HTTP/2: Habilitado (directiva `http2 on;` separada)

**Aplicar cambios de nginx:**

```bash
# 1. Subir configuración actualizada
scp infrastructure/mvp/nginx.conf ec2-user@SERVER_IP:/home/ec2-user/

# 2. En el servidor
sudo cp /home/ec2-user/nginx.conf /etc/nginx/nginx.conf
sudo nginx -t  # Verificar sintaxis
sudo systemctl reload nginx  # Aplicar cambios
```

**Verificar SSL:**

```bash
# Verificar que escucha en puerto 443
sudo ss -tulpn | grep :443

# Verificar certificados
sudo ls -la /etc/ssl/cloudflare/
```

**Cloudflare SSL Mode:**

- Configurado en Terraform: `Full (Strict)`
- Requiere certificado válido en el servidor
- Cloudflare valida el certificado antes de conectar

**Documentación completa:** Ver [NGINX-SSL-CONFIGURATION.md](./NGINX-SSL-CONFIGURATION.md)

### Performance

#### API

- **ETag**: Activado (`app.set('etag','strong')`)
- **Compression**: Middleware de compresión habilitado
- **Timeouts**: Timeouts en fetch hacia servicio Python (15s normal, 5min backfill)
- **Connection Pool**: Optimizado (20 conexiones máximas, reciclaje automático)

#### Web

- **CSP estricta**: En producción
- **Cache immutable**: `_next/static` cache immutable
- **Server Components**: React Server Components para reducir JavaScript inicial
- **Code Splitting**: Automático con Next.js

### Logging

#### Backend (API)

- **Pino**: Logs estructurados JSON
- **Niveles**: `info`, `warn`, `error` según `LOG_LEVEL`
- **Redacción**: Headers sensibles redactados en producción
- **Ver logs**: `pnpm -F @maatwork/api run dev:pretty`

#### Frontend (Web)

- **Sistema estructurado**: Logging con correlación de requests
- **Request ID**: Correlación con backend mediante `requestId`

---

## Archivos Críticos de Infraestructura

⚠️ **ADVERTENCIA:** Los siguientes archivos son críticos para producción. Si se modifican incorrectamente, pueden romper conectividad, exponer el servidor, o causar downtime.

### Archivos Críticos

1. **`infrastructure/mvp/nginx.conf`**
   - Configuración de Nginx (puertos 80, 443, SSL, upstreams)
   - Modificaciones incorrectas rompen HTTPS y routing

2. **`infrastructure/terraform/**/*.tf`**
   - Configuración de Security Groups, VPC, EC2, RDS, Cloudflare
   - Modificaciones incorrectas pueden exponer/bloquear el servidor

3. **`ecosystem.config.js`**
   - Configuración de PM2 (puertos 3000, 3001, 3002)
   - Modificaciones incorrectas rompen el routing de Nginx

4. **`scripts/deploy.sh`** y `infrastructure/scripts/deploy.sh`
   - Scripts de deploy que aplican configuración
   - Cambios incorrectos se aplican directamente a producción

### Protección

- ✅ **Están en `.cursorignore`** - La IA tendrá más cuidado al sugerir cambios
- ❌ **NO están en `.gitignore`** - Deben versionarse para control de cambios

**Antes de modificar:**

- [ ] Entender el impacto en producción
- [ ] Probar en desarrollo primero
- [ ] Revisar cambios línea por línea
- [ ] Verificar puertos, SSL, Security Groups
- [ ] Tener plan de rollback listo

**Documentación completa:** Ver [CRITICAL-INFRASTRUCTURE-FILES.md](./CRITICAL-INFRASTRUCTURE-FILES.md)

---

## Documentación Relacionada

- [Guía de Base de Datos](./DATABASE.md) - Optimización y configuración de BD
- [Guía de Desarrollo](./DEVELOPMENT.md) - Guía para desarrolladores
- [Guía de Arquitectura](./ARCHITECTURE.md) - Arquitectura del sistema
- [Archivos Críticos de Infraestructura](./CRITICAL-INFRASTRUCTURE-FILES.md) - Archivos críticos que pueden romper producción
