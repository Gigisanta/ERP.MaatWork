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
- **Estilos**: `apps/web/public/css/tags.css`
- **JavaScript**: `apps/web/public/js/tag-select.js`
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

## Scripts útiles
- `pnpm dev`: inicia API y Web en paralelo.
- `pnpm -F @cactus/api build`: compila la API.
- `pnpm -F @cactus/api run dev:pretty`: logs legibles en dev.
- `pnpm -F @cactus/api run pm2:logrotate:install` y `pm2:logrotate:config`: configurar rotación de logs.
