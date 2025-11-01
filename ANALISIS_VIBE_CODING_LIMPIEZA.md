# 🚨 Análisis de Vibe Coding y Deuda Técnica - Rama `administration-center`

**Fecha:** 1 de Noviembre, 2025  
**Estado:** ⚠️ **REQUIERE LIMPIEZA INMEDIATA**  
**Severidad:** 🔴 CRÍTICO (1), 🟠 ALTO (5), 🟡 MEDIO (8)

---

## 📊 Resumen Ejecutivo

La implementación contiene **14 problemas críticos** que violan las mejores prácticas del proyecto, incluyendo:
- 🔴 Archivos binarios en Git (3,660 líneas de CSV)
- 🔴 Path duplicado corrupto en filesystem
- 🟠 Fetch directo en 8 archivos (vs cliente API centralizado)
- 🟠 42 instancias de URL hardcodeada
- 🟠 Código de debugging en producción

**Estimación de limpieza:** 6-8 horas

---

## 🔴 PROBLEMAS CRÍTICOS (BLOQUEANTES)

### 1. **Archivos CSV Comiteados en Git** 🔴🔴🔴

**Ubicación:** `apps/api/apps/api/uploads/*.csv` (5 archivos)

```bash
apps/api/apps/api/uploads/1761781426170-8hqr5uut5jr.csv  # 732 líneas
apps/api/apps/api/uploads/1761802520016-2z8nu4atlvl.csv  # 732 líneas
apps/api/apps/api/uploads/1761803146753-xqcy0wimm4.csv   # 732 líneas
apps/api/apps/api/uploads/1761833784301-mgbxqa1mfpr.csv  # 732 líneas
apps/api/apps/api/uploads/1761840893241-mavcx0thdm.csv   # 732 líneas
```

**Problema:**
- **3,660 líneas de datos de prueba** en el repositorio
- Archivos binarios inflan el `.git` permanentemente
- Posible **exposición de datos sensibles** de clientes reales
- Viola principio: "Nunca commitear uploads/datos de usuario"

**Impacto:**
- Historial de Git contaminado permanentemente
- Clone inicial del repo es más pesado
- Potencial **violación de GDPR/privacidad**

**Solución:**
```bash
# 1. Agregar a .gitignore
echo "apps/api/uploads/" >> .gitignore
echo "apps/api/apps/" >> .gitignore

# 2. Remover del tracking (mantener archivos locales)
git rm --cached -r apps/api/apps/api/uploads/
git commit -m "chore: remove CSV uploads from git tracking"

# 3. Limpiar historial (opcional pero recomendado)
# git filter-branch --force --index-filter \
#   "git rm --cached --ignore-unmatch apps/api/apps/api/uploads/*.csv" \
#   --prune-empty --tag-name-filter cat -- --all
```

---

### 2. **Path Duplicado Corrupto** 🔴🔴

**Código afectado:**
```typescript:76:76:apps/api/src/routes/aum.ts
const uploadDir = join(process.cwd(), 'apps', 'api', 'uploads');
```

**Problema:**
- Si `process.cwd()` ya está en `apps/api/`, el path resultante es `apps/api/apps/api/uploads/`
- **Path duplicado confirmado** en filesystem
- Función `join()` no normaliza paths redundantes

**Evidencia:**
```
apps/api/apps/api/uploads/  ← PATH DUPLICADO ❌
```

**Solución:**
```typescript
// ❌ MAL - Asume cwd incorrecto
const uploadDir = join(process.cwd(), 'apps', 'api', 'uploads');

// ✅ BIEN - Path absoluto desde directorio del archivo
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = join(__dirname, '..', '..', 'uploads');

// O mejor aún - Variable de entorno
const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
```

**Configurar en `.env`:**
```bash
# apps/api/.env
UPLOAD_DIR=/var/app/uploads  # Producción (fuera del repo)
# UPLOAD_DIR=./uploads        # Desarrollo (local)
```

---

## 🟠 PROBLEMAS DE ARQUITECTURA (ALTO)

### 3. **Fetch Directo en Lugar de Cliente API** 🟠🟠

**Archivos afectados:** 8 archivos en `apps/web/app/admin/aum/`

