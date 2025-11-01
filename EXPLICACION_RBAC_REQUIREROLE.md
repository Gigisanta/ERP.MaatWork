# RBAC Granular con `requireRole` - Explicación Completa

## ¿Qué es RBAC?

**RBAC** (Role-Based Access Control) = Control de Acceso Basado en Roles

Es un sistema de seguridad que **asigna permisos a roles** en lugar de a usuarios individuales. Los usuarios tienen roles, y los roles tienen permisos.

---

## Diferencia: `requireAuth` vs `requireRole`

### 1. `requireAuth` - Autenticación Básica

```typescript
router.get('/mi-endpoint', requireAuth, async (req, res) => {
  // Cualquier usuario autenticado puede acceder
  // No importa si es admin, manager o advisor
});
```

**Qué hace:**
- ✅ Verifica que el usuario tenga un token válido
- ✅ Verifica que el token no esté expirado
- ❌ **NO verifica qué rol tiene el usuario**

**Ejemplo del código:**
```21:27:apps/api/src/auth/middlewares.ts
export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
```

### 2. `requireRole` - Autorización Granular

```typescript
router.post('/users', requireAuth, requireRole(['admin']), async (req, res) => {
  // Solo usuarios con rol 'admin' pueden acceder
  // Manager y advisor recibirán 403 Forbidden
});
```

**Qué hace:**
- ✅ Verifica que el usuario esté autenticado (depende de `requireAuth`)
- ✅ Verifica que el usuario tenga uno de los roles permitidos
- ❌ Rechaza con `403 Forbidden` si el rol no está permitido

---

## ¿Qué es "RBAC Granular"?

**Granular** = Específico, detallado, preciso

En lugar de "todo o nada", defines permisos **por operación específica**:

### ❌ RBAC NO Granular (Binario)
```typescript
// Opción 1: Todos pueden hacerlo
router.delete('/contacts/:id', requireAuth, ...);

// Opción 2: Nadie puede hacerlo
router.delete('/contacts/:id', requireAuth, requireRole(['admin', 'manager', 'advisor']), ...);
```

### ✅ RBAC Granular (Específico)
```typescript
// Solo admins y managers pueden eliminar contactos
router.delete('/contacts/:id', requireAuth, requireRole(['admin', 'manager']), ...);

// Solo admins pueden crear usuarios
router.post('/users', requireAuth, requireRole(['admin']), ...);

// Todos los autenticados pueden ver contactos
router.get('/contacts', requireAuth, ...);
```

---

## Roles en el Sistema

El proyecto tiene **3 roles principales**:

```typescript
type UserRole = 'admin' | 'manager' | 'advisor';
```

### 1. **Admin**
- ✅ Acceso completo a todo
- ✅ Puede crear/editar/eliminar usuarios
- ✅ Puede ver todos los datos sin restricciones
- ✅ Puede modificar configuraciones del sistema

### 2. **Manager**
- ✅ Puede ver datos de su equipo
- ✅ Puede asignar contactos a asesores de su equipo
- ❌ No puede crear usuarios
- ❌ No puede ver datos de otros equipos

### 3. **Advisor**
- ✅ Puede ver solo sus propios contactos
- ✅ Puede crear/modificar contactos asignados a él
- ❌ No puede ver contactos de otros asesores
- ❌ No puede ver datos agregados del equipo

---

## Ejemplos Reales del Código

### Ejemplo 1: Crear Usuarios (Solo Admin)

```28:28:apps/api/src/routes/users.ts
router.post('/', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
```

**Explicación:**
- Solo usuarios con rol `'admin'` pueden crear nuevos usuarios
- Si un `manager` o `advisor` intenta crear un usuario → `403 Forbidden`

### Ejemplo 2: Listar Usuarios (Admin y Manager)

```18:18:apps/api/src/routes/users.ts
router.get('/', requireAuth, requireRole(['manager', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
```

**Explicación:**
- `admin` y `manager` pueden ver la lista de usuarios
- `advisor` NO puede ver la lista → `403 Forbidden`

### Ejemplo 3: Ver Contactos (Todos los Autenticados)

```50:50:apps/api/src/routes/contacts.ts
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
```

**Explicación:**
- Cualquier usuario autenticado puede listar contactos
- **PERO** los datos que ve están filtrados por su rol:
  - `admin`: ve todos
  - `manager`: ve contactos de su equipo
  - `advisor`: ve solo sus contactos
- Esto es **ownership + RBAC** trabajando juntos

### Ejemplo 4: Eliminar Contactos (Solo Admin y Manager)

```738:738:apps/api/src/routes/contacts.ts
router.delete('/:id', requireAuth, requireRole(['manager', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
```

**Explicación:**
- Solo `admin` y `manager` pueden eliminar contactos
- `advisor` NO puede eliminar → `403 Forbidden`

---

## ¿Por Qué es Importante para AUM?

### ❌ Problema Actual en AUM

```typescript
// Todas las rutas AUM solo usan requireAuth
router.post('/uploads/:fileId/commit', requireAuth, async (req, res) => {
  // ⚠️ CUALQUIER usuario autenticado puede commitear importaciones
  // ⚠️ Incluso un advisor puede modificar datos críticos de AUM
});
```

