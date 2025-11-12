# CACTUS CRM Monorepo

Monorepo con pnpm + Turborepo. Apps: API (Express + Pino + Helmet + CORS + PM2) y Web (Next.js). Paquetes compartidos: `@cactus/db` (Drizzle + PostgreSQL) y `@cactus/ui` (Design System + React Components).

## Estructura del Proyecto

```
CactusDashboard-epic-D/
├── apps/
│   ├── api/                 # API Express + TypeScript
│   │   └── src/
│   │       ├── routes/      # Rutas API organizadas por dominio
│   │       ├── services/   # Lógica de negocio
│   │       ├── utils/      # Utilidades compartidas
│   │       ├── config/      # Configuración centralizada
│   │       └── types/       # Tipos TypeScript
│   ├── web/                 # Frontend Next.js
│   │   └── app/
│   │       ├── [routes]/    # Rutas de Next.js App Router
│   │       ├── components/  # Componentes compartidos
│   │       └── lib/         # Utilidades y hooks
│   └── analytics-service/   # Servicio Python de análisis
├── packages/
│   ├── db/                  # Drizzle ORM + PostgreSQL
│   │   └── src/
│   │       ├── schema.ts    # Definiciones de tablas
│   │       └── migrations/  # Migraciones de base de datos
│   └── ui/                  # Design System + React Components
│       └── src/
│           ├── components/  # Componentes React
│           ├── primitives/  # Building blocks
│           └── styles/      # CSS y tokens
├── data/                    # Archivos de datos de negocio (Excel)
├── Automations/             # Scripts de automatización Chrome
└── docker-compose.yml       # PostgreSQL y N8N (Docker)
```

