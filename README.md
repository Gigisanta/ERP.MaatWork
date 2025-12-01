# CACTUS CRM Monorepo

Monorepo con pnpm + Turborepo. Apps: API (Express + Pino + Helmet + CORS + PM2) y Web (Next.js). Paquetes compartidos: `@cactus/db` (Drizzle + PostgreSQL) y `@cactus/ui` (Design System + React Components).

## Inicio Rápido

### Requisitos
- Node.js >=22.0.0 <25.0.0
- pnpm 9+
- Python 3.10+ (opcional, para analytics-service)
- TMUX (recomendado)
- Docker (opcional, para PostgreSQL local)

### Instalación
```bash
pnpm install
```

### Configuración Inicial
```bash
# 1. Iniciar PostgreSQL y N8N (Docker)
docker compose up -d

# 2. Configurar variables de entorno
cp apps/api/config-example.env apps/api/.env
# Editar apps/api/.env con tus valores

# 3. Instalar dependencias Python (opcional)
pnpm -F @cactus/analytics-service install
```

### Desarrollo
```bash
# Opción 1: Con TMUX (recomendado - 4 paneles)
pnpm dev

# Opción 2: Sin TMUX
pnpm dev:basic
```

**URLs:**
- Web: http://localhost:3000
- API: http://localhost:3001
- Analytics: http://localhost:3002 (configurable vía `ANALYTICS_PORT`)
- N8N: http://localhost:5678

## Comandos Esenciales

### Desarrollo
```bash
pnpm dev              # Inicia todos los servicios (TMUX)
pnpm dev:basic        # Inicia servicios sin TMUX
pnpm dev:kill         # Detiene sesión TMUX
```

### Typecheck y Lint
```bash
pnpm typecheck        # Verificar tipos en todos los workspaces
pnpm lint             # Ejecutar lint
```

### Build
```bash
pnpm build            # Build completo
pnpm -F @cactus/ui build    # Build solo UI
pnpm -F @cactus/db build    # Build solo DB
```

### Tests
```bash
pnpm test             # Unit tests
pnpm test:coverage    # Con cobertura
pnpm test:e2e         # E2E tests (Playwright)
```

### Base de Datos
```bash
pnpm -F @cactus/db generate    # Generar migración
pnpm -F @cactus/db migrate     # Aplicar migraciones
pnpm -F @cactus/db seed:all    # Seed completo
```

**⚠️ Importante:** Nunca usar `drizzle-kit push` en producción (es destructivo)

## Estructura del Proyecto

```
CactusDashboard-epic-D/
├── apps/
│   ├── api/                 # API Express + TypeScript
│   ├── web/                 # Frontend Next.js App Router
│   └── analytics-service/   # Servicio Python de análisis
├── packages/
│   ├── db/                  # Drizzle ORM + PostgreSQL
│   └── ui/                  # Design System + React Components
├── data/                    # Archivos de datos de negocio
├── docs/                     # Documentación técnica
└── docker-compose.yml       # PostgreSQL y N8N
```

## Documentación

### Guías Principales
- 📖 [Arquitectura](./docs/ARCHITECTURE.md) - Arquitectura detallada y decisiones técnicas
- 🗄️ [Guía de Base de Datos](./docs/DATABASE.md) - Optimización, configuración, particionamiento, caché y mejores prácticas
- 💻 [Guía de Desarrollo](./docs/DEVELOPMENT.md) - Getting Started, Code Standards y Debugging
- 🧪 [Guía de Testing](./docs/TESTING.md) - Estrategias y herramientas de testing
- 🚀 [Guía de Operaciones](./docs/OPERATIONS.md) - Deploy, monitoreo, troubleshooting y performance
- 🧩 [Guías de Módulos](./docs/MODULES.md) - Guías específicas por módulo