**Patrón incorrecto repetido 8 veces:**
```typescript:25:31:apps/web/app/admin/aum/components/FileUploader.tsx
const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const res = await fetch(`${base}/admin/aum/uploads?broker=balanz`, {
  method: 'POST',
  body: form,
  headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
});
```

**Problemas:**
- ❌ No usa el cliente API centralizado existente (`apps/web/lib/api-client.ts`)
- ❌ No tiene retry automático
- ❌ No tiene refresh token automático
- ❌ No tiene timeout configurado
- ❌ Error handling inconsistente
- ❌ Código duplicado 8 veces

**Comparación con el estándar del proyecto:**
```typescript
// ❌ MAL - Como está ahora en AUM
const res = await fetch(`${base}/admin/aum/uploads?broker=balanz`, {
  method: 'POST',
  body: form,
  headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
});

// ✅ BIEN - Cliente centralizado (usado en portfolios)
import { apiClient } from '@/lib/api-client';

const response = await apiClient.post('/admin/aum/uploads', formData, {
  params: { broker: 'balanz' }
});
```

**Archivos a corregir:**
- `apps/web/app/admin/aum/page.tsx` (1 fetch)
- `apps/web/app/admin/aum/history/page.tsx` (1 fetch)
- `apps/web/app/admin/aum/[fileId]/page.tsx` (1 fetch)
- `apps/web/app/admin/aum/components/FileUploader.tsx` (1 fetch)
- `apps/web/app/admin/aum/components/ContactUserPicker.tsx` (1 fetch)
- `apps/web/app/admin/aum/components/DuplicateResolutionModal.tsx` (2 fetch)
- `apps/web/app/admin/aum/components/RowMatchForm.tsx` (1 fetch)

---

### 4. **URL Hardcodeada en 42 Lugares** 🟠

**Patrón repetido:**
```typescript
const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

**Problemas:**
- Viola principio DRY (Don't Repeat Yourself)
- Fallback hardcodeado debería estar en config centralizada
- Si cambia el puerto, hay que actualizar 42 archivos

**Solución:**
```typescript
// ✅ Crear apps/web/lib/config.ts
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  apiTimeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
  environment: process.env.NODE_ENV || 'development'
} as const;

