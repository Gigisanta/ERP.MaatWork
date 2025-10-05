# CACTUS CRM Monorepo

Monorepo con pnpm + Turborepo. Apps: API (Express + Pino + Helmet + CORS + PM2) y Web (Next.js). Paquete compartido `@cactus/db` (Drizzle + PostgreSQL).

## Requisitos
- Node.js 20+
- pnpm 9+
- (Opcional) Docker para Postgres local

## Instalación
```bash
pnpm install
```

## Desarrollo
- Base de datos local (opcional):
```bash
docker compose up -d
```
- Variables de entorno API: copia `apps/api/.env.example` a `apps/api/.env` y ajusta.
- Levantar todo en paralelo:
```bash
pnpm dev
```
- Logs legibles en API (desarrollo):
```bash
pnpm -F @cactus/api run dev:pretty
```

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

## Paquete DB (Drizzle)
- Config: `packages/db/drizzle.config.ts`
- Schema: `packages/db/src/schema.ts`
- Cliente: `packages/db/src/index.ts` (exporta `db` y esquemas)

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

## Scripts útiles
- `pnpm dev`: inicia API y Web en paralelo.
- `pnpm -F @cactus/api build`: compila la API.
- `pnpm -F @cactus/api run dev:pretty`: logs legibles en dev.
- `pnpm -F @cactus/api run pm2:logrotate:install` y `pm2:logrotate:config`: configurar rotación de logs.
