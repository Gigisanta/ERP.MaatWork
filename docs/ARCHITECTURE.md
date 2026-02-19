# MAATWORK Monorepo — Arquitectura y Decisiones

## Estructura general

- **Monorepo:** `pnpm workspaces` + `turborepo`
- **Apps:**
  - API: `apps/api` (Express 5 + TypeScript + Pino + Helmet + CORS)
  - Web: `apps/web` (Next.js App Router)
  - Analytics: `apps/analytics-service` (Python + yfinance)
- **Packages:**
  - DB: `packages/db` (Drizzle ORM + PostgreSQL 16)
  - UI: `packages/ui` (Design System + React Components)
- **Tech Stack:** TypeScript estricto (`exactOptionalPropertyTypes: true`), PostgreSQL 16, PM2
- **Requisitos:** Node.js >=22.0.0 <25.0.0 (soporta hasta v24.x.x), pnpm >=9.0.0

## Decisiones claves recientes

// AI_DECISION: Endurecer validación de variables de entorno
// Justificación: Evitar boots inválidos en prod y reducir fugas de info
// Impacto: API falla rápido si faltan secrets en prod

- `apps/api/src/config/env.ts` valida `DATABASE_URL`, `PORT` (siempre) y `JWT_SECRET` (en prod).

// AI_DECISION: Unificar logging con Pino y eliminar console.*
// Justificación: Logs estructurados, niveles, y trazabilidad
// Impacto: Mejor observabilidad; menos ruido en consola

- Jobs y rutas migrados a `logger`/`pino-http`.

// AI_DECISION: CSP y CORS estrictos por defecto
// Justificación: Endurecer superficie de ataque
// Impacto: En prod se limita `connect-src` al backend

- `apps/web/next.config.js` define CSP por entorno.
- API usa Helmet con CSP opcional vía `CSP_ENABLED`.

// AI_DECISION: Timeouts y AbortController para llamadas al microservicio Python
// Justificación: Evitar cuelgues y liberar recursos
// Impacto: Mejor resiliencia en `/instruments`

// AI_DECISION: ETag y caché estático fuerte
// Justificación: Mejorar performance y costos
// Impacto: `_next/static` immutable; imágenes con SWR

// AI_DECISION: Feature flags para funcionalidades incompletas
// Justificación: Evitar rutas “mock” en producción
// Impacto: Feature flags permiten desactivar funcionalidades en desarrollo

## Backend (API)

- Express 5, middlewares en orden: CORS → compression → requestId → helmet → pino-http → routes → error/404
- Error handler devuelve JSON y oculta detalles en prod
- Shutdown graceful (SIGTERM/SIGINT) con timeout de 10s
- **Versionado de API:** Todas las rutas deben usar el prefijo `/v1/` obligatoriamente (ej: `/v1/contacts`, `/v1/users`)

### Utilidades Compartidas

**AI_DECISION: Centralizar lógica común para eliminar duplicación**
**Justificación: DRY principle, facilita mantenimiento y consistencia**
**Impacto: Código más mantenible, menos bugs por inconsistencias**

#### Validación (`apps/api/src/utils/validation-common.ts`)

- Helpers reutilizables para validaciones comunes (email, UUID, fechas, etc.)
- Usado por múltiples rutas para mantener consistencia

#### Paginación (`apps/api/src/utils/pagination.ts`)

- Helpers centralizados para parse, validate y format de paginación
- Estandariza paginación en todos los endpoints
- Usado por: `/contacts`, `/notes`, `/capacitaciones`, y otras rutas

#### Manejo de Errores (`apps/api/src/utils/error-response.ts`)

- `createErrorResponse`: Crea respuestas de error estandarizadas
- `getStatusCodeFromError`: Determina código HTTP apropiado
- Todas las rutas deben usar `createErrorResponse` para consistencia

#### Route Handlers (`apps/api/src/utils/route-handler.ts`)

- `createRouteHandler`: Wrapper estándar para handlers que retornan datos
  - Envuelve automáticamente en `{ success: true, data: ... }`
  - Maneja errores automáticamente con `createErrorResponse`
  - Incluye `requestId` en respuestas
  - **Usar para la mayoría de casos**
- `createAsyncHandler`: Wrapper para casos especiales que necesitan control directo de `res`
  - Usar SOLO para: status 201, cookies, headers personalizados, streaming, campos adicionales
  - **Usar solo cuando es necesario**

### Estructura de Módulos Refactorizados

**AI_DECISION: Dividir módulos grandes en módulos especializados**
**Justificación: Mejora mantenibilidad, testabilidad y separación de responsabilidades**
**Impacto: Código más modular, fácil de entender y mantener**

