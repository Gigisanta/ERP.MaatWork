# MAATWORK Monorepo

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

## Comandos Esenciales

```bash
pnpm dev              # Desarrollo (todos los servicios)
pnpm typecheck        # Verificar tipos
pnpm build            # Build completo
pnpm test             # Tests unitarios
pnpm test:e2e         # Tests E2E
pnpm audit:code       # Auditoría completa (código muerto, tipos, barrels)
```

Ver [Guía de Desarrollo](./docs/DEVELOPMENT.md#comandos-útiles) para comandos completos.


## Documentación

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