### Documentación Histórica
- 📚 [Índice Completo](./docs/README.md) - Índice completo de documentación
- 📦 [Historial de Optimizaciones](./docs/archive/OPTIMIZATION_HISTORY.md) - Historial de optimizaciones
- ✅ [Historial de Testing](./docs/archive/TESTING_HISTORY.md) - Historial de implementación de tests

## Características Principales

### Sistema de Etiquetas
Categorización de contactos con etiquetas personalizables. Ver [documentación completa](./docs/MODULES.md#sistema-de-etiquetas).

### N8N - Automatizaciones
Servicio Docker para crear y gestionar automatizaciones de flujos de trabajo. Acceso en http://localhost:5678.

### Design System (@cactus/ui)
Sistema de diseño moderno y accesible con 40+ componentes reutilizables. Ver [packages/ui/README.md](./packages/ui/README.md).

### Sistema de Logging
- **Backend**: Pino con logs estructurados JSON
- **Frontend**: Sistema estructurado con correlación de requests
- Ver logs: `pnpm -F @cactus/api run dev:pretty`

## Deploy en Producción

### Build y PM2
```bash
# 1. Build de la API
pnpm -F @cactus/api build

# 2. Iniciar con PM2
pm2 start apps/api/ecosystem.config.js --env production

# 3. Configurar rotación de logs
pnpm -F @cactus/api run pm2:logrotate:install
pnpm -F @cactus/api run pm2:logrotate:config
```

### Variables de Entorno Requeridas
Crear `.env` en `apps/api` con:
- `DATABASE_URL` - URL de PostgreSQL
- `PORT` - Puerto del servidor (default: 3001)
- `LOG_LEVEL` - Nivel de logging
- `CORS_ORIGINS` - Orígenes permitidos (producción)
- `JWT_SECRET` - Secret para JWT tokens
- `CSP_ENABLED` - Habilitar CSP (opcional)

## Solución de Problemas

### TMUX no está instalado
```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux
```

### Detener sesión TMUX
```bash
pnpm run dev:kill
# o manualmente:
tmux kill-session -t cactus-dev
```

### Errores de base de datos
```bash
# Verificar que PostgreSQL esté corriendo
docker ps | grep postgres

# Si no está corriendo
docker compose up -d
```

### Servicio Analytics (Python) no inicia
El servicio es opcional. Si no está disponible, el API usará fallback a base de datos.

```bash
# Verificar Python
python3 --version

# Instalar dependencias
pnpm -F @cactus/analytics-service install

# Iniciar servicio
pnpm -F @cactus/analytics-service dev
```

Para más detalles, ver [Guía de Desarrollo](./docs/DEVELOPMENT.md#guía-de-debugging) y [Guía de Operaciones](./docs/OPERATIONS.md#troubleshooting).

## Repo Hygiene

- ✅ No se comitean artefactos: `dist/`, `node_modules/`, `.next/`, `.turbo/`, `coverage/`
- ✅ Pre-commit ejecuta `lint-staged` y `pnpm guard:artifacts`
- ✅ Drizzle: flujo permitido `generate` → `migrate` (sin `push`)

## Reglas del Proyecto

Las reglas de desarrollo, arquitectura y mejores prácticas están documentadas en [`.cursorrules`](./.cursorrules).

**Principios clave:**
- TypeScript estricto (`exactOptionalPropertyTypes: true`)
- NUNCA usar `any` sin justificación
- NUNCA usar `fetch` directamente (usar cliente centralizado)
- Validar SIEMPRE en backend con Zod
- Tests co-ubicados con código
- Documentar decisiones no obvias

## Referencias Rápidas

- **Tipos:** `apps/web/types/[domain].ts`
- **Cliente API:** `apps/web/lib/api/[domain].ts`
- **Validaciones:** `apps/api/src/routes/*.ts` (sección `// Zod Validation Schemas`)
- **UI Components:** `packages/ui/src/components/*`
- **Schema DB:** `packages/db/src/schema.ts`

---

Para más información, consulta la [documentación completa](./docs/README.md).
