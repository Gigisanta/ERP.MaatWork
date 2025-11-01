# Guía de Validación con Zod - Sistema Escalable

## 📋 Visión General

Este sistema proporciona validación escalable y consistente usando Zod para todos los endpoints del backend. Sigue el principio DRY (Don't Repeat Yourself) y asegura seguridad y consistencia en toda la API.

---

## 🏗️ Arquitectura

### Archivos Principales

1. **`utils/common-schemas.ts`** - Schemas reutilizables compartidos
2. **`utils/validation.ts`** - Middleware factory y helpers
3. **`routes/*.ts`** - Schemas específicos por ruta + uso del middleware

### Flujo de Validación

```
Request → requireAuth → requireRole → validate() → Handler
                             ↓
                    Valida params/query/body
                    Si falla → 400 con detalles
                    Si pasa → Continúa con datos validados
```

---

## 📚 Uso Básico

### 1. Importar Helpers

```typescript
import { z } from 'zod';
import { validate } from '../utils/validation';
import { 
  uuidSchema, 
  fileIdParamSchema, 
  paginationQuerySchema 
} from '../utils/common-schemas';
```

### 2. Definir Schemas Específicos

```typescript
// En la ruta específica (ej: routes/aum.ts)

// Path params
const fileIdParamsSchema = fileIdParamSchema; // O crear custom

// Query params
const listQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['active', 'pending']).optional(),
  search: z.string().min(1).max(255).optional()
});

// Body
const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  userId: uuidSchema // Reutilizar schema común
});
```

### 3. Aplicar Validación al Endpoint

```typescript
router.get('/items/:fileId', 
  requireAuth,
  validate({ 
    params: fileIdParamsSchema,
    query: listQuerySchema 
  }),
  async (req, res) => {
    // req.params.fileId está validado como UUID
    // req.query está validado con paginación y filtros
    const { fileId } = req.params; // TypeScript sabe que es string UUID válido
    const { limit, offset, status } = req.query; // Validados y transformados
    
    // Lógica del handler...
  }
);
```

---

## 🎯 Ejemplos por Tipo de Validación

### Validar Path Parameters

```typescript
import { idParamSchema } from '../utils/common-schemas';

router.get('/contacts/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  async (req, res) => {
    const { id } = req.params; // ✅ UUID válido garantizado
    // ...
  }
);
```

### Validar Query Parameters

```typescript
const contactListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['active', 'inactive']).optional(),
  search: z.string().min(1).max(255).optional(),
  assignedTo: uuidSchema.optional()
});

router.get('/contacts',
  requireAuth,
  validate({ query: contactListQuerySchema }),
  async (req, res) => {
    const { limit = 50, offset = 0, status, search } = req.query;
    // ✅ Todos validados y tipados
    // ✅ limit/offset transformados a números
  }
);
```

### Validar Request Body

```typescript
const createContactSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  assignedAdvisorId: uuidSchema.optional().nullable()
});

router.post('/contacts',
  requireAuth,
  validate({ body: createContactSchema }),
  async (req, res) => {
    const { firstName, lastName, email, assignedAdvisorId } = req.body;
    // ✅ Todos validados según schema
    // ✅ UUIDs validados si están presentes
  }
);
```

### Validación Completa (Params + Query + Body)

```typescript
router.put('/contacts/:id',
  requireAuth,
  validate({
    params: idParamSchema,
    query: z.object({ notify: z.boolean().optional() }),
    body: updateContactSchema
  }),
  async (req, res) => {
    const { id } = req.params;
    const { notify } = req.query;
    const updateData = req.body;
    // ✅ Todo validado
  }
);
```

---

## 🔧 Schemas Comunes Disponibles

### De `common-schemas.ts`:

```typescript
// Tipos básicos
uuidSchema              // UUID string válido
emailSchema             // Email válido
isoDateSchema           // ISO 8601 date
dateSchema              // YYYY-MM-DD
timeSchema              // HH:MM

// Path parameters
idParamSchema           // { id: UUID }
fileIdParamSchema       // { fileId: UUID }
contactIdParamSchema    // { contactId: UUID }
userIdParamSchema       // { userId: UUID }

// Query parameters
paginationQuerySchema    // limit, offset, page
sortQuerySchema         // sortBy, sortOrder
searchQuerySchema       // q o search
dateRangeQuerySchema    // fromDate, toDate, etc.

// Enums
userRoleSchema          // admin | manager | advisor
brokerSchema            // balanz | other
statusSchema            // active | inactive | ...
```

### Helpers de Creación

```typescript
// UUID desde string (query params)
uuidFromString('contactId')  // z.string().uuid('contactId must be valid UUID')

// UUID opcional
optionalUuidSchema('userId') // UUID opcional y nullable

// Paginación con límite custom
paginationSchemaWithLimit(200) // Paginación con max 200
```

---

## 🛠️ Middleware `validate()`

### Signatura

```typescript
function validate(schemas: {
  params?: z.ZodSchema;
  query?: z.ZodSchema;
  body?: z.ZodSchema;
}): ExpressMiddleware
```

### Comportamiento

1. **Si la validación falla:**
   - Retorna `400 Bad Request`
   - Incluye detalles de todos los errores
   - Loggea el error de validación
   - **NO ejecuta** el handler

2. **Si la validación pasa:**
   - Modifica `req.params`, `req.query`, `req.body` con valores validados
   - Transforma tipos (ej: string "50" → number 50)
   - Continúa al siguiente middleware/handler

### Respuesta de Error

```json
{
  "error": "Validation error",
  "details": [
    {
      "path": "fileId",
      "message": "Invalid UUID format",
      "code": "invalid_string"
    },
    {
      "path": "limit",
      "message": "Expected number, received string",
      "code": "invalid_type"
    }
  ],
  "requestId": "req-123..."
}
```

---

## 📝 Patrón Recomendado por Ruta

### Estructura de Archivo

```typescript
import { z } from 'zod';
import { validate } from '../utils/validation';
import { uuidSchema, paginationQuerySchema } from '../utils/common-schemas';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

// Path params
const idParamsSchema = z.object({ id: uuidSchema });

// Query params
const listQuerySchema = paginationQuerySchema.extend({
  // Campos adicionales
});

// Body schemas
const createSchema = z.object({
  // Campos requeridos
});

const updateSchema = createSchema.partial();

// ==========================================================
// Routes
// ==========================================================

router.get('/:id',
  requireAuth,
  validate({ params: idParamsSchema }),
  async (req, res) => {
    // Handler
  }
);
```

---

## 🔒 Validaciones Específicas Comunes

### UUIDs

```typescript
// Requerido
z.string().uuid('Must be valid UUID')

// Opcional
uuidSchema.optional().nullable()

// Array de UUIDs
z.array(uuidSchema).min(1)
```

### Números desde Query Strings

```typescript
z.string()
  .regex(/^\d+$/, 'Must be a number')
  .transform(Number)
  .pipe(z.number().int().min(1).max(100))
  .optional()
  .default('50')
```

### Enums

```typescript
z.enum(['option1', 'option2', 'option3'])
z.enum(['active', 'inactive']).default('active')
```

### Fechas

```typescript
// ISO 8601
isoDateSchema  // 2024-01-15T10:30:00Z

// Date only
dateSchema     // 2024-01-15

// Custom
z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
```

### Strings con Límites

```typescript
z.string().min(1).max(255)                    // Texto
z.string().email()                            // Email
z.string().regex(/^[a-z0-9._-]+$/i)          // Pattern
z.string().length(2)                          // Exact length (ej: country code)
```

---

## 🚀 Migración de Endpoints Existentes

### Antes (Sin Validación)

```typescript
router.get('/contacts/:id', requireAuth, async (req, res) => {
  const id = req.params.id; // ⚠️ Cualquier string
  const limit = Number(req.query.limit || 50); // ⚠️ Puede ser NaN
  
  // Lógica...
});
```

### Después (Con Validación)

```typescript
router.get('/contacts/:id', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    query: paginationQuerySchema 
  }),
  async (req, res) => {
    const { id } = req.params; // ✅ UUID válido
    const { limit = 50 } = req.query; // ✅ Número válido
    
    // Lógica...
  }
);
```

---

## ✅ Checklist de Validación

Para cada endpoint nuevo o existente:

- [ ] Path parameters validados con schemas
- [ ] Query parameters validados (especialmente números y enums)
- [ ] Request body validado si aplica
- [ ] UUIDs validados antes de usar en queries
- [ ] Números transformados correctamente desde query strings
- [ ] Límites de tamaño aplicados (max length, max value)
- [ ] Mensajes de error claros en los schemas
- [ ] Reutilizar schemas comunes cuando sea posible

---

## 🎨 Ejemplo Completo: Endpoint de Tareas

```typescript
import { z } from 'zod';
import { validate } from '../utils/validation';
import { uuidSchema, idParamSchema, paginationQuerySchema } from '../utils/common-schemas';

const router = Router();

// ==========================================================
// Schemas
// ==========================================================

const taskQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  assignedTo: uuidSchema.optional(),
  dueBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  contactId: uuidSchema,
  assignedToUserId: uuidSchema,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
});

const updateTaskSchema = createTaskSchema.partial();

// ==========================================================
// Routes
// ==========================================================

router.get('/tasks',
  requireAuth,
  validate({ query: taskQuerySchema }),
  async (req, res) => {
    const { limit = 50, offset = 0, status, assignedTo, dueBefore } = req.query;
    // ✅ Todos validados
  }
);

router.get('/tasks/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  async (req, res) => {
    const { id } = req.params; // ✅ UUID válido
  }
);

router.post('/tasks',
  requireAuth,
  validate({ body: createTaskSchema }),
  async (req, res) => {
    const taskData = req.body; // ✅ Todos los campos validados
  }
);

router.put('/tasks/:id',
  requireAuth,
  validate({ params: idParamSchema, body: updateTaskSchema }),
  async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    // ✅ Todo validado
  }
);
```

---

## 🔍 Debugging

### Ver Errores de Validación

Los errores se loggean automáticamente con `req.log.warn()`:

```typescript
{
  validationError: [
    { path: 'fileId', message: 'Invalid UUID', code: 'invalid_string' }
  ],
  params: { fileId: 'not-a-uuid' },
  query: {},
  body: null
}
```

### Testing de Schemas

```typescript
import { createTaskSchema } from './routes/tasks';

// Test válido
const valid = createTaskSchema.parse({
  title: 'Test',
  contactId: '123e4567-e89b-12d3-a456-426614174000',
  assignedToUserId: '123e4567-e89b-12d3-a456-426614174000'
});

// Test inválido
try {
  createTaskSchema.parse({ title: '' }); // Falla: title min 1
} catch (error) {
  // error.errors contiene detalles
}
```

---

## 📚 Referencias

- **Zod Docs**: https://zod.dev/
- **Schemas Comunes**: `apps/api/src/utils/common-schemas.ts`
- **Middleware**: `apps/api/src/utils/validation.ts`
- **Ejemplo Completo**: `apps/api/src/routes/aum.ts`

---

## 🎯 Próximos Pasos

1. Aplicar validación a todas las rutas existentes siguiendo este patrón
2. Agregar nuevos schemas comunes según necesidad
3. Mantener consistencia en mensajes de error
4. Documentar schemas específicos complejos inline

