# Análisis de Seguridad y Mejores Prácticas - Sistema AUM

## 📋 Resumen Ejecutivo

**Estado General**: ⚠️ **NO LISTO PARA PRODUCCIÓN** sin correcciones críticas

La implementación tiene buenas bases arquitectónicas, pero presenta **vulnerabilidades de seguridad críticas** y falta de validación que impiden su uso en producción de forma segura.

---

## ✅ Prácticas Profesionales Implementadas

### 1. Arquitectura y Estructura
- ✅ **Separación de responsabilidades**: Staging tables (`aum_import_files`, `aum_import_rows`) separadas de tablas canónicas
- ✅ **Batch processing**: Inserts en lotes de 500 para mejor performance
- ✅ **Error handling básico**: Try-catch en endpoints principales
- ✅ **Logging estructurado**: Uso de `req.log` en algunos lugares
- ✅ **Autenticación**: Middleware `requireAuth` aplicado en todos los endpoints
- ✅ **Documentación**: Comentarios `AI_DECISION` explican decisiones

### 2. Comparación con Otras Rutas
- ✅ Otras rutas (`contacts.ts`, `tasks.ts`, `users.ts`) usan **Zod** para validación
- ✅ Otras rutas tienen **RBAC** completo con `requireRole`
- ✅ Otras rutas validan **UUIDs** antes de usarlos en queries

---

## 🚨 Problemas Críticos de Seguridad

### 1. **VALIDACIÓN DE INPUTS - CRÍTICO** ⚠️⚠️⚠️

#### Problema: Sin validación de parámetros
```typescript
// ❌ VULNERABLE: No valida que fileId sea UUID válido
router.get('/uploads/:fileId/export', requireAuth, async (req, res) => {
  const fileId = req.params.fileId; // Cualquier string aceptado
  // Se usa directamente en query SQL
});
```

**Riesgo**: 
- **SQL Injection potencial** si Drizzle no sanitiza correctamente todos los casos
- Ataques de path traversal si `fileId` se usa en rutas de archivo
- Bypass de autorización accediendo a archivos de otros usuarios

**Evidencia en código**:
```12:35:apps/api/src/routes/aum.ts
const fileId = req.params.fileId;
const dbi = db();
const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
```

#### Problema: Validación de body ausente
```typescript
// ❌ VULNERABLE: No valida estructura del body
router.post('/uploads/:fileId/match', requireAuth, async (req, res) => {
  const { rowId, matchedContactId, matchedUserId } = req.body as {
    rowId: string;
    matchedContactId?: string | null;
    matchedUserId?: string | null;
  };
  // No valida UUIDs, puede ser cualquier string
});
```

**Comparación con rutas seguras**:
```12:36:apps/api/src/routes/contacts.ts
const createContactSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  assignedAdvisorId: z.string().uuid().optional().nullable(),
  // ...
});
```

### 2. **AUTORIZACIÓN INSUFICIENTE - CRÍTICO** ⚠️⚠️⚠️

#### Problema: Falta verificación de ownership
```typescript
// ❌ VULNERABLE: Cualquier usuario autenticado puede ver/editar cualquier archivo
router.get('/uploads/:fileId/preview', requireAuth, async (req, res) => {
  // No verifica que el archivo pertenezca al usuario o su equipo
  const [file] = await dbi.select().from(aumImportFiles)...
});
```

**Riesgo**: 
- Usuarios pueden acceder a importaciones de otros usuarios
- Fuga de datos entre equipos/asesores
- Modificación de archivos ajenos

**Solución necesaria** (como en `contacts.ts`):
- Verificar `uploadedByUserId` o acceso por equipo
- Implementar RBAC similar a otras rutas del sistema

### 3. **SANITIZACIÓN DE ARCHIVOS - ALTO** ⚠️⚠️

#### Problema: Validación de tipo MIME insuficiente
```typescript
// ⚠️ Solo confía en mimetype del cliente
const file = (req as any).file as Express.Multer.File | undefined;
if (!file) return res.status(400).json({ error: 'No file uploaded' });
// No valida extensión real vs contenido real
```

**Riesgo**:
- **Zip bombs**: Archivos maliciosos con compresión extrema
- **Polyglot files**: Archivos que se leen como Excel pero contienen código ejecutable
- **Path traversal**: Nombres de archivo con `../` pueden escribir fuera del directorio

**Evidencia**:
```212:221:apps/api/src/routes/aum.ts
const file = (req as any).file as Express.Multer.File | undefined;
if (!file) {
  return res.status(400).json({ error: 'No file uploaded' });
}

const broker = (req.query.broker as string) || 'balanz';
```

### 4. **MANEJO DE ERRORES EXPONE INFORMACIÓN** ⚠️⚠️