**Documentación adicional:**
- 📖 [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura detallada y decisiones técnicas
- 📋 [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - Resumen de refactorizaciones y mejoras
- ✅ [TODOS_AUDIT.md](./TODOS_AUDIT.md) - Auditoría de TODOs pendientes

## Requisitos
- Node.js >=22.0.0 <25.0.0 (soporta hasta v24.x.x)
- pnpm 9+
- Python 3.10+ (opcional pero recomendado para analytics-service)
- TMUX (recomendado) - `brew install tmux` en macOS, `sudo apt-get install tmux` en Ubuntu
- (Opcional) Docker para Postgres local

## Instalación
```bash
pnpm install
```

## Comandos Importantes

### Desarrollo
```bash
pnpm dev              # Inicia todos los servicios (API + Web + Analytics)
pnpm dev:basic        # Inicia servicios sin TMUX
```

### Typecheck y Lint
```bash
pnpm typecheck        # Verificar tipos en todos los workspaces
pnpm lint             # Ejecutar lint en todos los workspaces
```

### Build
```bash
pnpm build            # Build completo de todos los workspaces
pnpm -F @cactus/ui build    # Build solo del paquete UI
pnpm -F @cactus/db build    # Build solo del paquete DB
```

### Tests
```bash
pnpm test             # Ejecutar tests en todos los workspaces
pnpm test:coverage    # Tests con cobertura
pnpm test:e2e         # Tests end-to-end con Playwright
```

### Base de Datos
```bash
pnpm -F @cactus/db generate    # Generar migración desde schema
pnpm -F @cactus/db migrate     # Aplicar migraciones
pnpm -F @cactus/db seed:all    # Seed completo de la base de datos
```

**⚠️ Importante:** Nunca usar `drizzle-kit push` en producción (es destructivo)

## Desarrollo

### Prerrequisitos
- Node.js >=22.0.0 <25.0.0 (soporta hasta v24.x.x)
- pnpm 9+
- Python 3.10+ (opcional pero recomendado para analytics-service)
- TMUX (recomendado para mejor experiencia de desarrollo)
- Docker (opcional, para PostgreSQL local)

### Configuración Inicial
- Base de datos y N8N (Docker):
```bash
docker compose up -d
```
Esto inicia:
- PostgreSQL en puerto 5433
- N8N en puerto 5678 (sin autenticación, automatizaciones compartidas por teams)

- Variables de entorno API: copia `apps/api/.env.example` a `apps/api/.env` y ajusta.

- Instalar dependencias Python (opcional pero recomendado):
```bash
pnpm -F @cactus/analytics-service install
```
Esto instala las dependencias necesarias para el servicio de analytics (FastAPI, uvicorn, yfinance, etc.).

### Ejecutar Aplicaciones

#### Opción 1: Comando Unificado con TMUX (Recomendado)
```bash
pnpm dev
```

Este comando inicia todos los servicios en una sesión TMUX con 4 paneles:
- **Panel 1**: API (puerto 3001)
- **Panel 2**: Web App (puerto 3000)
- **Panel 3**: Analytics Service (puerto 3002)
- **Panel 4**: DB Logs (PostgreSQL)

**Ventajas:**
- Logs visibles simultáneamente en todos los servicios
- Fácil detección de errores
- Sesión persistente (puedes desacoplarte sin detener servicios)
- Scrollback individual por panel

**Comandos TMUX útiles:**
```bash
# Conectar a sesión existente
tmux attach -t cactus-dev

# Detach de la sesión (Ctrl+b d)
# Cambiar entre paneles (Ctrl+b →, ←, ↑, ↓ o Ctrl+b o)
# Cerrar panel actual (Ctrl+b x)
# Maximizar panel (Ctrl+b z)
# Salir de la sesión completamente
pnpm run dev:kill
```

#### Opción 2: Comandos Separados (Sin TMUX)
```bash
pnpm run dev:basic
```

O manualmente:
```bash
# Terminal 1 - API
cd apps/api && pnpm dev

# Terminal 2 - Web App  
cd apps/web && pnpm dev

# Terminal 3 - Analytics (opcional)
cd apps/analytics-service && python main.py
```

### URLs de Acceso
- **Aplicación Web**: http://localhost:3000
- **API Health Check**: http://localhost:3001/health
- **Analytics Service**: http://localhost:3002
- **Analytics Health**: http://localhost:3002/health
- **N8N (Automatizaciones)**: http://localhost:5678

### Logs

Al usar `pnpm dev` (TMUX), los logs de cada servicio aparecen en su propio panel:

- **Panel 1 (API)**: Logs estructurados JSON con Pino
- **Panel 2 (Web)**: Logs de Next.js (build, requests)
- **Panel 3 (Analytics)**: Logs de FastAPI/Uvicorn
- **Panel 4 (DB)**: Logs de PostgreSQL en tiempo real

**TMUX - Ver logs de un servicio específico:**
```bash
# Ver el panel de la API
Ctrl+b o  # Navega hasta el panel de API
# O usar teclas de dirección: Ctrl+b → para ir al siguiente panel
```

**TMUX - Scroll en logs:**
```bash
Ctrl+b [  # Entrar en modo scroll
# Usa ↑↓ para navegar, q para salir
```

Logs legibles en API (desarrollo):
```bash
pnpm -F @cactus/api run dev:pretty
```

### Solución de Problemas

#### TMUX no está instalado:
```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux

# Arch Linux
sudo pacman -S tmux
```

#### Detener sesión TMUX si quedó colgada:
```bash
pnpm run dev:kill
# o manualmente:
tmux kill-session -t cactus-dev
```

#### Reconectar a sesión TMUX existente:
```bash
tmux attach -t cactus-dev
```

#### Si `pnpm dev` (TMUX) se queda en loop:
```bash
# Detener sesión TMUX
pnpm run dev:kill

# Limpiar procesos
pkill -f "turbo" && pkill -f "tsx" && pkill -f "next"
pkill -f "uvicorn"

# Reiniciar
pnpm dev
```

#### Si hay errores de base de datos:
```bash
# Verificar que PostgreSQL esté corriendo
docker ps | grep postgres

# Si no está corriendo, iniciar PostgreSQL
docker compose up -d
# o localmente:
brew services start postgresql
```

#### Si hay errores de dependencias:
```bash
pnpm install
```

#### Servicio Analytics (Python) no inicia:

El servicio Python analytics-service es opcional pero recomendado. Proporciona búsqueda avanzada de instrumentos y cálculos de performance. Si no está disponible, el API usará fallback a base de datos.

**Verificar Python:**
```bash
# Verificar que Python 3.10+ está instalado
python3 --version
# o en Windows:
python --version
```

**Instalar dependencias Python:**
```bash
# Opción 1: Usar script pnpm (recomendado)
pnpm -F @cactus/analytics-service install

# Opción 2: Manualmente
cd apps/analytics-service
pip install -r requirements.txt
# o en Windows:
python -m pip install -r requirements.txt
```

**Iniciar servicio manualmente:**
```bash
# Opción 1: Usar script pnpm (recomendado)
pnpm -F @cactus/analytics-service dev

# Opción 2: Directamente con Python
cd apps/analytics-service
python main.py
```

**Verificar que el servicio está corriendo:**
```bash
# Health check
curl http://localhost:3002/health

# Debería retornar:
# {"status":"healthy","service":"analytics-service",...}
```

**Troubleshooting:**

1. **Error "Python no está instalado":**
   - Instala Python 3.10+ desde https://www.python.org/downloads/
   - Asegúrate de agregar Python al PATH durante la instalación
   - En Windows, verifica que `python` o `py` estén disponibles en la terminal

2. **Error "pip no está disponible":**
   - Python 3.10+ incluye pip por defecto
   - Si falta, instala pip: https://pip.pypa.io/en/stable/installation/
   - En Windows, usa: `python -m ensurepip --upgrade`

3. **Error "ECONNREFUSED" en logs del API:**
   - El servicio Python no está corriendo
   - Inicia el servicio con: `pnpm -F @cactus/analytics-service dev`
   - O verifica que esté corriendo en `http://localhost:3002`
   - El API continuará funcionando con fallback a base de datos

4. **Error al instalar dependencias Python:**
   - Verifica que tienes permisos de escritura
   - En Linux/macOS, puede necesitar `sudo` o usar virtualenv
   - Considera usar un entorno virtual Python:
     ```bash
     python3 -m venv venv
     source venv/bin/activate  # Linux/macOS
     # o en Windows:
     venv\Scripts\activate
     pip install -r requirements.txt
     ```

5. **Puerto 3002 ya en uso:**
   - Otro proceso está usando el puerto 3002
   - Encuentra y termina el proceso:
     ```bash
     # Linux/macOS
     lsof -ti:3002 | xargs kill
     # Windows
     netstat -ano | findstr :3002
     taskkill /PID <PID> /F
     ```
   - O cambia el puerto en `apps/analytics-service/main.py` y `PYTHON_SERVICE_URL` en `apps/api/.env`

## API (Express)
- Entrypoint: `apps/api/src/index.ts`
- Rutas: `apps/api/src/routes/*`
- Seguridad:
  - Helmet activado; `CSP_ENABLED=true` para habilitar CSP por defecto.
  - CORS: en dev permite todo; en prod permite orígenes en `CORS_ORIGINS`.
- Variables (`apps/api/.env`):
  - `NODE_ENV` (development|production)
  - `PORT` (por defecto 3001)
  - `LOG_LEVEL` (info|debug|...)
  - `DATABASE_URL` (postgres)
  - `CORS_ORIGINS` (separado por comas, usado en producción)
  - `CSP_ENABLED` (true/false)
  - `PYTHON_SERVICE_URL` (opcional, por defecto `http://localhost:3002` - URL del servicio Python analytics)
  - `PYTHON_SERVICE_TIMEOUT` (opcional, por defecto `30000` - timeout en ms para requests al servicio Python)

## Sistema de Logging Avanzado

### Backend (API)
- **Logger**: Pino con logs estructurados JSON
- **Correlación**: Cada request tiene `X-Request-ID` único
- **Contexto**: Incluye `userId`, `userRole`, `teamId` automáticamente
- **Métricas**: Duración de operaciones y queries DB
- **Sanitización**: Headers sensibles redactados automáticamente

### Frontend (Web)
- **Logger**: Sistema estructurado con niveles (debug/info/warn/error)
- **Correlación**: `X-Request-ID` en todos los fetch calls
- **Error Boundary**: Captura errores de React automáticamente
- **Centralización**: Logs enviados a `/logs/client` en producción

### Comandos de Logging
```bash
# Ver logs en desarrollo (formato legible)
pnpm -F @cactus/api run dev:pretty

# Ver logs en producción
pm2 logs cactus-api

# Configurar rotación de logs
pnpm -F @cactus/api run pm2:logrotate:install
pnpm -F @cactus/api run pm2:logrotate:config
```

### Integración con Servicios Externos
Para producción, configurar variables de entorno:
- `LOGZIO_API_KEY` - Para Logz.io (ELK as-a-service)
- `SENTRY_DSN` - Para Sentry (errores frontend/backend)
- `BETTER_STACK_TOKEN` - Para Better Stack (logs centralizados)

## Paquetes Compartidos

### DB (Drizzle)
- Config: `packages/db/drizzle.config.ts`
- Schema: `packages/db/src/schema.ts`
- Cliente: `packages/db/src/index.ts` (exporta `db` y esquemas)

### UI (Design System)
- Componentes: `packages/ui/src/components/`
- Primitivos: `packages/ui/src/primitives/`
- Tokens: `packages/ui/src/tokens/`
- Storybook: `packages/ui/.storybook/`
- Tests: `packages/ui/tests/`

## Web (Next.js)
- App router en `apps/web/app/*`
- `NEXT_PUBLIC_API_URL` para apuntar a la API

## Deploy en VPS con PM2
1) Build de la API
```bash
pnpm -F @cactus/api build
```
2) Iniciar con PM2
```bash
pm2 start apps/api/ecosystem.config.js --env production
```
3) pm2-logrotate (recomendado)
```bash
pnpm -F @cactus/api run pm2:logrotate:install
pnpm -F @cactus/api run pm2:logrotate:config
```
   - También está configurado en `ecosystem.config.js` dentro de `deploy.production.post_deploy`.
