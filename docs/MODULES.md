# Guías de Módulos Complejos

## Fecha: Diciembre 2024

Este documento proporciona guías detalladas para módulos complejos del sistema.

---

## Pipeline

### Descripción
Sistema de gestión de pipeline de ventas con etapas configurables y vista kanban.

### Estructura
```
apps/api/src/routes/pipeline/
├── stages.ts      # CRUD de etapas
├── board.ts        # Vista kanban board
├── move.ts         # Movimiento de contactos entre etapas
├── metrics.ts      # Métricas del pipeline
└── index.ts        # Punto de entrada
```

### Endpoints Principales

#### Stages
- `GET /pipeline/stages` - Listar todas las etapas
- `POST /pipeline/stages` - Crear nueva etapa
- `PUT /pipeline/stages/:id` - Actualizar etapa

#### Board
- `GET /pipeline/board` - Obtener datos del board kanban
  - Query params: `advisorId`, `teamId`, `stageId`

#### Move
- `POST /pipeline/move` - Mover contacto entre etapas
  - Body: `{ contactId, fromStageId, toStageId }`

#### Metrics
- `GET /pipeline/metrics` - Métricas del pipeline
  - Query params: `advisorId`, `teamId`, `dateFrom`, `dateTo`

### Flujo de Datos

```
1. Usuario carga board → GET /pipeline/board
2. Backend obtiene etapas → GET pipeline stages (cacheable)
3. Backend obtiene contactos por etapa → Batch query con inArray
4. Frontend renderiza kanban board
5. Usuario mueve contacto → POST /pipeline/move
6. Backend valida movimiento → Verifica reglas de transición
7. Backend actualiza contacto → UPDATE contacts SET pipelineStageId
8. Frontend actualiza UI → Optimistic update con SWR
```

### Optimizaciones
- ✅ Batch queries para contactos por etapa
- ✅ Cache para stages (TTL 30 min, invalidación al modificar)
- ✅ Data isolation por rol automático

---

## Analytics

### Descripción
Sistema de analytics financiero con cálculos de performance y comparaciones.

### Estructura
```
apps/api/src/routes/analytics/
├── dashboard.ts    # Dashboard con KPIs
├── metrics.ts      # Catálogo de métricas disponibles
├── performance.ts   # Cálculo de performance de portfolios
├── comparison.ts    # Comparación de portfolios/benchmarks
└── index.ts         # Punto de entrada
```

### Endpoints Principales

#### Dashboard
- `GET /analytics/dashboard` - KPIs según rol del usuario
  - Retorna: AUM total, contactos activos, conversión, etc.

#### Performance
- `GET /analytics/performance/:portfolioId` - Performance de portfolio
  - Query params: `startDate`, `endDate`, `frequency`
  - Usa servicio Python para cálculos

#### Comparison
- `POST /analytics/compare` - Comparar múltiples portfolios/benchmarks
  - Body: `{ portfolios: [...], benchmarks: [...], startDate, endDate }`
  - Usa servicio Python para cálculos

### Flujo de Datos

```
1. Usuario solicita performance → GET /analytics/performance/:id
2. Backend valida portfolio → Verifica acceso y existencia
3. Backend llama servicio Python → POST /python/performance
4. Servicio Python calcula → yfinance + cálculos financieros
5. Backend retorna resultados → JSON con datos de performance
6. Frontend renderiza gráficos → Recharts con datos
```

### Integración con Servicio Python
- Timeout: 60s (configurable)
- Fallback: Si servicio no disponible, retorna error 503
- Retry: No (cálculos pesados, mejor fallar rápido)

---

## Auth (Autenticación y Autorización)

### Descripción
Sistema de autenticación con JWT y autorización basada en roles (RBAC).

### Estructura
```
apps/api/src/auth/
├── jwt.ts              # Generación y verificación de tokens
├── middlewares.ts      # requireAuth, requireRole
├── authorization.ts    # Data isolation y filtros de acceso
└── types.ts            # Tipos de roles y permisos
```