// Uso:
import { config } from '@/lib/config';
const res = await fetch(`${config.apiUrl}/admin/aum/uploads`);
```

**Mejor aún:** Usar el cliente API que ya tiene esto configurado.

---

### 5. **Pool de PostgreSQL Duplicado** 🟠

**Código problemático:**
```typescript:78:85:apps/api/src/routes/aum.ts
// Singleton Pool for raw SQL queries
let _rawPool: Pool | null = null;
function getRawPool(): Pool {
  if (!_rawPool) {
    _rawPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _rawPool;
}
```

**Problemas:**
- Drizzle **ya maneja un pool de conexiones** internamente
- Crear un segundo pool duplica conexiones a la DB
- Riesgo de **connection pool exhaustion**
- Inconsistente con el resto del proyecto (nadie más usa Pool manual)

**Uso actual:**
```typescript:784:784:apps/api/src/routes/aum.ts
const pool = getRawPool();
await pool.query(updateQuery, updateValues);
```

**Solución:**
```typescript
// ❌ NO HACER - Pool manual
const pool = getRawPool();
await pool.query(updateQuery, updateValues);

// ✅ HACER - Usar Drizzle execute
import { sql } from 'drizzle-orm';
const dbi = db();
await dbi.execute(sql.raw(updateQuery, updateValues));

// O mejor aún - Usar Drizzle query builder
await dbi.update(aumImportRows)
  .set({ 
    matchedContactId, 
    matchedUserId, 
    matchStatus: newStatus,
    ...(typeof isPreferred === 'boolean' && { isPreferred })
  })
  .where(and(
    eq(aumImportRows.id, rowId),
    eq(aumImportRows.fileId, fileId)
  ));
```

---

### 6. **CSV Parsing Manual Vulnerable** 🟠

**Código problemático:**
```typescript:362:381:apps/api/src/routes/aum.ts
// CSV simple usando Node (para MVP mejor XLSX)
const content = await fs.readFile(filePath, 'utf-8');
const [headerLine, ...lines] = content.split(/\r?\n/).filter(Boolean);
const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
// ...
const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
```

**Problemas:**
- No maneja **comillas escapadas** (`"Nombre ""con comillas"""`)
- No maneja **campos con comas internas** (`"Ciudad, País"`)
- No maneja **líneas multilinea** en campos
- No detecta **encoding** (UTF-8 BOM, Latin1)
- Vulnerable a **malformed CSVs**

**Comparación:**
```typescript
// ❌ MAL - Parsing manual
const cols = line.split(',');  // ❌ Rompe con "Buenos Aires, Argentina"

// ✅ BIEN - Usar librería battle-tested
import { parse } from 'csv-parse/sync';

const records = parse(content, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true,  // Handle UTF-8 BOM
  relax_quotes: true,
  escape: '"',
  quote: '"'
});
```

**Dependencia necesaria:**
```bash
pnpm -F @cactus/api add csv-parse
```

---

### 7. **Script Hardcoded con Nombre Específico** 🟠

**Archivo:** `apps/api/src/scripts/assign-unassigned-contacts.ts`

**Código problemático:**
```typescript:11:24:apps/api/src/scripts/assign-unassigned-contacts.ts
async function assignUnassignedContacts() {
  console.log('\n🔍 Buscando usuario "giolivo santarelli"...\n');
  
  const targetUser = await db()
    .select()
    .from(users)
    .where(
      or(
        sql`LOWER(${users.fullName}) LIKE LOWER(${'%giolivo%santarelli%'})`,
        sql`LOWER(${users.email}) LIKE LOWER(${'%giolivo%santarelli%'})`
      )
    )
    .limit(1);
```

**Problemas:**
- ❌ Nombre de usuario **hardcodeado** en el código
- ❌ No funciona para otros usuarios/instalaciones
- ❌ Lógica de negocio mezclada con datos específicos
- ❌ Script no es reutilizable

**Solución:**
```typescript
// ✅ Script parametrizado
import yargs from 'yargs/yargs';

const argv = yargs(process.argv.slice(2))
  .option('user', {
    alias: 'u',
    type: 'string',
    description: 'User email or name',
    demandOption: true
  })
  .option('dry-run', {
    alias: 'd',
    type: 'boolean',
    default: false,
    description: 'Show what would be done without making changes'
  })
  .help()
  .argv;

async function assignUnassignedContacts(userIdentifier: string, dryRun: boolean) {
  console.log(`\n🔍 Buscando usuario: ${userIdentifier}...\n`);
  
  const targetUser = await db()
    .select()
    .from(users)
    .where(
      or(
        ilike(users.fullName, `%${userIdentifier}%`),
        ilike(users.email, `%${userIdentifier}%`)
      )
    )
    .limit(1);
  
  // ...
}

// Uso:
// pnpm -F @cactus/api tsx src/scripts/assign-unassigned-contacts.ts --user "giolivo"
// pnpm -F @cactus/api tsx src/scripts/assign-unassigned-contacts.ts --user "admin@example.com" --dry-run
```

---

## 🟡 PROBLEMAS DE CÓDIGO LIMPIO (MEDIO)

### 8. **Código de Debugging en Producción** 🟡

**Instancias encontradas:**

```typescript:28:30:apps/web/app/admin/aum/components/FileUploader.tsx
// Debug
// eslint-disable-next-line no-console
console.log('Uploading AUM file', { name: file.name, size: file.size, type: file.type, url: `${base}/admin/aum/uploads?broker=balanz` });
```

```typescript:57:58:apps/web/app/admin/aum/components/FileUploader.tsx
// eslint-disable-next-line no-console
console.error('AUM upload failed', err);
```

```typescript:60:60:apps/web/app/admin/aum/components/FileUploader.tsx
alert(`Error subiendo archivo: ${err?.message || err}`);
```

**Problemas:**
- `console.log` en producción expone información sensible
- `alert()` nativo es mala UX (bloquea UI, no es customizable)
- `eslint-disable-next-line` indica que el dev sabía que estaba mal

**Solución:**
```typescript
// ❌ MAL
console.log('Uploading AUM file', { name: file.name });
alert(`Error: ${err.message}`);

// ✅ BIEN - Usar logger y toast notifications
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/toast';

logger.debug('Uploading AUM file', { name: file.name, size: file.size });

try {
  // ...
} catch (err) {
  logger.error('AUM upload failed', { error: err });
  toast.error('Error subiendo archivo', {
    description: err.message || 'Error desconocido'
  });
}
```

---

### 9. **Magic Numbers Sin Constantes** 🟡

**Instancias:**

```typescript:295:295:apps/api/src/routes/aum.ts
limits: { fileSize: 25 * 1024 * 1024 } // 25MB
```

```typescript:572:572:apps/api/src/routes/aum.ts
const batchSize = 250;
```

```typescript:813:813:apps/api/src/routes/aum.ts
const limit = Math.min(Number(req.query.limit || 50), 200);
```

**Problema:**
- Números hardcodeados dispersos
- No hay un lugar centralizado para ajustar límites
- Dificulta ajustes de performance

**Solución:**
```typescript
// ✅ Crear apps/api/src/config/aum-limits.ts
export const AUM_LIMITS = {
  MAX_FILE_SIZE: 25 * 1024 * 1024,  // 25MB
  BATCH_INSERT_SIZE: 250,
  MAX_ROWS_PER_PAGE: 200,
  DEFAULT_PAGE_SIZE: 50,
  PREVIEW_LIMIT: 500,
  SIMILARITY_THRESHOLD: 0.5
} as const;

// Uso:
import { AUM_LIMITS } from '../config/aum-limits';

const upload = multer({
  storage,
  limits: { fileSize: AUM_LIMITS.MAX_FILE_SIZE }
});

const batchSize = AUM_LIMITS.BATCH_INSERT_SIZE;
```

---

### 10. **Tipos `any` Dispersos** 🟡

**Instancias:**

```typescript:105:106:apps/api/src/routes/aum.ts
const userId = (req as any).user?.id as string;
const userRole = (req as any).user?.role as 'admin' | 'manager' | 'advisor';
```

```typescript:136:136:apps/api/src/routes/aum.ts
rows.forEach((r: any) => { if (r.matchedContactId) contactIdSet.add(r.matchedContactId as string); });
```

```typescript:395:395:apps/api/src/routes/aum.ts
const file = (req as any).file as Express.Multer.File | undefined;
```

**Problema:**
- Perdemos type safety
- TypeScript no puede ayudarnos a detectar errores
- Inconsistente con el resto del proyecto

**Solución:**
```typescript
// ❌ MAL
const userId = (req as any).user?.id as string;

// ✅ BIEN - Tipos extendidos
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: 'admin' | 'manager' | 'advisor';
  };
}

