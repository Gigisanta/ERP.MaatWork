# RUNBOOK — CACTUS Monorepo

## Requisitos
- Node 22+
- pnpm 9+
- PostgreSQL 16 (o `docker compose up -d`)
- PM2 en VPS (producción)

## Variables de entorno
### API (`apps/api/.env`)
- DATABASE_URL=
- PORT=3001
- LOG_LEVEL=info
- CORS_ORIGINS=http://localhost:3000
- CSP_ENABLED=false
- JWT_SECRET=change-me
- JWT_EXPIRES_IN=7d

### Web (`apps/web`)
- NEXT_PUBLIC_API_URL=http://localhost:3001
- JWT_SECRET=change-me (debe coincidir con API)

## Desarrollo local
```bash
pnpm install
# opcional
docker compose up -d
# inicia sesión tmux con api/web/analytics/logs
pnpm dev
```
- API: `http://localhost:3001/health`
- Web: `http://localhost:3000`

## Base de datos (Drizzle)
```bash
# generar migraciones desde schema (si cambias schema)
pnpm -F @cactus/db run generate
# aplicar migraciones (usa baseline en migrations_squashed)
pnpm -F @cactus/db run migrate
# seeds esenciales (opcional; la API también los ejecuta en startup)
pnpm -F @cactus/db run db:init
```
Notas:
- No usar `push` en CI/prod.
- Migraciones: baseline unificada en `packages/db/migrations_squashed`.
- En desarrollo, la API corre migraciones automáticamente al iniciar si `AUTO_MIGRATE=true` (por defecto cuando `NODE_ENV !== 'production'`).

## Despliegue API (PM2, producción)
```bash
# build API
pnpm -F @cactus/api build
# iniciar con PM2
pm2 start apps/api/ecosystem.config.js --env production
# ver logs
pm2 logs cactus-api
```

### Logrotate PM2
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:workerInterval 60
pm2 set pm2-logrotate:rotateInterval 0 0 * * *
```

## Seguridad y performance
- API helmet + pino-http con `redact` en prod
- ETag activado (`app.set('etag','strong')`)
- Timeouts en fetch hacia servicio Python (15s normal, 5min backfill)
- Web con CSP estricta en prod; `_next/static` cache immutable

## Troubleshooting
- API no arranca: verificar `DATABASE_URL`, `JWT_SECRET` y puertos ocupados
- 403/redirects inesperados: revisar cookie `token` y `JWT_SECRET` consistente
- Lento al buscar instrumentos: verificar `apps/analytics-service` y conectividad; timeouts protegerán API
- Seeds fallan por duplicados: asegúrate de idempotencia; revisar `onConflict*`