4) Logs
```bash
pm2 logs cactus-api
# o archivos en apps/api/logs/
```
5) Variables en el servidor
- Crear `.env` en `apps/api` con: `DATABASE_URL`, `PORT`, `LOG_LEVEL`, `CORS_ORIGINS`, `CSP_ENABLED`.

## Reglas operativas (resumen)
- Desarrollo: usar `pino-pretty` (activado automáticamente cuando `NODE_ENV !== 'production'`).
- Producción: ejecutar con PM2 en cluster; habilitar logrotate con `pm2-logrotate`.
- CORS estricto en producción mediante `CORS_ORIGINS`.
- CSP opcional con `CSP_ENABLED=true` si defines una política adecuada.

## Sistema de Etiquetas

El sistema de etiquetas permite categorizar contactos con etiquetas personalizables y editables inline.

### Características
- **Creación automática**: Las etiquetas se crean automáticamente al escribir nombres nuevos
- **Autocompletado**: Búsqueda en tiempo real con debounce de 250ms
- **Edición inline**: Click en la celda de etiquetas para editar
- **Case-insensitive**: Los nombres de etiquetas son únicos sin importar mayúsculas/minúsculas
- **Fallback sin JS**: Formulario de texto separado por comas cuando JavaScript está deshabilitado
- **Límites**: Máximo 3 etiquetas visibles + contador "+N" para el resto

