# 🔧 Ejemplos de Refactoring - Administration Center

Ejemplos concretos de cómo corregir el código identificado en el análisis.

---

## 1. Cliente API Centralizado

### ❌ Antes (FileUploader.tsx)

```typescript
const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const form = new FormData();
form.append('file', file);

const res = await fetch(`${base}/admin/aum/uploads?broker=balanz`, {
  method: 'POST',
  body: form,
  headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
  credentials: 'include'
});

if (!res.ok) {
  const text = await res.text();
  throw new Error(text);
}

const data = await res.json();
```

### ✅ Después

```typescript
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/toast';
import { logger } from '@/lib/logger';

try {
  const form = new FormData();
  form.append('file', file);

  logger.debug('Uploading AUM file', { 
    name: file.name, 
    size: file.size, 
    type: file.type 
  });

  const data = await apiClient.post('admin/aum/uploads', {
    body: form,
    searchParams: { broker: 'balanz' }
  }).json<{ fileId: string; totals: any }>();

  logger.info('Upload successful', { fileId: data.fileId });
  
  // Handle success...
} catch (err) {
  logger.error('AUM upload failed', { error: err });
  toast.error('Error subiendo archivo', {
    description: err.message || 'Error desconocido'
  });
}
```

**Beneficios:**
- ✅ Retry automático (configurado en api-client)
- ✅ Auth headers automáticos
- ✅ Timeout configurado
- ✅ Error handling consistente
- ✅ Logger estructurado en vez de console.log
- ✅ Toast notification en vez de alert()

---

## 2. Path de Uploads Correcto

### ❌ Antes (aum.ts)

```typescript
import { join } from 'node:path';

const uploadDir = join(process.cwd(), 'apps', 'api', 'uploads');
// Problema: Si cwd = /app/apps/api, resulta en /app/apps/api/apps/api/uploads
```

### ✅ Después

```typescript
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Opción 1: Path relativo al archivo actual (más robusto)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = join(__dirname, '..', '..', 'uploads');

// Opción 2: Variable de entorno (recomendado)
const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
```

**En .env:**
```bash
# Desarrollo
UPLOAD_DIR=./apps/api/uploads

# Producción
UPLOAD_DIR=/var/app/uploads
```

---

## 3. Eliminar Pool Manual y Usar Drizzle

### ❌ Antes (aum.ts)

```typescript
import { Pool } from 'pg';

let _rawPool: Pool | null = null;
function getRawPool(): Pool {
  if (!_rawPool) {
    _rawPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _rawPool;
}

// Uso:
const pool = getRawPool();
const updateQuery = `UPDATE aum_import_rows SET ${updateFields.join(', ')} WHERE ${whereConditions.join(' AND ')}`;
await pool.query(updateQuery, updateValues);
```

### ✅ Después

```typescript
import { db } from '@cactus/db';
import { aumImportRows } from '@cactus/db';
import { eq, and } from 'drizzle-orm';

// ELIMINAR completamente getRawPool() y _rawPool

// Opción 1: Query builder (recomendado)
const dbi = db();
await dbi.update(aumImportRows)
  .set({
    matchedContactId: matchedContactId || null,
    matchedUserId: matchedUserId || null,
    matchStatus: newStatus,
    ...(typeof isPreferred === 'boolean' && { isPreferred })
  })
  .where(and(
    eq(aumImportRows.id, rowId),
    eq(aumImportRows.fileId, fileId)
  ));

// Opción 2: SQL raw (si query builder no es suficiente)
import { sql } from 'drizzle-orm';

await dbi.execute(sql`
  UPDATE aum_import_rows 
  SET 
    matched_contact_id = ${matchedContactId},
    matched_user_id = ${matchedUserId},
    match_status = ${newStatus}
  WHERE id = ${rowId} AND file_id = ${fileId}
`);
```

**Beneficios:**
- ✅ No duplica conexiones a DB
- ✅ Usa el pool existente de Drizzle
- ✅ Type-safe con query builder
- ✅ Consistente con resto del proyecto

---

## 4. CSV Parsing Robusto

### ❌ Antes (aum.ts)

