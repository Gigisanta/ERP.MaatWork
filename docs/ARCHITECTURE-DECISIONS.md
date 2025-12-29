# Decisiones Arquitectonicas

Registro de decisiones arquitectonicas importantes del proyecto MAATWORK.

---

## ADR 1: Monorepo con pnpm + Turborepo

### Contexto
Necesitamos gestionar multiples aplicaciones (API, Web, Analytics) y paquetes compartidos (DB, UI, Types).

### Decision
Usar monorepo con pnpm workspaces y Turborepo.

### Justificacion
- **Codigo compartido**: Paquetes `@maatwork/db`, `@maatwork/ui`, `@maatwork/types` reutilizables
- **Builds incrementales**: Turborepo cachea builds, solo reconstruye lo modificado
- **Dependencias sincronizadas**: Una sola version de React, TypeScript, etc.
- **DX mejorada**: Un solo `pnpm install`, un solo `pnpm dev`

### Consecuencias
- Requiere configuracion inicial (workspaces, turbo.json)
- Builds deben ejecutarse en orden correcto (paquetes antes que apps)
- CI/CD mas complejo pero mas eficiente

### Referencias
- `pnpm-workspace.yaml` - Configuracion de workspaces
- `turbo.json` - Pipelines de Turborepo
- `package.json` root - Scripts globales

---

## ADR 2: Express 5 sobre Fastify

### Contexto
Necesitamos un framework HTTP para la API backend.

### Decision
Usar Express 5 con TypeScript.

### Justificacion
- **Madurez**: Ecosistema masivo, documentacion extensa
- **Familiaridad**: Equipo conoce Express, curva de aprendizaje minima
- **Middleware ecosystem**: Helmet, CORS, compression, pino-http disponibles
- **Express 5**: Soporte nativo para async handlers, mejor manejo de errores

### Alternativas Consideradas
- **Fastify**: Mas rapido, pero menor ecosistema y equipo no familiarizado
- **NestJS**: Demasiado opinionado para nuestras necesidades

### Consecuencias
- Performance ligeramente menor que Fastify (no es bottleneck para nuestro caso)
- Necesitamos wrappear handlers async manualmente (resuelto con `createRouteHandler`)

### Referencias
- `apps/api/src/index.ts` - Configuracion Express
- `apps/api/src/utils/route-handler.ts` - Handler wrapper

---

## ADR 3: Drizzle ORM sobre Prisma

### Contexto
Necesitamos un ORM para PostgreSQL con TypeScript.

### Decision
Usar Drizzle ORM.

### Justificacion
- **Type safety**: Tipos inferidos desde schema, sin code generation
- **SQL-like**: Sintaxis cercana a SQL, sin abstraccion excesiva
- **Performance**: Queries mas eficientes, sin N+1 por defecto
- **Migraciones**: Control total con migraciones SQL
- **Bundle size**: Mucho mas ligero que Prisma

### Alternativas Consideradas
- **Prisma**: Mas maduro pero mas pesado, code generation lenta
- **TypeORM**: Decoradores, menos type-safe

### Consecuencias
- Migraciones manuales (generadas, no automaticas)
- Menos "magic", mas control explicito
- Documentacion menos extensa que Prisma

### Referencias
- `packages/db/src/schema/` - Schemas Drizzle
- `packages/db/migrations/` - Migraciones SQL
- [DATABASE.md](./DATABASE.md) - Guia de base de datos

---

## ADR 4: Next.js App Router con Server Components

### Contexto
Necesitamos un framework React para el frontend.

### Decision
Usar Next.js 15 con App Router y Server Components.

### Justificacion
- **Performance**: Server Components reducen JS enviado al cliente
- **SEO**: Rendering server-side por defecto
- **Streaming**: Suspense y loading states nativos
- **Data fetching**: Fetch en servidor, sin waterfalls

### Patron: Client Islands
Extraer secciones interactivas en componentes pequenos:

```typescript
// page.tsx (Server Component)
export default async function Page() {
  const data = await fetchData();
  return (
    <div>
      <h1>Server Content</h1>
      <InteractiveSection initialData={data} /> {/* Client Island */}
    </div>
  );
}

// InteractiveSection.tsx (Client Component)
"use client";
export function InteractiveSection({ initialData }) {
  const [state, setState] = useState();
  // Interactividad aqui
}
```

### Consecuencias
- Separacion clara server/client
- Componentes mas pequenos y testeables
- Necesidad de pasar datos como props

### Referencias
- `apps/web/app/` - Paginas App Router
- `.cursor/rules/domains/web.mdc` - Reglas frontend

---

## ADR 5: Analytics Service en Python

### Contexto
Necesitamos obtener datos de mercado financiero (precios, historicos).

### Decision
Microservicio separado en Python usando yfinance.