### Endpoints API

#### `GET /api/tags`
Lista etiquetas con autocompletado.
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/tags?scope=contact&q=vi&limit=10"
```

#### `POST /api/tags`
Crea nueva etiqueta (idempotente).
```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scope":"contact","name":"VIP","color":"#ff0000"}' \
  "http://localhost:3001/api/tags"
```

#### `GET /api/tags/contacts/:id`
Lista etiquetas de un contacto.
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/tags/contacts/CONTACT_ID"
```

#### `PUT /api/tags/contacts/:id`
Actualiza etiquetas de un contacto.
```bash
curl -X PUT -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"add":["TAG_ID","Nueva Etiqueta"],"remove":["TAG_ID_TO_REMOVE"]}' \
  "http://localhost:3001/api/tags/contacts/CONTACT_ID"
```

### Validaciones
- **Nombre**: 1-40 caracteres, alfanumérico + espacios
- **Único**: Case-insensitive por scope
- **Rate limiting**: 10 requests/minuto para creación
- **Seguridad**: CSRF habilitado en PUT/POST/DELETE

### Estructura de Base de Datos
```sql
-- Tabla principal de etiquetas
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL, -- 'contact', 'meeting', 'note'
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  icon TEXT,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relación N:M contactos-etiquetas
CREATE TABLE contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Archivos del Sistema
- **Backend**: `apps/api/src/routes/tags.ts`
- **Frontend**: `apps/web/app/contacts/page.tsx`
- **Tests**: `apps/api/src/__tests__/tags.spec.ts`, `contacts-tags.e2e.test.ts`

### Uso en Frontend
```html
<!-- Contenedor para editor de etiquetas -->
<div class="tag-selector" 
     data-contact-id="CONTACT_ID" 
     data-api-url="/api">
  <!-- Fallback sin JS -->
  <noscript>
    <form class="tag-fallback" data-contact-id="CONTACT_ID">
      <input type="text" class="tag-fallback-input" 
             placeholder="Etiquetas separadas por comas" />
      <button type="submit" class="tag-fallback-btn">Guardar</button>
    </form>
  </noscript>