router.get('/uploads/:fileId/export', 
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const userId = req.user.id;  // ✅ Typed correctly
    const userRole = req.user.role;  // ✅ Typed correctly
    // ...
  }
);
```

---

### 11. **Tablas Creadas en Runtime (Migration Drift)** 🟡

**Código problemático:**
```typescript:298:335:apps/api/src/routes/aum.ts
async function ensureAumTables(dbi: any) {
  // Create tables if they don't exist (idempotent)
  await dbi.execute(sql`
    CREATE TABLE IF NOT EXISTS aum_import_files (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      broker text NOT NULL,
      // ...
    );
  `);
  // ...
}
```

**Usado en:**
```typescript:404:418:apps/api/src/routes/aum.ts
try {
  inserted = await dbi.execute(sql`INSERT INTO aum_import_files ...`);
} catch (e: any) {
  if (e?.code === '42P01') {
    await ensureAumTables(dbi);
    inserted = await dbi.execute(sql`INSERT INTO aum_import_files ...`);
  }
}
```

**Problemas:**
- ❌ **Migration drift** - schema en 2 lugares (migration + código)
- ❌ Si cambias el schema, hay que actualizar 2 archivos
- ❌ No respeta el flujo `drizzle-kit generate` → `drizzle-kit migrate`
- ❌ Código de producción no debería crear tablas

**Solución:**
```typescript
// ❌ ELIMINAR completamente ensureAumTables()

// ✅ Confiar en las migraciones
// Si la tabla no existe, la app debe fallar y obligar a correr:
// pnpm -F @cactus/db migrate