#### AUM Column Mapper (`apps/api/src/utils/aum-columns/`)

Estructura modular del mapeo de columnas AUM:

```text
aum-columns/
├── normalize-column-name.ts    # Normalización de nombres de columnas
├── column-pattern-matcher.ts   # Matching de patrones de columnas
├── column-validator.ts         # Validación de mapeos de columnas
├── column-mapper.ts            # Orquestador principal
├── types.ts                    # Tipos compartidos
└── index.ts                    # Barrel export
```

**Antes:** Un archivo de 858 líneas
**Después:** 6 módulos especializados, cada uno < 200 líneas

#### Hooks Especializados (`apps/web/app/admin/aum/rows/hooks/`)

Estructura modular de hooks de estado AUM:

```text
hooks/
├── useAumPagination.ts         # Estado y acciones de paginación
├── useAumFilters.ts            # Estado y acciones de filtros
├── useAumSearch.ts             # Estado y acciones de búsqueda
├── useAumModals.ts             # Estado y acciones de modales
├── useAumLoading.ts            # Estados de carga
└── useAumRowsState.ts          # Orquestador que compone hooks especializados
```

**Antes:** Un hook de 340 líneas
**Después:** 6 hooks especializados, cada uno < 100 líneas

#### Portfolio Components (`apps/web/app/portfolios/[id]/`)

Estructura modular de página de portfolio:

```text
portfolios/[id]/
├── hooks/
│   ├── usePortfolioData.ts           # Fetch y estado del portfolio
│   └── usePortfolioLineActions.ts    # Acciones de líneas (create, update, delete)
├── components/
│   ├── PortfolioLineForm.tsx        # Formulario de creación de líneas
│   └── PortfolioHeader.tsx          # Header con información y acciones
└── page.tsx                          # Componente orquestador
```

**Antes:** Un componente de 517 líneas
**Después:** 2 hooks + 2 componentes + página orquestadora, cada uno < 150 líneas

## Portfolio Systems

**AI_DECISION: Clarificar coexistencia de Portfolio Templates (CRM) y Epic-D (Analytics)**
**Justificación: Evitar confusión sobre dos sistemas con propósitos diferentes pero relacionados**
**Impacto: Equipo entiende cuándo usar cada sistema**

### Portfolio Templates (CRM Legacy - Activo)

- **Propósito:** Modelos de inversión predefinidos para asignar a clientes
- **Ubicación Backend:** `apps/api/src/routes/portfolio/index.ts` (endpoints `/portfolios/templates`)
- **DB Tables:** `portfolioTemplates`, `portfolioTemplateLines`, `clientPortfolioAssignments`
- **Usado por:** Advisors/Managers para asignar estrategias de inversión a contactos
- **Features:**
  - Crear templates con líneas de inversión (instrumentos o asset classes)
  - Validar que pesos sumen 100%
  - Asignar templates a contactos (clientes)
  - Ver historial de asignaciones
- **Estado:** ✅ **Activo** - Feature operativa del CRM

**Endpoints Portfolio Templates:**

```text
GET    /portfolios/templates              # Listar templates
POST   /portfolios/templates              # Crear template
PUT    /portfolios/templates/:id          # Editar template
GET    /portfolios/templates/:id/lines    # Ver líneas
POST   /portfolios/templates/:id/lines    # Agregar línea
DELETE /portfolios/templates/:id/lines/:lineId
GET    /portfolios/templates/lines/batch  # Batch fetch

POST   /portfolios/assignments            # Asignar template a contacto
GET    /portfolios/assignments/:contactId # Ver asignaciones de contacto
```

### Portfolios & Benchmarks (Epic-D - Activo)

- **Propósito:** Sistema de analytics para performance y comparación de instrumentos
- **Ubicación Backend:** `apps/api/src/routes/benchmarks/index.ts`, `apps/api/src/routes/instruments/index.ts`
- **DB Tables:** `instruments`, `benchmarks`, `benchmark_components`, `metrics`
- **Usado por:** Sistema de analytics para cálculos financieros
- **Features:**
  - Gestión de instrumentos financieros (acciones, ETFs, bonos)
  - Definición de benchmarks (S&P 500, MSCI World, etc.)
  - Cálculo de performance (Python microservice)
  - Comparación de portfolios vs benchmarks
- **Estado:** ✅ **Activo** - Feature nueva de analytics

**Endpoints Epic-D:**

```text
GET    /benchmarks                        # Listar benchmarks
POST   /benchmarks                        # Crear benchmark
GET    /benchmarks/:id/components         # Ver componentes
POST   /benchmarks/:id/components         # Agregar componente

GET    /instruments                       # Listar instrumentos
POST   /instruments                       # Crear instrumento
GET    /instruments/:symbol/price         # Precio actual

POST   /analytics/performance             # Calcular performance
POST   /analytics/compare                 # Comparar portfolios
```