</div>
```

### Comandos de Prueba
```bash
# Tests unitarios
pnpm -F @cactus/api test tags.spec.ts

# Tests e2e
pnpm -F @cactus/api test contacts-tags.e2e.test.ts

# Generar migraciones
cd packages/db && npx drizzle-kit generate
```

## N8N - Automatizaciones

N8N está integrado como servicio Docker para crear y gestionar automatizaciones de flujos de trabajo.

### Características
- **Sin autenticación básica**: Las automatizaciones y usuarios son compartidas por la funcionalidad de `/teams`
- **Acceso directo**: Botón "N8N" disponible en la página de contactos (`/contacts`)
- **Persistencia**: Los datos de N8N se guardan en un volumen Docker (`n8n_data`)
- **CORS configurado**: Permite conexiones desde `http://localhost:3000`
- **Optimizado para recursos**: Configuración optimizada para reducir consumo de CPU y memoria

### Acceso
- **URL**: http://localhost:5678
- **Desde la aplicación**: Click en el botón "N8N" en la página de contactos
- **Directo**: Abrir `http://localhost:5678` en el navegador

### Configuración Docker
N8N se inicia automáticamente con `docker compose up -d`. La configuración optimizada está en `docker-compose.yml`:

**Versión:**
- Imagen: `n8nio/n8n:latest` (siempre actualizada a la última versión estable)
- Para actualizar: `docker compose pull n8n && docker compose up -d n8n`
- Para producción, considerar usar un tag específico (ej: `n8nio/n8n:1.x.x`)

**Límites de recursos:**
- CPU: Máximo 0.75 cores, reserva 0.25 cores
- Memoria: Máximo 768MB, reserva 256MB