```typescript
const content = await fs.readFile(filePath, 'utf-8');
const [headerLine, ...lines] = content.split(/\r?\n/).filter(Boolean);
const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
// Problema: No maneja comillas escapadas, campos con comas internas, multilinea
```

### ✅ Después

```typescript
import { parse } from 'csv-parse/sync';
import { promises as fs } from 'node:fs';

const content = await fs.readFile(filePath, 'utf-8');

const records = parse(content, {
  columns: true,           // Usar primera fila como headers
  skip_empty_lines: true,  // Ignorar líneas vacías
  trim: true,              // Trim whitespace
  bom: true,               // Handle UTF-8 BOM
  relax_quotes: true,      // Más tolerante con comillas
  escape: '"',             // Comillas escapadas con ""
  quote: '"',              // Comillas para campos
  cast: false              // No convertir tipos automáticamente
}) as Array<Record<string, string>>;

// Mapear a nuestro formato
const rows = records.map((r) => ({
  accountNumber: r['Cuenta comitente'] || null,
  holderName: r['Titular'] || null,
  advisorRaw: r['asesor'] || null,
  raw: r
}));
```

**Beneficios:**
- ✅ Maneja comillas escapadas (`"Nombre ""con comillas"""`)
- ✅ Maneja campos con comas (`"Ciudad, País"`)
- ✅ Detecta encoding (UTF-8 BOM)
- ✅ Battle-tested (usado en producción por miles de proyectos)

**Instalar dependencia:**
```bash
pnpm -F @cactus/api add csv-parse
```

---

## 5. Constantes en Lugar de Magic Numbers

### ❌ Antes (aum.ts)

```typescript
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // Magic number
});

const batchSize = 250; // Magic number
const limit = Math.min(Number(req.query.limit || 50), 200); // Magic numbers
```

### ✅ Después

```typescript
// apps/api/src/config/aum-limits.ts
export const AUM_LIMITS = {
  MAX_FILE_SIZE: 25 * 1024 * 1024,
  BATCH_INSERT_SIZE: 250,
  MAX_ROWS_PER_PAGE: 200,
  DEFAULT_PAGE_SIZE: 50,
  PREVIEW_LIMIT: 500,
  SIMILARITY_THRESHOLD: 0.5
} as const;

// apps/api/src/routes/aum.ts
import { AUM_LIMITS } from '../config/aum-limits';

const upload = multer({
  storage,
  limits: { fileSize: AUM_LIMITS.MAX_FILE_SIZE }
});

const batchSize = AUM_LIMITS.BATCH_INSERT_SIZE;
const limit = Math.min(
  Number(req.query.limit || AUM_LIMITS.DEFAULT_PAGE_SIZE), 
  AUM_LIMITS.MAX_ROWS_PER_PAGE
);
```

**Beneficios:**
- ✅ Single source of truth
- ✅ Fácil ajustar todos los límites desde un lugar
- ✅ Documenta el propósito de cada número
- ✅ Reusable en tests

---

## 6. Error Handling Seguro

### ❌ Antes (aum.ts)

```typescript
} catch (error) {
  return res.status(500).json({ 
    error: error instanceof Error ? error.message : String(error) 
  });
}
```

**Problema:** Expone detalles internos en producción (paths, SQL, stack traces)

### ✅ Después

```typescript
import { createErrorResponse } from '../utils/error-response';

} catch (error) {
  req.log.error({ 
    err: error, 
    fileId: req.params.fileId,
    userId: req.user?.id 
  }, 'AUM upload failed');
  
  return res.status(500).json(
    createErrorResponse({
      error,
      requestId: req.requestId,
      userMessage: 'Error procesando archivo',
      context: { fileId: req.params.fileId }
    })
  );
}
```

**Helper creado:**
```typescript
// apps/api/src/utils/error-response.ts
export function createErrorResponse(options: ErrorResponseOptions) {
  const { error, requestId, userMessage, context } = options;
  const isProduction = process.env.NODE_ENV === 'production';
  
  const response: Record<string, unknown> = {
    error: userMessage || 'Internal server error',
    requestId
  };
  
  if (!isProduction && error instanceof Error) {
    response.message = error.message;
    response.stack = error.stack;
    if (context) response.context = context;
  }
  
  return response;
}
```

**Resultado:**

