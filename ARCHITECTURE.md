# CACTUS Monorepo — Arquitectura y Decisiones

## Estructura general
- Monorepo pnpm + Turborepo
- Apps:
  - API: `apps/api` (Express 5 + TypeScript + Pino + Helmet + CORS)
  - Web: `apps/web` (Next.js App Router)
  - Analytics: `apps/analytics-service` (Python + yfinance)
- Paquetes:
  - DB: `packages/db` (Drizzle ORM + PostgreSQL)
  - UI: `packages/ui` (Design system)

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
// Impacto: `TAGS_RULES_ENABLED` desactiva evaluación/refresh

## Backend (API)
- Express 5, middlewares en orden: CORS → compression → requestId → helmet → pino-http → routes → error/404
- Error handler devuelve JSON y oculta detalles en prod
- Shutdown graceful (SIGTERM/SIGINT) con timeout de 10s

## Portfolio Systems

**AI_DECISION: Clarificar coexistencia de Portfolio Templates (CRM) y Epic-D (Analytics)**
**Justificación: Evitar confusión sobre dos sistemas con propósitos diferentes pero relacionados**
**Impacto: Equipo entiende cuándo usar cada sistema**

### Portfolio Templates (CRM Legacy - Activo)
- **Propósito:** Modelos de inversión predefinidos para asignar a clientes
- **Ubicación Backend:** `apps/api/src/routes/portfolio.ts` (endpoints `/portfolios/templates`)
- **DB Tables:** `portfolioTemplates`, `portfolioTemplateLines`, `clientPortfolioAssignments`
- **Usado por:** Advisors/Managers para asignar estrategias de inversión a contactos
- **Features:**
  - Crear templates con líneas de inversión (instrumentos o asset classes)
  - Validar que pesos sumen 100%
  - Asignar templates a contactos (clientes)
  - Ver historial de asignaciones
- **Estado:** ✅ **Activo** - Feature operativa del CRM

**Endpoints Portfolio Templates:**
```
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
- **Ubicación Backend:** `apps/api/src/routes/benchmarks.ts`, `apps/api/src/routes/instruments.ts`
- **DB Tables:** `instruments`, `benchmarks`, `benchmark_components`, `metrics`
- **Usado por:** Sistema de analytics para cálculos financieros
- **Features:**
  - Gestión de instrumentos financieros (acciones, ETFs, bonos)
  - Definición de benchmarks (S&P 500, MSCI World, etc.)
  - Cálculo de performance (Python microservice)
  - Comparación de portfolios vs benchmarks
- **Estado:** ✅ **Activo** - Feature nueva de analytics

**Endpoints Epic-D:**
```
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

```
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
- App Router; islas cliente para interactividad
- Auth: token en localStorage + cookie corta para middleware
- CSP ajustada por entorno

## DB (Drizzle)
- `packages/db/migrations` es la fuente de verdad
- Seeds idempotentes; `db:init` compone seeds esenciales
- Prohibido usar `push` en CI/producción

## Analytics (Python)
- yfinance con backoff exponencial y cache en memoria (TTL)
- Endpoints consumidos por API (`/search`, `/prices/*`)

## UI
- Componentes con props accesibles (`aria-*`) y tamaños acotados

## Variables de entorno
- API: `DATABASE_URL`, `PORT`, `LOG_LEVEL`, `CORS_ORIGINS`, `CSP_ENABLED`, `JWT_SECRET`, `JWT_EXPIRES_IN`
- Web: `NEXT_PUBLIC_API_URL`, `JWT_SECRET`
- Analytics: específicas del servicio si aplica

## Seguridad
- Pino redacta headers sensibles en prod
- Cookies `SameSite=Lax` y `Secure` cuando hay HTTPS