**Variables de entorno optimizadas (reducción de recursos):**
- `N8N_DISABLE_PRODUCTION_MAIN_PROCESS=true` - Deshabilita proceso principal innecesario
- `N8N_METRICS=false` - Deshabilita métricas para reducir overhead
- `N8N_LOG_LEVEL=warn` - Reduce logging para menor consumo
- `N8N_EXECUTIONS_DATA_PRUNE=true` - Limpia ejecuciones antiguas automáticamente
- `N8N_EXECUTIONS_DATA_MAX_AGE=168` - Retiene ejecuciones por 7 días
- `N8N_EXECUTIONS_DATA_PRUNE_MAX_COUNT=100` - Máximo 100 ejecuciones retenidas
- `N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN=true` - Evita overhead en shutdown
- `N8N_PUSH_BACKEND=websocket` - Usa WebSocket en lugar de polling (más eficiente)
- `N8N_DIAGNOSTICS_ENABLED=false` - Deshabilita diagnósticos innecesarios
- `N8N_WORKFLOW_CALLBACK_POLLING=false` - Deshabilita polling innecesario

**Otras configuraciones:**
- Puerto: `5678`
- Sin autenticación básica (`N8N_BASIC_AUTH_ACTIVE=false`)
- CORS habilitado para `http://localhost:3000`
- Volumen persistente: `n8n_data:/home/node/.n8n`
- Healthcheck optimizado: Intervalo de 60s, timeout 10s, 3 reintentos

### Optimizaciones de Integración

**Backend (`apps/api`):**
- **Batching automático**: Los contactos se dividen en lotes de 100 (configurable vía `N8N_WEBHOOK_BATCH_SIZE`)
- **Rate limiting**: Máximo 10 requests por minuto por usuario (configurable vía `N8N_WEBHOOK_RATE_LIMIT`)
- **Cliente HTTP optimizado**: Reutiliza conexiones con keepalive y pooling
- **Retry con exponential backoff**: Reintentos automáticos con delays incrementales
- **Timeout configurable**: 30 segundos por defecto (configurable vía `N8N_WEBHOOK_TIMEOUT`)

**Frontend (`apps/web`):**
- **Validación de payload**: Valida tamaño antes de enviar
- **Logging optimizado**: Reduce logging excesivo
- **Manejo de errores mejorado**: Mensajes más claros y manejo de rate limits

### Variables de Entorno

**Frontend (`apps/web`):**
```bash
NEXT_PUBLIC_N8N_URL=http://localhost:5678  # URL de N8N (opcional, default: http://localhost:5678)
```

**Backend (`apps/api`):**
```bash
# Habilitar/deshabilitar N8N completamente
N8N_ENABLED=true  # default: true

# Tamaño de batch para webhooks
N8N_WEBHOOK_BATCH_SIZE=100  # default: 100 contactos por batch

# Rate limit (requests por minuto por usuario)
N8N_WEBHOOK_RATE_LIMIT=10  # default: 10 requests/min

# Timeout para requests de webhook (ms)
N8N_WEBHOOK_TIMEOUT=30000  # default: 30000ms (30s)
```

### Limpieza de Puertos
El puerto 5678 se limpia automáticamente con los scripts de desarrollo:
```bash
pnpm run dev:kill  # Limpia puertos incluyendo 5678
```

### Actualización de N8N

Para actualizar n8n a la última versión:

```bash
# Descargar la última imagen
docker compose pull n8n

# Reiniciar el contenedor con la nueva versión
docker compose down n8n
docker compose up -d n8n

# Verificar que está corriendo
docker compose ps n8n
```

**Nota:** Los datos y workflows se preservan automáticamente gracias al volumen persistente `n8n_data`.

**Verificar que n8n funciona después de la actualización:**
```bash
# Verificar health check de n8n
node scripts/dev-health-check.js --n8n

# O verificar manualmente
curl http://localhost:5678/healthz
```

