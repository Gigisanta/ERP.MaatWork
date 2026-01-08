# MAATWORK Monorepo

## autopush

ssh abax "cd abax/scripts && bash deploy.sh --skip-tests"

Monorepo con pnpm + Turborepo. Apps: API (Express + Pino + Helmet + CORS + PM2) y Web (Next.js). Paquetes compartidos: `@maatwork/db` (Drizzle + PostgreSQL) y `@maatwork/ui` (Design System + React Components).

## Primera Instalación

Si es la primera vez que clonas el repositorio, ejecuta el script de setup automático:

```bash
# 1. Instalar dependencias
pnpm install

# 2. Ejecutar setup inicial (configura todo automáticamente)
pnpm setup

# 3. Iniciar desarrollo
pnpm dev
```

El script de setup (`pnpm setup`) automáticamente:
- ✅ Verifica prerequisitos (Node.js, pnpm, Docker)
- ✅ Configura variables de entorno (crea `.env` desde `config-example.env`)
- ✅ Inicia servicios Docker (PostgreSQL y N8N)
- ✅ Ejecuta migraciones de base de datos
- ✅ Crea usuario admin inicial (`admin@maatwork.local`)

**Nota:** Si encuentras errores 401 o problemas de autenticación después de clonar:
- Limpia las cookies del navegador para `localhost`
- O usa modo incógnito para evitar tokens viejos

## Inicio Rápido (Después del Setup)

```bash
# Iniciar servicios de desarrollo
pnpm dev
```

**URLs de desarrollo:**
- Web: http://localhost:3000
- API: http://localhost:3001
- Analytics: http://localhost:3002
- N8N: http://localhost:5678

Para información detallada de instalación y configuración, ver [Guía de Desarrollo](./docs/DEVELOPMENT.md#getting-started) o [Guía de Onboarding](./docs/ONBOARDING.md).

## CLI Unificado

MAATWORK incluye un CLI unificado para todas las operaciones de desarrollo:

```bash
pnpm mw <comando> [opciones]
```

### Comandos Principales

```bash
# Desarrollo
pnpm mw dev                    # Iniciar desarrollo
pnpm mw dev --fast             # Sin validaciones (más rápido)
pnpm mw dev --only=api,web     # Solo servicios específicos

# Base de Datos
pnpm mw db migrate             # Ejecutar migraciones
pnpm mw db seed                # Ejecutar seeds
pnpm mw db studio              # Abrir Drizzle Studio

# Testing
pnpm mw test unit              # Tests unitarios
pnpm mw test e2e               # Tests E2E
pnpm mw test coverage          # Con cobertura

# Verificación
pnpm mw health                 # Health check rápido
pnpm mw health --full          # Verificación completa

# Generadores
pnpm mw gen component Button   # Nuevo componente
pnpm mw gen route users/me     # Nueva ruta API
pnpm mw gen api-client users   # Nuevo cliente API

# Auditoría
pnpm mw audit code             # Auditoría de código
pnpm mw metrics                # Métricas del proyecto

# Limpieza
pnpm mw clean cache            # Limpiar caches
pnpm mw clean all              # Limpieza completa
```

Ver [CLI Reference](./docs/CLI.md) para documentación completa.

### Comandos Legacy (aliases)

```bash
pnpm dev              # = pnpm mw dev
pnpm typecheck        # Verificar tipos
pnpm build            # Build completo
pnpm test             # Tests unitarios
```


## Documentación

| Documento | Descripción |
|-----------|-------------|
| [CLI Reference](./docs/CLI.md) | Referencia completa del CLI |
| [Quick Reference](./docs/QUICK-REFERENCE.md) | Cheatsheet de comandos |
| [Contributing](./docs/CONTRIBUTING.md) | Guía de contribución |
| [Development](./docs/DEVELOPMENT.md) | Guía de desarrollo |
| [Architecture](./docs/ARCHITECTURE.md) | Arquitectura del sistema |
| [Testing](./docs/TESTING.md) | Estrategias de testing |

Ver [documentación completa](./docs/README.md) para todas las guías técnicas.

## Características Principales

### Sistema de Etiquetas
Categorización de contactos con etiquetas personalizables.

### N8N - Automatizaciones
Servicio Docker para crear y gestionar automatizaciones de flujos de trabajo. Acceso en http://localhost:5678.

### Design System (@maatwork/ui)
Sistema de diseño moderno y accesible con 40+ componentes reutilizables. Ver [packages/ui/README.md](./packages/ui/README.md).

### Sistema de Logging
- **Backend**: Pino con logs estructurados JSON
- **Frontend**: Sistema estructurado con correlación de requests
- Ver logs: `pnpm -F @maatwork/api run dev:pretty`

Para información de deploy y troubleshooting, ver [Guía de Operaciones](./docs/OPERATIONS.md).

## Repo Hygiene

- ✅ No se comitean artefactos: `dist/`, `node_modules/`, `.next/`, `.turbo/`, `coverage/`
- ✅ Pre-commit ejecuta `lint-staged` y `pnpm guard:artifacts`
- ✅ Drizzle: flujo permitido `generate` → `migrate` (sin `push`)

## Reglas del Proyecto

Las reglas de desarrollo, arquitectura y mejores prácticas están documentadas en [`.cursor/rules/`](./.cursor/rules/).

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