### Relación entre Sistemas

```text
┌─────────────────────────────────────────────────────────────┐
│                    CRM Legacy System                        │
│                                                             │
│  Portfolio Templates → Define QUÉ instrumentos recomendar   │
│  - Template: "Conservador"                                  │
│    • 60% Bonos (asset class)                               │
│    • 30% Acciones AAPL (instrumento)                       │
│    • 10% Cash                                              │
│                                                             │
│  Asignación: Contact ← Template                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Referencia instrumentos
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Epic-D Analytics                         │
│                                                             │
│  Instruments & Benchmarks → Analiza CÓMO performan         │
│  - Instrumento: AAPL                                       │
│    • Precio actual                                         │
│    • Performance histórica                                 │
│    • Volatilidad, Sharpe ratio                            │
│                                                             │
│  - Benchmark: S&P 500                                      │
│    • Comparación con portfolios                            │
│    • Drawdown, correlación                                 │
└─────────────────────────────────────────────────────────────┘
```

**En resumen:**

- **Templates (CRM)**: Receta de inversión para asignar a clientes
- **Epic-D**: Motor de análisis financiero con datos de mercado
- **Ambos coexisten**: Templates referencian instrumentos que Epic-D analiza

## Frontend (Web)

- **Next.js App Router:** Server/Client Components
- **Pattern Client Islands:** Extract interactive sections into small components (< 100 lines)
- **Auth:** Token en localStorage + cookie corta para middleware
- **Data Fetching:** SWR para client-side mutations
- **CSP:** Ajustada por entorno (desarrollo vs producción)

## DB (Drizzle)

- **Schema:** `packages/db/src/schema.ts` (definiciones de tablas)
- **Migraciones:** `packages/db/migrations` es la fuente de verdad
- **Flujo:** Modificar schema → `pnpm -F @maatwork/db generate` → `pnpm -F @maatwork/db migrate`
- **Seeds:** Idempotentes; `pnpm -F @maatwork/db seed:all` compone seeds esenciales
- **Prohibido:** Usar `drizzle-kit push` en CI/producción (es destructivo)

## Analytics (Python)

- yfinance con backoff exponencial y cache en memoria (TTL)
- Endpoints consumidos por API (`/search`, `/prices/*`)

## Estructura Estándar de Carpetas

### Backend (API) - `apps/api/src/`

```text
apps/api/src/
├── routes/              # Rutas API organizadas por dominio
│   ├── [domain]/        # Módulos grandes divididos en subdirectorios
│   │   ├── crud.ts      # Operaciones CRUD principales
│   │   ├── [feature].ts # Features específicas
│   │   └── index.ts     # Punto de entrada consolidado
│   └── [domain].ts      # Rutas pequeñas en un solo archivo
├── services/            # Lógica de negocio reutilizable
├── utils/               # Utilidades compartidas
├── config/              # Configuración centralizada
├── types/               # Tipos TypeScript específicos del backend
├── auth/                # Autenticación y autorización
└── index.ts             # Entry point de la aplicación
```

**Ejemplo - Rutas API:**

```typescript
// apps/api/src/routes/contacts/crud.ts
import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../utils/route-handler';
import { z } from 'zod';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const createContactSchema = z.object({ /* ... */ });

// ==========================================================
// Routes
// ==========================================================

// GET - Usar createRouteHandler (retorna datos directamente)
router.get('/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  createRouteHandler(async (req) => {
    const contact = await getContact(req.params.id);
    if (!contact) {
      throw new HttpError(404, 'Contact not found');
    }
    return contact; // Se envuelve en { success: true, data: contact }
  })
);

// POST - Usar createAsyncHandler para status 201
router.post('/',
  requireAuth,
  validate({ body: createContactSchema }),
  createAsyncHandler(async (req, res) => {
    const contact = await createContact(req.body);
    return res.status(201).json({
      success: true,
      data: contact,
      requestId: req.requestId
    });
  })
);

export default router;
```

### Frontend (Web) - `apps/web/app/`

```text
apps/web/app/
├── [route]/             # Rutas dinámicas de Next.js
│   ├── page.tsx         # Server Component principal
│   ├── loading.tsx      # Loading state
│   ├── error.tsx        # Error boundary
│   └── components/      # Componentes específicos de la ruta
├── components/           # Componentes compartidos globales
├── (auth)/              # Route groups para autenticación
└── layout.tsx           # Layout raíz
```

**Ejemplo - Página Next.js:**