### Justificacion
- **Ecosistema**: Python tiene mejores librerias financieras (yfinance, pandas)
- **Separacion**: Aislado de la API principal, puede escalar independiente
- **Cache**: Implementa TTL cache para reducir llamadas a Yahoo Finance
- **Resilencia**: Backoff exponencial para rate limiting

### Alternativas Consideradas
- **Node.js**: Librerias financieras menos maduras
- **API externa pagada**: Costo, dependencia de terceros

### Consecuencias
- Dos lenguajes en el proyecto
- Comunicacion via HTTP entre servicios
- Deploy separado

### Referencias
- `apps/analytics-service/` - Codigo Python
- `.cursor/rules/domains/python.mdc` - Reglas Python

---

## ADR 6: Cliente API Centralizado

### Contexto
Necesitamos hacer requests HTTP desde el frontend a la API.

### Decision
NUNCA usar `fetch` directamente. Usar cliente centralizado.

### Justificacion
- **Consistencia**: Mismo formato de requests/responses
- **Retry automatico**: Manejo de errores 5xx con retry
- **Refresh token automatico**: Manejo de 401 con refresh
- **Type safety**: Tipos TypeScript compartidos
- **Logging centralizado**: Todos los requests logueados

### Estructura

```typescript
// apps/web/lib/api/[domain].ts
export async function createContact(data: CreateContactRequest): Promise<Contact> {
  const response = await apiClient.post('/v1/contacts', data);
  return response.data;
}

// NUNCA hacer esto:
const response = await fetch('/api/v1/contacts', { ... });
```

### Consecuencias
- Necesidad de crear funciones wrapper para cada endpoint
- Manejo consistente de errores
- Facil de testear (mock del cliente)

### Referencias
- `apps/web/lib/api/` - Clientes por dominio
- `apps/web/lib/api/client.ts` - Cliente base

---

## ADR 7: Validacion con Zod

### Contexto
Necesitamos validar datos de entrada en la API.

### Decision
Usar Zod para validacion en backend, con middleware `validate()`.

### Justificacion
- **Type inference**: Tipos TypeScript desde schemas
- **Composicion**: Schemas reutilizables y combinables
- **Mensajes claros**: Errores descriptivos para el usuario
- **Runtime validation**: Seguridad en produccion

### Patron

```typescript
// Schemas definidos en cada ruta
const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

// Middleware validate() en la ruta
router.post('/',
  requireAuth,
  validate({ body: createSchema }),
  async (req, res) => {
    // req.body ya esta validado y tipado
  }
);
```

### Consecuencias
- Schemas deben mantenerse sincronizados con tipos
- Validacion solo en backend (frontend usa para UX)

### Referencias
- `apps/api/src/utils/validation.ts` - Middleware
- `apps/api/src/utils/common-schemas.ts` - Schemas reutilizables

---

## ADR 8: Logging Estructurado con Pino

### Contexto
Necesitamos logging para debugging y monitoreo.

### Decision
Usar Pino para logging estructurado JSON.

### Justificacion
- **Performance**: Pino es el logger mas rapido para Node.js
- **Estructurado**: JSON logs facilitan analisis y busqueda
- **Contexto**: Request ID, user ID automaticos
- **Niveles**: debug, info, warn, error configurables

### Patron

```typescript
// Backend - usar req.log
req.log.info({ userId, action: 'create_contact' }, 'Creating contact');
req.log.error({ err: error }, 'Failed to create contact');

// NO usar console.log en produccion
```

### Consecuencias
- Logs en JSON (menos legibles en desarrollo, usar pino-pretty)
- Configuracion de niveles por entorno

### Referencias
- `apps/api/src/utils/logger.ts` - Configuracion Pino
- `.cursor/rules/patterns/logging.mdc` - Patrones de logging

---

## ADR 9: Autenticacion JWT con Cookies

### Contexto
Necesitamos autenticar usuarios en la aplicacion.

### Decision
JWT almacenado en cookie HTTP-only.

### Justificacion
- **Seguridad**: Cookie HTTP-only previene XSS
- **SSR compatible**: Disponible en Server Components
- **Automatico**: Browser envia cookie automaticamente
- **Refresh token**: Renovacion transparente

### Flujo

1. Login: API genera JWT, lo setea en cookie HTTP-only
2. Requests: Browser envia cookie automaticamente
3. Refresh: Token proximo a expirar se renueva automaticamente
4. Logout: Cookie se elimina

### Consecuencias
- CORS debe permitir credentials
- Cookies deben configurarse correctamente (SameSite, Secure)

### Referencias
- `apps/api/src/routes/auth.ts` - Endpoints de auth
- `apps/api/src/auth/middlewares.ts` - Middlewares
- `.cursor/rules/patterns/security.mdc` - Patrones de seguridad

---

## ADR 10: SWR para Client-Side Data Fetching

### Contexto
Necesitamos data fetching en componentes cliente con cache y revalidacion.

### Decision
Usar SWR para data fetching client-side.