### Flujo de Autenticación

```
1. Usuario hace login → POST /auth/login
2. Backend valida credenciales → bcrypt.compare()
3. Backend genera JWT → signUserToken()
4. Backend establece cookie httpOnly → Set-Cookie header
5. Frontend almacena token → localStorage (para middleware)
6. Requests incluyen token → Cookie automático + Authorization header
```

### Roles y Permisos

#### Admin
- ✅ Acceso completo sin restricciones
- ✅ Puede ver todos los contactos
- ✅ Puede modificar cualquier dato

#### Manager
- ✅ Acceso a contactos de su equipo
- ✅ Puede ver contactos de advisors bajo su supervisión
- ✅ Puede asignar contactos a advisors

#### Advisor
- ✅ Acceso solo a sus propios contactos
- ✅ Puede crear/editar sus contactos
- ✅ No puede ver contactos de otros advisors

### Data Isolation

```typescript
// Ejemplo: Filtro automático por rol
const accessScope = await getUserAccessScope(userId, userRole);

// Admin: sin filtros
// Manager: filtro por accessibleAdvisorIds
// Advisor: filtro por userId

const contacts = await db()
  .select()
  .from(contacts)
  .where(and(
    buildContactAccessFilter(accessScope).whereClause,
    // otros filtros...
  ));
```

### Middlewares

#### requireAuth
- Verifica que el usuario esté autenticado
- Extrae token de cookie o Authorization header
- Valida token con `verifyUserToken()`
- Agrega `req.user` con datos del usuario

#### requireRole
- Requiere `requireAuth` primero
- Verifica que el usuario tenga uno de los roles especificados
- Retorna 403 si no tiene permisos

---

## Contacts

### Descripción
Sistema CRUD completo de contactos con tags, pipeline, y asignaciones.

### Estructura
```
apps/api/src/routes/contacts/
├── crud.ts         # Operaciones CRUD principales
├── assignment.ts   # Asignación de contactos (next-step)
├── history.ts      # Historial de cambios
├── webhook.ts      # Importación vía webhook
└── index.ts        # Punto de entrada
```

### Endpoints Principales

#### CRUD
- `GET /contacts` - Listar contactos (con filtros y paginación)
- `GET /contacts/:id` - Obtener detalle de contacto
- `POST /contacts` - Crear nuevo contacto
- `PUT /contacts/:id` - Actualizar contacto completo
- `PATCH /contacts/:id` - Actualizar campos específicos
- `DELETE /contacts/:id` - Soft delete de contacto

#### Assignment
- `PATCH /contacts/:id/next-step` - Actualizar próximo paso

#### History
- `GET /contacts/:id/history` - Historial de cambios

#### Webhook
- `POST /contacts/webhook` - Importar contactos vía webhook (N8N)

### Optimizaciones Implementadas

#### Batch Queries para Tags
```typescript
// ✅ Optimizado: Un solo query para todos los contactos
const contactIds = contacts.map(c => c.id);
const tags = await db()
  .select()
  .from(contactTags)
  .innerJoin(tags, eq(contactTags.tagId, tags.id))
  .where(inArray(contactTags.contactId, contactIds));

// Agrupar en memoria
const tagsMap = new Map();
tags.forEach(t => {
  if (!tagsMap.has(t.contactId)) {
    tagsMap.set(t.contactId, []);
  }
  tagsMap.get(t.contactId).push(t);
});
```

### Data Isolation
- Cada usuario solo ve sus propios contactos por defecto
- Managers ven contactos de su equipo
- Admins ven todos los contactos
- Filtros aplicados automáticamente según rol

---

## Referencias

- **Pipeline**: Ver `apps/api/src/routes/pipeline/`
- **Analytics**: Ver `apps/api/src/routes/analytics/`
- **Auth**: Ver `apps/api/src/auth/`
- **Contacts**: Ver `apps/api/src/routes/contacts/`