// En desarrollo, agregar verificación al inicio:
// apps/api/src/index.ts
import { db } from '@cactus/db';

async function verifyDatabase() {
  try {
    await db().execute(sql`SELECT 1 FROM aum_import_files LIMIT 0`);
  } catch (error) {
    logger.error('Database tables not found. Run: pnpm -F @cactus/db migrate');
    process.exit(1);
  }
}
```

---

### 12. **Error Messages Exponen Detalles** 🟡

**Instancias:**
```typescript:176:177:apps/api/src/routes/aum.ts
} catch (error) {
  return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
}
```

**Problema:**
- Expone stack traces y detalles internos en producción
- Viola seguridad básica (información disclosure)
- Inconsistente con patrón del proyecto

**Patrón correcto ya existe:**
```typescript:297:302:apps/api/src/index.ts
res.status(500).json({
  error: 'Internal server error',
  requestId: (req as any).requestId,
  message: !isProduction ? err.message : undefined,
  stack: !isProduction ? err.stack : undefined
});
```

**Solución:**
```typescript
// ✅ Crear helper reutilizable
// apps/api/src/utils/error-response.ts
export function createErrorResponse(error: unknown, requestId?: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    error: 'Internal server error',
    requestId,
    ...((!isProduction && error instanceof Error) && {
      message: error.message,
      stack: error.stack
    })
  };
}

// Uso:
import { createErrorResponse } from '../utils/error-response';

try {
  // ...
} catch (error) {
  req.log.error({ err: error }, 'AUM upload failed');
  return res.status(500).json(createErrorResponse(error, req.requestId));
}
```

---

### 13. **Similaridad de Postgres Sin Verificación** 🟡

**Código:**
```typescript:504:514:apps/api/src/routes/aum.ts
const res = await dbi.execute(sql`
  SELECT id, full_name,
         similarity(full_name, ${r.holderName}) as sim_score
  FROM contacts
  WHERE deleted_at IS NULL
    AND full_name % ${r.holderName}
  ORDER BY sim_score DESC
  LIMIT 5
`);
```

**Problema:**
- Usa `pg_trgm` extension sin verificar que esté instalada
- Si la extensión no está, el query falla
- Fallback existe (catch), pero no documenta el prerequisito

**Solución:**
```typescript
// 1. Documentar prerequisito
// apps/api/README.md
/*
## Database Extensions Required

- `pg_trgm` - Fuzzy text matching for contact similarity
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```
*/

// 2. Agregar verificación al startup
// apps/api/src/index.ts
async function verifyDatabaseExtensions() {
  try {
    await db().execute(sql`SELECT 1 WHERE 'test' % 'test'`);
    logger.info('pg_trgm extension verified');
  } catch (error) {
    logger.warn('pg_trgm extension not installed - fuzzy matching disabled');
  }
}

// 3. Feature flag para el código
const PG_TRGM_AVAILABLE = process.env.PG_TRGM_ENABLED !== 'false';

if (PG_TRGM_AVAILABLE) {
  // Try similarity search
} else {
  // Fallback to exact match
}
```

---

### 14. **Filename con Timestamp No Único** 🟡

**Código:**
```typescript:93:95:apps/api/src/routes/aum.ts
filename: (_req, file, cb) => {
  cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname)}`);
}
```

**Problema:**
- `Date.now()` tiene resolución de milisegundos
- En subidas simultáneas, `Date.now()` puede ser igual
- `Math.random()` no es criptográficamente seguro
- Riesgo de **colisión de nombres** (bajo pero existe)

**Solución:**
```typescript
import { randomUUID } from 'node:crypto';

filename: (_req, file, cb) => {
  const uuid = randomUUID();
  const timestamp = Date.now();
  const ext = extname(file.originalname);
  const filename = `${timestamp}-${uuid}${ext}`;
  cb(null, filename);
}

// O mejor aún - Solo UUID
filename: (_req, file, cb) => {
  const uuid = randomUUID();
  const ext = extname(file.originalname);
  cb(null, `${uuid}${ext}`);
}
```

---

## 📋 Checklist de Limpieza Prioritizada