#### Problema: Stack traces en producción
```typescript
// ⚠️ Expone mensajes de error detallados
catch (error) {
  return res.status(500).json({ 
    error: error instanceof Error ? error.message : String(error) 
  });
}
```

**Riesgo**: Revela estructura de base de datos, paths de archivos, nombres de tablas

**Comparación con patrón seguro**:
```297:302:apps/api/src/index.ts
res.status(500).json({
  error: 'Internal server error',
  requestId: (req as any).requestId,
  message: !isProduction ? err.message : undefined,
  stack: !isProduction ? err.stack : undefined
});
```

### 5. **SQL RAW SIN SANITIZACIÓN COMPLETA** ⚠️⚠️

#### Problema: Uso de `sql` template literal
```typescript
// ⚠️ Aunque Drizzle usa prepared statements, mejor evitar raw SQL
const res = await dbi.execute(sql`SELECT contact_id FROM broker_accounts WHERE broker = ${broker} AND account_number = ${r.accountNumber} LIMIT 1`);
```

**Riesgo**: Aunque Drizzle sanitiza, no hay validación previa de formato de `accountNumber` o `broker`

---

## ⚠️ Problemas de Mejores Prácticas

### 1. **Falta de Validación con Zod**
- ❌ No hay schemas de validación como en otras rutas
- ❌ No valida UUIDs antes de usar en queries
- ❌ No valida formatos (broker, status, matchStatus)

### 2. **Falta de RBAC Granular**
- ❌ Solo `requireAuth`, no `requireRole(['admin', 'manager'])`
- ❌ No verifica ownership de archivos
- ❌ Todos los usuarios pueden importar/commitear

### 3. **Uso de `any` Type**
```typescript
// ❌ Type safety perdido
rows.forEach((r: any) => { ... });
const rows = await dbi.select().from(aumImportRows)...
// Debería usar tipos de Drizzle
```

### 4. **Manejo de Archivos en Filesystem**
- ⚠️ Archivos guardados en `apps/api/uploads` sin rotación
- ⚠️ No hay límite de espacio en disco
- ⚠️ No hay limpieza automática de archivos antiguos
- ⚠️ Comentario indica "mover a S3 en el futuro" pero sin plan

### 5. **Falta de Rate Limiting**
- ❌ No hay límite de requests por usuario/minuto
- ❌ Vulnerable a DoS por uploads masivos
- Otras rutas como `tags.ts` tienen rate limiting

### 6. **Logging Inconsistente**
```typescript
// ✅ Bueno (algunos lugares)
(req as any).log?.error?.({ err: error }, 'AUM upload failed');

// ❌ Malo (otros lugares)
catch (error) {
  return res.status(500).json({ error: ... });
  // No loguea el error
}
```

### 7. **Frontend Sin Validación**
```typescript
// ❌ Frontend no valida UUIDs antes de enviar
<input value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="contactId" />
// Usuario puede escribir cualquier cosa
```

### 8. **Falta de Tests**
- ❌ No hay tests unitarios para `aum.ts`
- ❌ No hay tests e2e para flujo de importación
- Otras rutas tienen tests (`tags.spec.ts`, `contacts-tags.e2e.test.ts`)

### 9. **CSV Parsing Vulnerable**
```typescript
// ⚠️ CSV parsing manual es frágil
const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
// No maneja:
// - Campos con comas internas correctamente citados
// - Encoding diferente (UTF-8 BOM, Latin1)
// - Líneas multilinea en campos
```

---

## 🔧 Patrones de Mejora Identificados

### Patrón 1: Validación con Zod (Como en `contacts.ts`)
```typescript
// ✅ PATRÓN CORRECTO
const matchRowSchema = z.object({
  rowId: z.string().uuid('rowId must be a valid UUID'),
  matchedContactId: z.string().uuid().optional().nullable(),
  matchedUserId: z.string().uuid().optional().nullable()
});

router.post('/uploads/:fileId/match', requireAuth, async (req, res) => {
  try {
    const fileId = z.string().uuid().parse(req.params.fileId);
    const validated = matchRowSchema.parse(req.body);
    // ...
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    next(err);
  }
});
```

### Patrón 2: RBAC y Ownership Check
```typescript
// ✅ PATRÓN CORRECTO
router.get('/uploads/:fileId/preview', requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  
  // Verificar ownership o acceso por equipo
  const [file] = await dbi.select().from(aumImportFiles)
    .where(and(
      eq(aumImportFiles.id, fileId),
      // Solo admin/manager puede ver todos, advisor solo los suyos
      userRole === 'admin' ? sql`1=1` : eq(aumImportFiles.uploadedByUserId, userId)
    ))
    .limit(1);
  
  if (!file) return res.status(404).json({ error: 'File not found or access denied' });
  // ...
});
```

