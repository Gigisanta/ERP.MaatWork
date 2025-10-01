# 🔐 Reglas de Seguridad - CRM Profesional

## Principios de Seguridad

**REGLA FUNDAMENTAL:** Este es un CRM que maneja datos sensibles de clientes. La seguridad NO es opcional.

### Datos Sensibles que Manejamos
- 📧 Emails de clientes
- 📞 Teléfonos personales
- 💼 Información comercial
- 💰 Valores de deals/oportunidades
- 📝 Notas privadas sobre clientes
- 👥 Información de equipo y permisos

**REGLA:** Cada feature nueva debe pasar un checklist de seguridad antes de merge.

## 1. Row Level Security (RLS) - OBLIGATORIO

### Regla de Oro de RLS

**REGLA:** TODAS las tablas que contienen datos de usuarios DEBEN tener RLS habilitado.

```sql
-- ✅ SIEMPRE hacer esto PRIMERO
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;

-- ❌ NUNCA hacer esto
ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;
```

### Template de Políticas RLS

**Para tablas de datos de usuarios:**

```sql
-- Template estándar para tabla con user_id
CREATE POLICY "Users can view own records"
  ON tabla_name FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own records"
  ON tabla_name FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own records"
  ON tabla_name FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own records"
  ON tabla_name FOR DELETE
  USING (user_id = auth.uid());
```

**Para managers que ven datos de su equipo:**

```sql
-- Managers pueden ver datos de su equipo
CREATE POLICY "Managers can view team records"
  ON contacts FOR SELECT
  USING (
    user_id = auth.uid()  -- Sus propios contactos
    OR 
    user_id IN (          -- O contactos de su equipo
      SELECT id FROM users 
      WHERE team_id = (
        SELECT team_id FROM users WHERE id = auth.uid()
      )
      AND team_id IS NOT NULL
    )
  );
```

**Para admins:**

```sql
-- Admins pueden ver todo (pero con RLS activo)
CREATE POLICY "Admins can view all records"
  ON contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );
```

### Checklist RLS por Tabla

**REGLA:** Antes de crear una nueva tabla, completar este checklist:

- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` ejecutado
- [ ] Política de SELECT creada
- [ ] Política de INSERT creada
- [ ] Política de UPDATE creada
- [ ] Política de DELETE creada
- [ ] Probado con usuario real (no service role)
- [ ] Probado con diferentes roles (admin, manager, advisor)
- [ ] Verificado que NO se pueden ver datos de otros usuarios

### Testing de RLS

```sql
-- Script de verificación de RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = false;  -- ¡NO debe retornar tablas con datos sensibles!
```

**REGLA:** Ejecutar este script antes de cada deploy a producción.

## 2. Autenticación y Autorización

### Tokens JWT

**REGLA:** NUNCA almacenar JWT en localStorage sin expiración.

```typescript
// ❌ MAL: Token permanente
localStorage.setItem('token', jwt);

// ✅ BIEN: Con manejo de sesión
const session = await supabase.auth.getSession();
// Supabase maneja el refresh automáticamente
```

### Middleware de Autenticación

**REGLA:** TODAS las rutas de API (excepto login/register) deben validar autenticación.

```typescript
// apps/api/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '@cactus/database';

export const requireAuth = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      error: 'No autorizado',
      code: 'NO_TOKEN' 
    });
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ 
      error: 'Token inválido',
      code: 'INVALID_TOKEN' 
    });
  }
  
  // Verificar que el usuario está aprobado
  const { data: userData } = await supabase
    .from('users')
    .select('is_approved, role')
    .eq('id', user.id)
    .single();
  
  if (!userData?.is_approved) {
    return res.status(403).json({ 
      error: 'Usuario no aprobado',
      code: 'USER_NOT_APPROVED' 
    });
  }
  
  req.user = { ...user, ...userData };
  next();
};
```

### Middleware de Roles

**REGLA:** Endpoints sensibles deben validar roles.

```typescript
// apps/api/middleware/auth.ts
export const requireRole = (...allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'No autenticado',
        code: 'NOT_AUTHENTICATED' 
      });
    }
    
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        error: 'Permiso denegado',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: user.role
      });
    }
    
    next();
  };
};

