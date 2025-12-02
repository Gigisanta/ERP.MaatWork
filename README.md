# CACTUS CRM Monorepo

Monorepo con pnpm + Turborepo. Apps: API (Express + Pino + Helmet + CORS + PM2) y Web (Next.js). Paquetes compartidos: `@cactus/db` (Drizzle + PostgreSQL) y `@cactus/ui` (Design System + React Components).

## Inicio Rápido

```bash
# Instalar dependencias
pnpm install

# Iniciar servicios (requiere Docker para PostgreSQL)
docker compose up -d
pnpm dev
```

**URLs de desarrollo:**
- Web: http://localhost:3000
- API: http://localhost:3001
- Analytics: http://localhost:3002
- N8N: http://localhost:5678

Para información detallada de instalación y configuración, ver [Guía de Desarrollo](./docs/DEVELOPMENT.md#getting-started).

## Comandos Esenciales

```bash
pnpm dev              # Desarrollo (todos los servicios)
pnpm typecheck        # Verificar tipos
pnpm build            # Build completo
pnpm test             # Tests unitarios
pnpm test:e2e         # Tests E2E
```

Ver [Guía de Desarrollo](./docs/DEVELOPMENT.md#comandos-útiles) para comandos completos.


## Documentación

Ver [documentación completa](./docs/README.md) para todas las guías técnicas.

## Características Principales

### Sistema de Etiquetas
Categorización de contactos con etiquetas personalizables.

### N8N - Automatizaciones
Servicio Docker para crear y gestionar automatizaciones de flujos de trabajo. Acceso en http://localhost:5678.

### Design System (@cactus/ui)
Sistema de diseño moderno y accesible con 40+ componentes reutilizables. Ver [packages/ui/README.md](./packages/ui/README.md).

### Sistema de Logging
- **Backend**: Pino con logs estructurados JSON
- **Frontend**: Sistema estructurado con correlación de requests
- Ver logs: `pnpm -F @cactus/api run dev:pretty`

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