### Patrón 3: Validación de Archivos
```typescript
// ✅ PATRÓN CORRECTO
import { fileTypeFromBuffer } from 'file-type';
import XLSX from 'xlsx';

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv'
];

router.post('/uploads', requireAuth, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  
  // Validar tipo real del archivo
  const buffer = await fs.readFile(file.path);
  const fileType = await fileTypeFromBuffer(buffer);
  
  if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    await fs.unlink(file.path); // Limpiar archivo inválido
    return res.status(400).json({ error: 'Invalid file type' });
  }
  
  // Validar tamaño (ya existe, pero mejor documentarlo)
  if (file.size > 25 * 1024 * 1024) {
    await fs.unlink(file.path);
    return res.status(400).json({ error: 'File too large' });
  }
  
  // ...
});
```

### Patrón 4: Error Handling Seguro
```typescript
// ✅ PATRÓN CORRECTO
catch (error) {
  req.log.error({ 
    err: error, 
    fileId,
    userId: req.user?.id 
  }, 'AUM operation failed');
  
  // No exponer detalles en producción
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error instanceof Error ? error.message : String(error);
    
  return res.status(500).json({ 
    error: message,
    requestId: (req as any).requestId 
  });
}
```

### Patrón 5: Type Safety
```typescript
// ✅ PATRÓN CORRECTO
import type { InferSelectModel } from 'drizzle-orm';
import { aumImportRows } from '@cactus/db';

type AumImportRow = InferSelectModel<typeof aumImportRows>;

// En lugar de `any[]`
const rows: AumImportRow[] = await dbi.select().from(aumImportRows)...
```

---

## 📊 Checklist de Seguridad Pre-Producción

### Crítico (Bloqueante)
- [ ] Validar todos los UUIDs con Zod antes de queries
- [ ] Implementar verificación de ownership de archivos
- [ ] Agregar `requireRole(['admin', 'manager'])` donde corresponda
- [ ] Validar tipo real de archivo (no solo extensión)
- [ ] Ocultar mensajes de error detallados en producción
- [ ] Agregar rate limiting en uploads

### Alto (Recomendado)
- [ ] Schemas Zod para todos los endpoints
- [ ] Tests unitarios y e2e
- [ ] Limpieza automática de archivos antiguos
- [ ] Rotación de logs de archivos
- [ ] Límite de espacio en disco
- [ ] Validación robusta de CSV (usar librería)

### Medio (Mejora continua)
- [ ] Eliminar uso de `any` type
- [ ] Logging consistente en todos los endpoints
- [ ] Documentación de límites y restricciones
- [ ] Validación de frontend antes de submit
- [ ] Plan de migración a S3/object storage

---

## 🎯 Recomendaciones Prioritarias

### Prioridad 1 (Inmediato - Bloqueante)
1. **Agregar validación Zod** para todos los parámetros y bodies
2. **Implementar ownership checks** antes de cualquier operación
3. **Agregar RBAC granular** con `requireRole` según permisos necesarios
4. **Validar tipo real de archivo** antes de procesar

### Prioridad 2 (Esta semana)
5. **Mejorar error handling** para no exponer detalles en producción
6. **Agregar rate limiting** en endpoints de upload
7. **Escribir tests básicos** para endpoints críticos

### Prioridad 3 (Próximo sprint)
8. **Eliminar `any` types** y mejorar type safety
9. **Implementar limpieza automática** de archivos antiguos
10. **Mejorar CSV parsing** con librería robusta

---

## 📝 Comparación con Estándar del Proyecto

| Aspecto | Otras Rutas (contacts.ts) | AUM Routes | Estado |
|---------|--------------------------|------------|--------|
| Validación Zod | ✅ Completa | ❌ Ausente | **CRÍTICO** |
| RBAC | ✅ Con ownership | ❌ Solo auth | **CRÍTICO** |
| UUID validation | ✅ Validado | ❌ Directo | **CRÍTICO** |
| Error handling | ✅ Seguro | ⚠️ Expone detalles | **ALTO** |
| Logging | ✅ Consistente | ⚠️ Inconsistente | **MEDIO** |
| Tests | ✅ Presentes | ❌ Ausentes | **ALTO** |
| Type safety | ✅ Tipos completos | ⚠️ Muchos `any` | **MEDIO** |

---

## 🔒 Conclusión

**Estado Actual**: ⚠️ **MVP funcional pero NO seguro para producción**

**Recomendación**: **NO DESPLEGAR** sin corregir los ítems críticos de seguridad. El código tiene buena estructura base, pero necesita al menos 2-3 días de trabajo enfocado en seguridad antes de considerar producción.

**Estimación de corrección**:
- **Crítico**: 4-6 horas
- **Alto**: 6-8 horas  
- **Medio**: 4-6 horas
- **Total**: ~16-20 horas de desarrollo + testing