**Riesgos:**
- Un `advisor` podría commitear importaciones masivas sin supervisión
- No hay control sobre quién puede hacer operaciones críticas
- Difícil auditoría de quién hizo qué

### ✅ Solución con RBAC Granular

```typescript
// Solo admins y managers pueden commitear (operación crítica)
router.post('/uploads/:fileId/commit', 
  requireAuth, 
  requireRole(['admin', 'manager']), 
  async (req, res) => {
    // ✅ Solo usuarios autorizados pueden hacer commits
    // ✅ Advisors pueden ver preview pero no commitear
  }
);

// Todos pueden subir archivos (operación normal)
router.post('/uploads', 
  requireAuth,  // Sin requireRole - todos pueden subir
  async (req, res) => {
    // ✅ Cualquier usuario puede subir su archivo
  }
);

// Solo admins pueden eliminar importaciones (operación destructiva)
router.delete('/uploads/:fileId', 
  requireAuth, 
  requireRole(['admin']),  // Solo admin
  async (req, res) => {
    // ✅ Solo admin puede eliminar importaciones
  }
);
```

---

## Patrón de Uso Correcto

### Estructura de Middleware

```typescript
router.METHOD('/ruta',
  requireAuth,              // 1. Primero autenticación
  requireRole(['rol1', 'rol2']), // 2. Luego autorización
  async (req, res) => {     // 3. Finalmente la lógica
    // ...
  }
);
```

**Orden IMPORTANTE:**
1. ✅ `requireAuth` primero (verifica token)
2. ✅ `requireRole` segundo (verifica rol)
3. ✅ Lógica del endpoint al final

### Combinaciones Comunes

```typescript
// Operación pública - Solo autenticación
router.get('/public', requireAuth, ...);

// Operación para roles específicos
router.post('/admin-only', requireAuth, requireRole(['admin']), ...);

// Operación para múltiples roles
router.put('/manager-or-admin', 
  requireAuth, 
  requireRole(['manager', 'admin']), 
  ...
);

// Operación para todos excepto algunos roles
// (No hay soporte directo, se hace manualmente en la lógica)
router.delete('/not-advisor', 
  requireAuth, 
  requireRole(['admin', 'manager']),  // Todos excepto advisor
  ...
);
```

---

## Matriz de Permisos Sugerida para AUM

| Endpoint | Admin | Manager | Advisor | Justificación |
|----------|-------|---------|---------|---------------|
| `POST /uploads` | ✅ | ✅ | ✅ | Todos pueden subir sus archivos |
| `GET /uploads/history` | ✅ | ✅ | ✅ | Ver historial (filtrado por ownership) |
| `GET /uploads/:fileId/preview` | ✅ | ✅ | ✅ | Ver preview (filtrado por ownership) |
| `GET /uploads/:fileId/export` | ✅ | ✅ | ✅ | Exportar (filtrado por ownership) |
| `POST /uploads/:fileId/match` | ✅ | ✅ | ✅ | Matching manual (filtrado por ownership) |
| `POST /uploads/:fileId/commit` | ✅ | ✅ | ❌ | **Crítico**: Solo managers+ pueden commitear |
| `DELETE /uploads/:fileId` | ✅ | ❌ | ❌ | **Destructivo**: Solo admin puede eliminar |

---

## Código de Ejemplo Completo

### Antes (Inseguro)

```typescript
// ❌ Sin RBAC - cualquier usuario puede commitear
router.post('/uploads/:fileId/commit', requireAuth, async (req, res) => {
  // Lógica de commit
});
```

### Después (Seguro)

```typescript
// ✅ Con RBAC - solo managers y admins pueden commitear
router.post('/uploads/:fileId/commit', 
  requireAuth,                           // 1. Verificar autenticación
  requireRole(['admin', 'manager']),    // 2. Verificar rol
  async (req, res) => {
    // Verificar ownership también (ya implementado)
    const hasAccess = await canAccessAumFile(userId, userRole, fileId);
    if (!hasAccess) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Lógica de commit
  }
);
```

---

## Errores HTTP Devueltos

| Escenario | Código | Mensaje |
|-----------|--------|---------|
| Sin token | `401` | "Unauthorized" |
| Token inválido/expirado | `401` | "Unauthorized" |
| Token válido pero rol incorrecto | `403` | "Forbidden" |
| Token válido, rol correcto | `200/201` | Respuesta exitosa |

**Importante:** 
- `401` = "No estás autenticado"
- `403` = "Estás autenticado pero no tienes permisos"

---

## Resumen

### RBAC Granular es:
- ✅ **Específico**: Permisos diferentes por operación
- ✅ **Seguro**: Previene accesos no autorizados
- ✅ **Auditable**: Sabes quién puede hacer qué
- ✅ **Mantenible**: Fácil agregar/quitar permisos

### `requireRole` es:
- Un middleware que verifica el rol del usuario
- Se usa después de `requireAuth`
- Recibe un array de roles permitidos
- Rechaza con `403` si el rol no está en la lista

### Para AUM:
- Necesitas agregar `requireRole` a operaciones críticas como `commit`
- Combinar con ownership checks (ya implementado)
- Diferentes permisos para diferentes operaciones

