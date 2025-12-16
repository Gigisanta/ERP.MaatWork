# Guía de Operaciones

Esta guía consolida toda la información sobre deploy, configuración, monitoreo y troubleshooting del proyecto CACTUS CRM.

## Índice

1. [Requisitos y Setup](#requisitos-y-setup)
2. [Configuración](#configuración)
3. [Desarrollo Local](#desarrollo-local)
4. [Base de Datos](#base-de-datos)
5. [Deploy en Producción](#deploy-en-producción)
6. [Monitoreo y Métricas](#monitoreo-y-métricas)
7. [Troubleshooting](#troubleshooting)
8. [Seguridad y Performance](#seguridad-y-performance)

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

# 2. Iniciar PostgreSQL y N8N (Docker)
docker compose up -d

# 3. Configurar variables de entorno
cp apps/api/config-example.env apps/api/.env
# Editar apps/api/.env con tus valores

# 4. Instalar dependencias Python (opcional)
pnpm -F @cactus/analytics-service install
```

---

## Configuración

### Variables de Entorno

#### API (`apps/api/.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/cactus
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
- Web: http://localhost:3000
- API: http://localhost:3001
- Analytics: http://localhost:3002 (ajusta `ANALYTICS_PORT` si el puerto está ocupado)
- N8N: http://localhost:5678

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
pnpm -F @cactus/db run generate

# Aplicar migraciones (usa baseline en migrations_squashed)
pnpm -F @cactus/db run migrate

# Seeds esenciales (opcional; la API también los ejecuta en startup)
pnpm -F @cactus/db run db:init
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

## Deploy en Producción

### Build y Deploy de API

```bash
# 1. Build de la API
pnpm -F @cactus/api build

# 2. Iniciar con PM2
pm2 start apps/api/ecosystem.config.js --env production

# 3. Ver logs
pm2 logs cactus-api

# 4. Ver estado
pm2 status

# 5. Reiniciar
pm2 restart cactus-api

# 6. Detener
pm2 stop cactus-api
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
pnpm -F @cactus/web build

# Iniciar servidor de producción
pnpm -F @cactus/web start

# O usar PM2
pm2 start "pnpm -F @cactus/web start" --name cactus-web
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
   pnpm -F @cactus/analytics-service install
   ```
4. Iniciar servicio:
   ```bash
   pnpm -F @cactus/analytics-service dev
   ```

---

## Google OAuth2 y Calendar Integration

### Configuración Inicial

1. **Crear proyecto en Google Cloud Console:**
   - Ir a https://console.cloud.google.com/
   - Crear nuevo proyecto o seleccionar existente
   - Habilitar Google Calendar API

2. **Crear credenciales OAuth2:**
   - Ir a "APIs & Services" > "Credentials"
   - Crear "OAuth 2.0 Client ID"
   - Tipo: "Web application"
   - Authorized redirect URIs: `http://localhost:3001/v1/auth/google/callback` (dev) y tu URL de producción

3. **Configurar variables de entorno:**
   - Ver sección [Variables de Entorno](#variables-de-entorno) para `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
   - Generar `GOOGLE_ENCRYPTION_KEY` (32 caracteres mínimo):
     ```bash
     openssl rand -base64 32
     ```

4. **Aplicar migraciones de base de datos:**
   ```bash
   pnpm -F @cactus/db generate
   pnpm -F @cactus/db migrate
   ```

### Troubleshooting

#### Error "Google Calendar not connected"
- Verificar que el usuario haya completado el flujo OAuth2
- Verificar que los tokens no estén expirados (se refrescan automáticamente cada 10 minutos)
- Revisar logs del backend para errores de refresh de tokens

#### Error "Failed to refresh token"
- Verificar que `GOOGLE_ENCRYPTION_KEY` sea el mismo en todos los entornos
- Verificar que el refresh token no haya sido revocado en Google Account
- El usuario puede necesitar re-autenticarse

#### CSP bloquea recursos de Google
- Si `CSP_ENABLED=true`, verificar que la configuración en `apps/api/src/index.ts` incluya dominios de Google
- Ver sección [Seguridad](#seguridad-y-performance) para más detalles

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
- **Ver logs**: `pnpm -F @cactus/api run dev:pretty`

#### Frontend (Web)

- **Sistema estructurado**: Logging con correlación de requests
- **Request ID**: Correlación con backend mediante `requestId`

---

## Documentación Relacionada

- [Guía de Base de Datos](./DATABASE.md) - Optimización y configuración de BD
- [Guía de Desarrollo](./DEVELOPMENT.md) - Guía para desarrolladores
- [Guía de Arquitectura](./ARCHITECTURE.md) - Arquitectura del sistema