### Justificacion
- **Cache**: Datos cacheados automaticamente
- **Deduplication**: Requests duplicados evitados
- **Revalidation**: Datos frescos en background
- **Optimistic updates**: UI responsiva

### Configuracion

```typescript
// apps/web/lib/api-hooks.ts
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  dedupingInterval: 10000,
};
```

### Consecuencias
- Cache puede mostrar datos stale brevemente
- Configuracion debe ajustarse por caso de uso

### Referencias
- `apps/web/lib/api-hooks.ts` - Hooks SWR
- `.cursor/rules/domains/web.mdc` - Configuracion SWR

---

## ADR 11: Integración Google OAuth2 y Calendar API

### Contexto

Necesitamos permitir a los usuarios autenticarse con Google OAuth2 y gestionar calendarios:
- **Calendario de equipo**: Managers pueden conectar calendario de Google para su equipo (en `/teams`)
- **Calendario personal**: Cada usuario puede conectar su calendario personal de Google (en `/home` y sección dedicada `/calendar`)
- Sincronización bidireccional de eventos
- Mantener tokens seguros y renovarlos automáticamente

### Decisión

Usar `google-auth-library` y `googleapis` directamente en el backend, almacenando tokens encriptados en la base de datos. Distinguir entre:
- **Calendario de equipo**: Se almacena en `teams.calendarId` (Google Calendar ID) y usa tokens del manager
- **Calendario personal**: Se almacena en `google_oauth_tokens.calendarId` y usa tokens del usuario

### Justificación

- **Separación clara**: Calendarios de equipo vs personales tienen diferentes propósitos y permisos
- **Tokens del manager**: Para calendario de equipo, el manager autoriza y el equipo ve eventos
- **Tokens personales**: Cada usuario gestiona su propio calendario personal
- **Compatibilidad**: Mantiene `teams.calendarUrl` existente (iframe embed) mientras agrega API integration
- **Seguridad**: Tokens encriptados con AES-256-GCM, refresh automático cada 10 minutos
- **Control directo**: Sin dependencias adicionales como Passport.js, mejor integración con Express

### Alternativas Consideradas

- **Passport.js**: Más complejo, agrega abstracción innecesaria para nuestro caso de uso
- **Google Sign-In para Web**: Solo frontend, no permite refresh tokens en backend
- **Calendar API sin OAuth**: No permite acceso a calendarios privados de usuarios

### Consecuencias

- **Dos tipos de conexión**: Equipo (manager) y personal (usuario)
- **Permisos diferentes**: Solo managers pueden conectar calendario de equipo
- **UI diferenciada**: Componentes separados para cada tipo de calendario
- **Rutas específicas**: `/teams/[id]` para calendario de equipo, `/calendar` para personal
- **Job scheduler**: Refresh automático de tokens cada 10 minutos
- **CSP actualizado**: Necesario permitir dominios de Google cuando CSP está habilitado
- **Migración DB**: Nueva tabla `google_oauth_tokens` y campos adicionales en `teams` y `users`

### Referencias

- `apps/api/src/auth/google-oauth.ts` - Cliente OAuth2
- `apps/api/src/routes/auth/google/` - Rutas de autenticación Google
- `apps/api/src/routes/calendar/` - Rutas de calendario (personal y equipo)
- `apps/api/src/services/google-calendar.ts` - Servicio Calendar API
- `apps/api/src/jobs/google-token-refresh.ts` - Job de refresh de tokens
- `packages/db/src/schema/auth.ts` - Schema de tokens OAuth
- `apps/web/components/auth/GoogleLoginButton.tsx` - Componente de login Google
- `apps/web/app/calendar/` - Página de calendario personal
- `apps/web/app/components/home/PersonalCalendarWidget.tsx` - Widget de calendario personal
- `apps/web/app/teams/components/TeamCalendarSection.tsx` - Sección de calendario de equipo

---

## Historial de Decisiones

| ADR | Fecha | Decision |
|-----|-------|----------|
| 1 | 2024-01 | Monorepo con pnpm + Turborepo |
| 2 | 2024-01 | Express 5 sobre Fastify |
| 3 | 2024-01 | Drizzle ORM sobre Prisma |
| 4 | 2024-01 | Next.js App Router con Server Components |
| 5 | 2024-02 | Analytics Service en Python |
| 6 | 2024-02 | Cliente API Centralizado |
| 7 | 2024-02 | Validacion con Zod |
| 8 | 2024-03 | Logging Estructurado con Pino |
| 9 | 2024-03 | Autenticacion JWT con Cookies |
| 10 | 2024-03 | SWR para Client-Side Data Fetching |
| 11 | 2024-12 | Integracion Google OAuth2 y Calendar API |

---

## Referencias

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura general
- [CODE-IMPROVEMENTS.md](./CODE-IMPROVEMENTS.md) - Mejoras de codigo
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Guia de desarrollo