**Desarrollo:**
```json
{
  "error": "Error procesando archivo",
  "requestId": "req-123",
  "message": "ENOENT: no such file or directory",
  "stack": "Error: ENOENT...",
  "context": { "fileId": "uuid-123" }
}
```

**Producción:**
```json
{
  "error": "Error procesando archivo",
  "requestId": "req-123"
}
```

---

## 7. Tipos TypeScript en Lugar de `any`

### ❌ Antes (aum.ts)

```typescript
const userId = (req as any).user?.id as string;
const userRole = (req as any).user?.role as 'admin' | 'manager' | 'advisor';
const file = (req as any).file as Express.Multer.File | undefined;
rows.forEach((r: any) => { ... });
```

### ✅ Después

```typescript
// apps/api/src/types/express.d.ts
import 'express';

declare module 'express' {
  export interface Request {
    user?: {
      id: string;
      email: string;
      role: 'admin' | 'manager' | 'advisor';
      fullName: string | null;
    };
    requestId?: string;
    log: {
      info: (obj: any, msg: string) => void;
      error: (obj: any, msg: string) => void;
      warn: (obj: any, msg: string) => void;
      debug: (obj: any, msg: string) => void;
    };
  }
}

// apps/api/src/types/multer.d.ts
import 'express';

declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
      files?: Multer.File[];
    }
  }
}

// Ahora en aum.ts:
import type { Request } from 'express';

router.get('/uploads/:fileId/export', 
  requireAuth,
  async (req: Request, res) => {
    const userId = req.user!.id;  // ✅ Typed
    const userRole = req.user!.role;  // ✅ Typed
    const file = req.file;  // ✅ Typed
    // ...
  }
);
```

**Beneficios:**
- ✅ Type safety completo
- ✅ Autocompletado en IDE
- ✅ Errores detectados en compile time
- ✅ Consistente con resto del proyecto

---

## 8. Script Parametrizado

### ❌ Antes (assign-unassigned-contacts.ts)

```typescript
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

### ✅ Después

```typescript
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

interface Arguments {
  user: string;
  dryRun: boolean;
}

const argv = yargs(hideBin(process.argv))
  .option('user', {
    alias: 'u',
    type: 'string',
    description: 'User email or full name to search',
    demandOption: true
  })
  .option('dry-run', {
    alias: 'd',
    type: 'boolean',
    default: false,
    description: 'Show what would be done without making changes'
  })
  .example('$0 --user "admin@example.com"', 'Assign contacts to admin user')
  .example('$0 -u "John Doe" --dry-run', 'Preview assignment for John Doe')
  .help()
  .parseSync() as Arguments;

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
  
  if (targetUser.length === 0) {
    console.error(`❌ No se encontró usuario: ${userIdentifier}`);
    // Show available users...
    process.exit(1);
  }
  
  const user = targetUser[0];
  console.log(`✅ Usuario encontrado: ${user.fullName} (${user.email})\n`);
  
  if (dryRun) {
    console.log('🔍 DRY RUN - No se harán cambios\n');
    // Show what would be done...
    return;
  }
  
  // Proceed with assignment...
}

assignUnassignedContacts(argv.user, argv.dryRun)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });
```

**Uso:**
```bash
# Asignar contactos a cualquier usuario
pnpm -F @cactus/api tsx src/scripts/assign-unassigned-contacts.ts --user "admin@example.com"

# Preview sin hacer cambios
pnpm -F @cactus/api tsx src/scripts/assign-unassigned-contacts.ts -u "John Doe" --dry-run

# Ver ayuda
pnpm -F @cactus/api tsx src/scripts/assign-unassigned-contacts.ts --help
```

**Instalar dependencia:**
```bash
pnpm -F @cactus/api add yargs
pnpm -F @cactus/api add -D @types/yargs
```

---

## 9. Eliminar `ensureAumTables()`

### ❌ Antes (aum.ts)

```typescript
async function ensureAumTables(dbi: any) {
  await dbi.execute(sql`CREATE TABLE IF NOT EXISTS aum_import_files (...)`);
  await dbi.execute(sql`CREATE TABLE IF NOT EXISTS aum_import_rows (...)`);
  // ...
}