### Uso
1. Iniciar servicios Docker: `docker compose up -d`
2. Acceder a N8N desde la aplicación web (botón en `/contacts`) o directamente en `http://localhost:5678`
3. Crear workflows y automatizaciones según necesidades del equipo
4. Las automatizaciones son compartidas por todos los usuarios del equipo (gestión vía `/teams`)

### Impacto de Optimizaciones

**Reducción de recursos:**
- **Memoria**: ~40-60% de reducción (de ~800MB a ~300-500MB)
- **CPU**: ~50-70% de reducción cuando idle
- **Red**: Batching reduce overhead de red en ~30-40%
- **Shutdown**: Reducción de overhead con `N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN`
- **Comunicación**: WebSocket más eficiente que polling con `N8N_PUSH_BACKEND=websocket`

**Mejoras de rendimiento:**
- Conexiones HTTP reutilizadas (keepalive)
- Menor latencia en requests repetidos
- Mayor estabilidad con rate limiting
- Mejor manejo de errores con retry automático
- Comunicación en tiempo real más eficiente con WebSocket
- Menor overhead de diagnósticos y polling innecesario

## Datos de Negocio

Los archivos de datos de negocio se encuentran en la carpeta `/data/`:
- **Balanz Cactus 2025 - AUM Balanz.xlsx**: Archivo madre con datos de AUM por cuenta/cliente
- **reporteClusterCuentasV2.xlsx**: Reporte mensual de cluster de cuentas  
- **Comisiones (2).xlsx**: Datos de comisiones por operaciones

Ver `/data/README.md` para más detalles sobre cada archivo.

## Scripts útiles
- `pnpm dev`: inicia API, Web, Analytics y DB logs en TMUX (recomendado).
- `pnpm run dev:basic`: inicia servicios sin TMUX (alternativa).
- `pnpm run dev:kill`: detiene la sesión TMUX `cactus-dev`.
- `pnpm -F @cactus/api build`: compila la API.
- `pnpm -F @cactus/ui build`: compila el design system.
- `pnpm -F @cactus/ui storybook`: inicia Storybook para documentación de componentes.
- `pnpm -F @cactus/api run dev:pretty`: logs legibles en dev.
- `pnpm -F @cactus/api run pm2:logrotate:install` y `pnpm -F @cactus/api run pm2:logrotate:config`: configurar rotación de logs.

## Repo hygiene
- No se comitean artefactos: `dist/`, `node_modules/`, `.next/`, `.turbo/`, `coverage/`, logs.
- `apps/api/uploads/` mantiene `.gitkeep`; contenidos ignorados.
- Pre-commit: se ejecuta `lint-staged` y `pnpm guard:artifacts` para bloquear artefactos.
- Drizzle: flujo permitido `generate` → `migrate` (sin `push`).

## Design System (@cactus/ui)

Sistema de diseño moderno y accesible construido con React, Tailwind CSS y Radix Primitives.

### Características
- **Accesibilidad**: WCAG 2.2 AA, soporte completo para lectores de pantalla
- **Theming**: Modo claro/oscuro con tokens CSS personalizables
- **Componentes**: 40+ componentes reutilizables (Button, Input, Modal, DataTable, etc.)
- **Documentación**: Storybook con ejemplos interactivos y pruebas de accesibilidad
- **Testing**: Jest + React Testing Library + jest-axe para validación automática

### Componentes Principales
- **Primitivos**: Box, Stack, Grid, Text, Heading, Icon
- **Inputs**: Button, Input, Select, Checkbox, Switch
- **Navegación**: Header, Sidebar, Breadcrumbs, Tabs, Pagination
- **Feedback**: Modal, Toast, Tooltip, Alert, Spinner, Card
- **Datos**: DataTable, EmptyState, DropdownMenu

### Uso
```tsx
import { Button, Card, Input, useTheme } from '@cactus/ui';

function MyComponent() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Card>
      <Input placeholder="Escribe algo..." />
      <Button onClick={() => setTheme('dark')}>
        Cambiar tema
      </Button>
    </Card>
  );
}
```