### 🔴 Crítico (Hacer PRIMERO)
- [ ] **Remover CSVs de Git** - Agregar a `.gitignore` y eliminar del tracking
- [ ] **Corregir path duplicado** - Usar variable de entorno para `uploadDir`
- [ ] **Limpiar filesystem** - Mover archivos a `apps/api/uploads/` correcto

### 🟠 Alto (Esta semana)
- [ ] **Implementar cliente API en AUM** - Reemplazar 8 fetch directos
- [ ] **Centralizar API_URL** - Crear `lib/config.ts` o usar cliente existente
- [ ] **Eliminar Pool manual** - Usar solo Drizzle para queries
- [ ] **Reemplazar CSV parsing** - Instalar y usar `csv-parse`
- [ ] **Parametrizar script** - Hacer `assign-unassigned-contacts.ts` reutilizable

### 🟡 Medio (Próximo sprint)
- [ ] **Remover console.log/alert** - Usar logger y toast
- [ ] **Crear constantes de límites** - Archivo `config/aum-limits.ts`
- [ ] **Eliminar tipos `any`** - Crear interfaces extendidas
- [ ] **Remover `ensureAumTables()`** - Confiar en migraciones
- [ ] **Crear helper de errores** - Función `createErrorResponse()`
- [ ] **Documentar pg_trgm** - Agregar verificación de extensión
- [ ] **Mejorar UUID filename** - Usar `randomUUID()` de crypto

---

## 🎯 Patrones Correctos del Proyecto (Referencia)

### ✅ Cliente API Centralizado
```typescript:1:50:apps/web/lib/api-client.ts
// Ya existe y funciona bien - usar este patrón
import ky from 'ky';

export const apiClient = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  retry: {
    limit: 2,
    methods: ['get', 'post', 'put'],
    statusCodes: [408, 429, 500, 502, 503, 504]
  },
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      }
    ]
  }
});
```

### ✅ Validación Zod
```typescript:16:36:apps/api/src/routes/contacts.ts
// Patrón correcto ya implementado en contacts
const createContactSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  assignedAdvisorId: z.string().uuid().optional().nullable(),
  // ...
});

router.post('/', 
  requireAuth,
  validate({ body: createContactSchema }),
  async (req, res) => {
    // req.body ya está validado y tipado
  }
);
```

### ✅ Error Handling
```typescript
// Patrón correcto del proyecto
try {
  // operación
} catch (error) {
  req.log.error({ err: error, context: {...} }, 'Operation failed');
  
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error instanceof Error ? error.message : String(error);
  
  return res.status(500).json({
    error: message,
    requestId: req.requestId
  });
}
```

---

## 📊 Impacto Estimado

| Categoría | Tiempo | Beneficio |
|-----------|--------|-----------|
| Limpieza crítica (CSV, paths) | 1-2h | Seguridad + Git health |
| Cliente API | 2-3h | Consistencia + Features |
| Refactoring tipos/constantes | 2-3h | Mantenibilidad |
| **TOTAL** | **6-8h** | **Alto ROI** |

---

## 🚀 Plan de Acción Recomendado

### Día 1 (2-3h)
1. Remover CSVs de Git + actualizar `.gitignore`
2. Corregir path duplicado + variable de entorno
3. Parametrizar script de asignación

### Día 2 (3-4h)
4. Implementar cliente API en componentes AUM
5. Eliminar Pool manual + usar Drizzle
6. Instalar `csv-parse` + reemplazar parsing manual

### Día 3 (1-2h)
7. Crear constantes de configuración
8. Remover console.log/alert
9. Crear helper de errores
10. Code review final

---

## 📚 Referencias

- **Reglas del proyecto:** `.cursorrules`
- **Cliente API:** `apps/web/lib/api-client.ts`
- **Validaciones:** `apps/api/src/utils/validation.ts`
- **Mejores prácticas:** `apps/api/VALIDATION_GUIDE.md`

---

## ✅ Conclusión

**Estado actual:** Código funcional pero con **deuda técnica significativa** que viola múltiples estándares del proyecto.

**Riesgo de NO limpiar:**
- Datos sensibles en Git (posible violación de privacidad)
- Filesystem corrupto (path duplicado)
- Código difícil de mantener
- Inconsistencias con el resto del proyecto

**Recomendación:** **Limpieza obligatoria antes de merge a main**.