// Uso:
try {
  inserted = await dbi.execute(sql`INSERT INTO aum_import_files ...`);
} catch (e: any) {
  if (e?.code === '42P01') {
    await ensureAumTables(dbi);
    inserted = await dbi.execute(sql`INSERT INTO aum_import_files ...`);
  }
}
```

**Problema:** Schema definido en 2 lugares (migración + código)

### ✅ Después

```typescript
// ELIMINAR completamente ensureAumTables()

// Confiar en que las migraciones se ejecutaron
try {
  inserted = await dbi.execute(sql`INSERT INTO aum_import_files ...`);
} catch (e: any) {
  if (e?.code === '42P01') {
    req.log.error('AUM tables not found. Run: pnpm -F @cactus/db migrate');
    return res.status(500).json({
      error: 'Database not initialized',
      details: 'Contact administrator'
    });
  }
  throw e;
}
```

**Verificación en startup:**
```typescript
// apps/api/src/index.ts
import { sql } from 'drizzle-orm';
import { db } from '@cactus/db';

async function verifyDatabase() {
  try {
    await db().execute(sql`SELECT 1 FROM aum_import_files LIMIT 0`);
    await db().execute(sql`SELECT 1 FROM aum_import_rows LIMIT 0`);
    logger.info('AUM tables verified');
  } catch (error) {
    logger.error('AUM tables not found. Run: pnpm -F @cactus/db migrate');
    process.exit(1);
  }
}

// En startup:
await verifyDatabase();
```

---

## 10. Logging Estructurado

### ❌ Antes (FileUploader.tsx)

```typescript
// Debug
// eslint-disable-next-line no-console
console.log('Uploading AUM file', { name: file.name, size: file.size });

// eslint-disable-next-line no-console
console.error('AUM upload failed', err);

alert(`Error subiendo archivo: ${err?.message || err}`);
```

### ✅ Después

```typescript
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/toast';

try {
  logger.debug('Uploading AUM file', { 
    name: file.name, 
    size: file.size,
    type: file.type 
  });
  
  const data = await apiClient.post(...);
  
  logger.info('Upload successful', { 
    fileId: data.fileId,
    totals: data.totals 
  });
  
  toast.success('Archivo subido', {
    description: `${data.totals.parsed} registros procesados`
  });
} catch (err) {
  logger.error('AUM upload failed', { 
    error: err,
    fileName: file.name 
  });
  
  toast.error('Error subiendo archivo', {
    description: err.message || 'Error desconocido'
  });
}
```

**Logger centralizado:**
```typescript
// apps/web/lib/logger.ts
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (msg: string, data?: any) => {
    if (isDev) console.log(`[DEBUG] ${msg}`, data);
  },
  info: (msg: string, data?: any) => {
    if (isDev) console.info(`[INFO] ${msg}`, data);
  },
  error: (msg: string, data?: any) => {
    console.error(`[ERROR] ${msg}`, data);
    // Aquí puedes agregar logging a servicio externo (Sentry, etc.)
  }
};
```

---

## 📋 Checklist de Aplicación

Para cada archivo:

- [ ] Reemplazar `fetch` con `apiClient`
- [ ] Reemplazar `console.log/alert` con `logger/toast`
- [ ] Reemplazar magic numbers con constantes
- [ ] Reemplazar `any` con tipos específicos
- [ ] Usar `createErrorResponse()` en catch blocks
- [ ] Importar constantes desde archivos centralizados

---

## 🚀 Orden Recomendado

1. **Archivos de configuración** (ya creados por script)
   - `apps/api/src/config/aum-limits.ts`
   - `apps/api/src/utils/error-response.ts`
   - `apps/web/lib/config.ts`

2. **Backend crítico**
   - Eliminar Pool manual en `aum.ts`
   - Eliminar `ensureAumTables()` en `aum.ts`
   - Instalar y usar `csv-parse` en `aum.ts`
   - Actualizar error handling en `aum.ts`

3. **Frontend (8 archivos)**
   - Reemplazar fetch con apiClient uno por uno
   - Testear cada cambio antes de continuar

4. **Scripts y utilidades**
   - Parametrizar `assign-unassigned-contacts.ts`

---

**Cualquier duda sobre la implementación de estos ejemplos, pregúntame.** 🚀