// Uso:
router.get('/admin/users', 
  requireAuth, 
  requireRole('admin'),  // Solo admins
  getUsers
);

router.get('/team/metrics', 
  requireAuth,
  requireRole('admin', 'manager'),  // Admins y managers
  getTeamMetrics
);
```

## 3. Validación de Datos

### Input Validation

**REGLA:** NUNCA confiar en datos del cliente. Validar en backend.

```typescript
// ❌ MAL: Sin validación
router.post('/contacts', async (req, res) => {
  const contact = await supabase.from('contacts').insert(req.body);
  res.json(contact);
});

// ✅ BIEN: Con validación
import { z } from 'zod';

const ContactSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  status: z.enum(['Prospecto', 'Cliente', 'Inactivo', 'En Negociación']),
  tags: z.array(z.string()).max(10)
});

router.post('/contacts', requireAuth, async (req, res) => {
  try {
    // Validar input
    const validatedData = ContactSchema.parse(req.body);
    
    // Asegurar que user_id es el del usuario autenticado
    const contact = await supabase
      .from('contacts')
      .insert({
        ...validatedData,
        user_id: req.user.id  // ← Forzar user_id del token
      })
      .select()
      .single();
    
    res.json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Datos inválidos',
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Error interno' });
  }
});
```

### SQL Injection Prevention

**REGLA:** SIEMPRE usar parámetros, NUNCA concatenar SQL.

```typescript
// ❌ PELIGRO: SQL Injection
const { data } = await supabase.rpc('search_contacts', {
  query: `SELECT * FROM contacts WHERE name LIKE '%${searchTerm}%'`
});

// ✅ SEGURO: Parámetros
const { data } = await supabase
  .from('contacts')
  .select('*')
  .ilike('name', `%${searchTerm}%`);  // Supabase escapa automáticamente
```

### XSS Prevention

**REGLA:** Sanitizar datos antes de renderizar HTML.

```typescript
// ❌ MAL: HTML sin sanitizar
<div dangerouslySetInnerHTML={{ __html: userNote }} />

// ✅ BIEN: Texto escapado
<div>{userNote}</div>

// ✅ BIEN: Si necesitas HTML, sanitizar
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(userNote) 
}} />
```

## 4. Protección de APIs

### Rate Limiting

**REGLA:** Implementar rate limiting en endpoints públicos.

```typescript
// apps/api/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: 'Demasiados intentos de login. Intenta en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Uso:
router.post('/login', authLimiter, loginHandler);
```

### CORS Configuration

**REGLA:** CORS solo para dominios específicos en producción.

```typescript
// apps/api/app.ts
import cors from 'cors';

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://cactus-dashboard.vercel.app',
        'https://tu-dominio.com'
      ]
    : 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### Headers de Seguridad

**REGLA:** Headers de seguridad configurados en `vercel.json`.

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co"
        }
      ]
    }
  ]
}
```

## 5. Logging y Auditoría

### Logging de Acciones Críticas

**REGLA:** Logear todas las operaciones sensibles.

```typescript
// Tabla de auditoría
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,  -- 'contact_created', 'user_deleted', etc.
  entity_type VARCHAR(50),        -- 'contact', 'deal', 'user'
  entity_id UUID,
  changes JSONB,                  -- Datos antes/después
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS: Solo admins pueden ver logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**Función de logging:**

```typescript
// packages/shared/utils/audit.ts
export const auditLog = async (params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}) => {
  await supabase.from('audit_logs').insert({
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    changes: params.changes,
    ip_address: params.ipAddress,
    user_agent: params.userAgent
  });
};

// Uso en backend:
router.delete('/contacts/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  
  // Obtener datos antes de eliminar
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();
  
  // Eliminar
  await supabase.from('contacts').delete().eq('id', id);
  
  // Auditar
  await auditLog({
    userId: req.user.id,
    action: 'contact_deleted',
    entityType: 'contact',
    entityId: id,
    changes: { before: contact, after: null },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  res.json({ success: true });
});
```