```typescript
// apps/web/app/contacts/[id]/page.tsx
import { notFound } from 'next/navigation';
import { apiServer } from '@/lib/api-server';

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const contact = await apiServer.get(`/v1/contacts/${params.id}`);
  if (!contact) notFound();

  return <ContactDetail contact={contact} />;
}
```

### Componentes UI - `packages/ui/src/`

```text
packages/ui/src/
├── components/           # Componentes React organizados por categoría
│   ├── forms/           # Input, Select, Checkbox, Switch, etc.
│   ├── feedback/        # Alert, Modal, Toast, Card, etc.
│   └── nav/             # Header, Sidebar, Nav, Pagination, etc.
├── primitives/          # Box, Text, Stack, Grid, etc. (building blocks)
├── hooks/               # useTheme, etc.
├── styles/              # CSS global y variables
├── tokens/              # Design tokens (colores, spacing, etc.)
├── utils/               # Utilidades (cn, etc.)
└── index.ts             # Barrel export (exports específicos)
```

**Ejemplo - Componente UI:**

```typescript
// packages/ui/src/components/forms/Button.tsx
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(/* ... */)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
```

### Tipos - `apps/web/types/` y `apps/api/src/types/`

```text
types/
├── index.ts          # Barrel export
├── common.ts         # Tipos base y utility types compartidos
├── [domain].ts       # Un archivo por dominio (contact.ts, portfolio.ts, etc.)
```

**Ejemplo - Tipos:**

```typescript
// apps/web/types/common.ts
export interface BaseEntity {
  id: string;
}

export interface TimestampedEntity extends BaseEntity {
  createdAt: string;
  updatedAt: string;
}

export type CreateRequest<T extends BaseEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateRequest<T extends BaseEntity> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;
```

### Hooks - `apps/web/lib/hooks/`

```text
lib/hooks/
├── usePortfolioAssets.ts
├── useKeyboardShortcuts.ts
└── [feature].ts
```

**Reglas:**

- ✅ Un hook por archivo
- ✅ Prefijo `use` obligatorio
- ✅ Tests co-ubicados (`useHook.test.ts`)

## UI (@maatwork/ui)

**Estructura:**

- **Componentes:** Organizados por categoría (`forms/`, `feedback/`, `nav/`)
- **Primitives:** Building blocks (Box, Text, Stack, Grid, etc.)
- **Exports específicos:** NO usar `export *` (tree-shaking)
- **Tests:** Co-ubicados con componentes (`Component.test.tsx`)

**Reglas:**

- ✅ Componentes accesibles (`aria-*`) y tamaños acotados
- ✅ Tipos exportados explícitamente (`type ComponentProps`)
- ✅ Build genera `dist/` con `.js` y `.d.ts`

## Mejoras Recientes de Consistencia

### Optimización de Imports y Exports

- **Exports nombrados específicos**: Convertidos exports barrel (`export *`) en módulos críticos (`utils/database/`, `utils/file/`, `utils/http/`) para mejor tree-shaking y reducción de bundle size
- **Aliases de importación**: Estandarizados imports relativos largos a aliases `@/` (`@/utils/*`, `@/routes/*`, `@/services/*`, etc.) para mejor mantenibilidad
- **Nomenclatura de archivos**: Renombrados archivos de servicios a convención kebab-case (`aum-conflict-resolution.ts`, `aum-matcher.ts`, `aum-upsert.ts`)

### Documentación y Comentarios

- **AI_DECISION comments**: Agregados comentarios explicativos a funciones complejas (`validate()`, `RATE_LIMIT_PRESETS`) siguiendo el patrón establecido
- **Justificación e impacto**: Cada AI_DECISION incluye por qué se tomó la decisión y qué impacto tiene

### Calidad de Código Verificada

- **Typecheck**: Configuración TypeScript estricta con `exactOptionalPropertyTypes: true`
- **Linting**: Reglas ESLint que previenen `any` types, `console.*`, y barrel exports. Ver [CODING_STANDARDS.md](./CODING_STANDARDS.md).
- **Tests**: Cobertura de tests unitarios en módulos críticos con patrones de mocking consistentes

## Variables de entorno

- API: `DATABASE_URL`, `PORT`, `LOG_LEVEL`, `CORS_ORIGINS`, `CSP_ENABLED`, `JWT_SECRET`, `JWT_EXPIRES_IN`
- Web: `NEXT_PUBLIC_API_URL`, `JWT_SECRET`
- Analytics: específicas del servicio si aplica

## Seguridad

- Pino redacta headers sensibles en prod
- Cookies `SameSite=Lax` y `Secure` cuando hay HTTPS
