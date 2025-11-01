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