### Acciones que DEBEN auditarse:
- ✅ Login/Logout
- ✅ Cambios de contraseña
- ✅ Cambios de rol
- ✅ Aprobación/rechazo de usuarios
- ✅ Eliminación de contactos/deals
- ✅ Cambios en configuración del sistema
- ✅ Exportación masiva de datos

## 6. Protección de Datos Sensibles

### Encriptación en Reposo

**REGLA:** Datos muy sensibles deben encriptarse en la DB.

```sql
-- Habilitar extensión de encriptación
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Columna encriptada
ALTER TABLE users 
ADD COLUMN encrypted_ssn TEXT;  -- Ejemplo: número de seguridad social

-- Insertar encriptado
INSERT INTO users (email, encrypted_ssn)
VALUES (
  'user@example.com',
  pgp_sym_encrypt('123-45-6789', 'encryption_key_from_env')
);

-- Leer desencriptado (solo con clave correcta)
SELECT 
  email,
  pgp_sym_decrypt(encrypted_ssn::bytea, 'encryption_key_from_env') as ssn
FROM users;
```

### Datos Personales - GDPR Compliance

**REGLA:** Implementar derecho al olvido y exportación de datos.

```typescript
// Endpoint para eliminar todos los datos de un usuario
router.delete('/gdpr/delete-my-data', requireAuth, async (req, res) => {
  const userId = req.user.id;
  
  // Transacción para eliminar todo
  const { error } = await supabase.rpc('delete_user_data', {
    user_id: userId
  });
  
  if (error) throw error;
  
  // Auditar
  await auditLog({
    userId,
    action: 'gdpr_data_deletion',
    entityType: 'user',
    entityId: userId
  });
  
  res.json({ success: true });
});

// Función SQL para eliminar datos
CREATE OR REPLACE FUNCTION delete_user_data(user_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM notes WHERE user_id = user_id;
  DELETE FROM tasks WHERE user_id = user_id OR assigned_to = user_id;
  DELETE FROM deals WHERE user_id = user_id;
  DELETE FROM contacts WHERE user_id = user_id;
  DELETE FROM users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 7. Manejo de Errores Seguro

### NO Exponer Información Sensible

**REGLA:** Errores en producción deben ser genéricos.

```typescript
// ❌ MAL: Expone estructura de DB
catch (error) {
  res.status(500).json({ 
    error: error.message  // "relation 'users' does not exist"
  });
}

// ✅ BIEN: Error genérico + logging interno
catch (error) {
  console.error('[CRITICAL] Database error:', error);
  
  // Enviar a servicio de logging (Sentry, etc.)
  if (process.env.NODE_ENV === 'production') {
    // sentry.captureException(error);
  }
  
  res.status(500).json({ 
    error: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
    // NO incluir error.message en producción
    ...(process.env.NODE_ENV === 'development' && { 
      debug: error.message 
    })
  });
}
```

## Security Checklist Pre-Deploy

**REGLA:** Antes de cada deploy, verificar:

### Base de Datos
- [ ] RLS habilitado en todas las tablas
- [ ] Políticas de RLS probadas con usuarios reales
- [ ] Sin datos de prueba en producción
- [ ] Backups automáticos configurados
- [ ] Índices creados para queries frecuentes

### API
- [ ] Rate limiting configurado
- [ ] CORS solo con dominios específicos
- [ ] Headers de seguridad configurados
- [ ] Validación de input en todas las rutas
- [ ] Autenticación en rutas protegidas
- [ ] Logging de acciones críticas

### Frontend
- [ ] Variables de entorno sin secrets
- [ ] XSS prevention implementado
- [ ] HTTPS forzado en producción
- [ ] Tokens manejados correctamente
- [ ] Sin console.logs con datos sensibles

### General
- [ ] Dependencias actualizadas (npm audit)
- [ ] Variables de entorno documentadas
- [ ] Secretos rotados si fueron comprometidos
- [ ] Testing de permisos por rol

---

**REGLA CRÍTICA:** La seguridad es RESPONSABILIDAD DE TODOS. Si ves código inseguro, crear un issue inmediatamente.

**Última actualización:** Octubre 2025

