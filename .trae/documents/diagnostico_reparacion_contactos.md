# Diagnóstico y Reparación Crítica - Error de Creación de Contactos

## 1. Resumen del Problema

**Error Principal:** `insert or update on table "contacts" violates foreign key constraint "contacts_user_id_fkey"`

**Causa Raíz:** El user_id que se intenta usar para crear contactos no existe en la tabla `users`, violando la restricción de clave foránea.

**Impacto:** Imposibilidad total de crear contactos en el sistema CRM, afectando funcionalidad core del negocio.

## 2. Diagnóstico Completo

### 2.1 Análisis del Error
- **Código de Error:** 23503 (PostgreSQL Foreign Key Violation)
- **Tabla Afectada:** `contacts`
- **Constraint:** `contacts_user_id_fkey`
- **Campo:** `user_id`

### 2.2 Posibles Causas
1. **Usuario no autenticado correctamente** - El session user_id no corresponde a un registro válido
2. **Problema de sincronización** - Usuario eliminado de `users` pero session activa
3. **Error en políticas RLS** - Restricciones impiden ver el usuario actual
4. **Problema de autenticación Supabase** - Token inválido o expirado
5. **Corrupción de datos** - Inconsistencia entre auth.users y public.users

## 3. Verificaciones de Estructura de Base de Datos

### 3.1 Verificar Tabla Users
```sql
-- Verificar estructura de tabla users
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public';

-- Verificar registros existentes
SELECT id, email, created_at, updated_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 10;
```

### 3.2 Verificar Tabla Contacts
```sql
-- Verificar estructura de tabla contacts
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'contacts' AND table_schema = 'public';

-- Verificar constraint de foreign key
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'contacts';
```

### 3.3 Verificar Sincronización Auth
```sql
-- Verificar usuarios en auth vs public
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    pu.id as public_id,
    pu.email as public_email,
    CASE 
        WHEN pu.id IS NULL THEN 'MISSING_IN_PUBLIC'
        WHEN au.id IS NULL THEN 'MISSING_IN_AUTH'
        ELSE 'SYNCED'
    END as status
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id = pu.id
WHERE au.id IS NULL OR pu.id IS NULL;
```

## 4. Análisis de Políticas RLS

### 4.1 Verificar Estado RLS
```sql
-- Verificar si RLS está habilitado
SELECT schemaname, tablename, rowsecurity, hasrls
FROM pg_tables 
WHERE tablename IN ('users', 'contacts') 
    AND schemaname = 'public';

-- Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('users', 'contacts');
```

### 4.2 Verificar Permisos de Roles
```sql
-- Verificar permisos en tabla users
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'users' AND table_schema = 'public';

-- Verificar permisos en tabla contacts
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'contacts' AND table_schema = 'public';
```

## 5. Plan de Reparación Paso a Paso

### Fase 1: Diagnóstico Inmediato
1. **Verificar usuario actual**
   ```sql
   SELECT auth.uid(), auth.email();
   ```

2. **Verificar existencia en public.users**
   ```sql
   SELECT * FROM public.users WHERE id = auth.uid();
   ```

3. **Verificar session activa**
   ```sql
   SELECT * FROM auth.sessions WHERE user_id = auth.uid() AND expires_at > now();
   ```

### Fase 2: Reparación de Datos
1. **Crear usuario faltante si no existe**
   ```sql
   INSERT INTO public.users (id, email, created_at, updated_at)
   SELECT 
       au.id,
       au.email,
       au.created_at,
       now()
   FROM auth.users au
   LEFT JOIN public.users pu ON au.id = pu.id
   WHERE pu.id IS NULL AND au.id = auth.uid();
   ```

2. **Verificar y reparar políticas RLS**
   ```sql
   -- Política para tabla users
   DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
   CREATE POLICY "Users can view own profile" ON public.users
       FOR ALL USING (auth.uid() = id);
   
   -- Política para tabla contacts
   DROP POLICY IF EXISTS "Users can manage own contacts" ON public.contacts;
   CREATE POLICY "Users can manage own contacts" ON public.contacts
       FOR ALL USING (auth.uid() = user_id);
   ```

### Fase 3: Verificación de Permisos
1. **Otorgar permisos básicos**
   ```sql
   -- Permisos para authenticated users
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
   
   -- Permisos para anon (solo lectura limitada si es necesario)
   GRANT SELECT ON public.users TO anon;
   ```

2. **Habilitar RLS**
   ```sql
   ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
   ```

## 6. Verificaciones de Integridad Post-Reparación

### 6.1 Test de Creación de Usuario
```sql
-- Test: Verificar que el usuario actual existe
SELECT 
    'USER_EXISTS' as test_name,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid()) 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as result;
```

### 6.2 Test de Políticas RLS
```sql
-- Test: Verificar acceso a usuarios
SELECT 
    'USER_ACCESS' as test_name,
    CASE 
        WHEN EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid()) 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as result;
```

### 6.3 Test de Creación de Contacto
```sql
-- Test: Intentar crear contacto de prueba
INSERT INTO public.contacts (user_id, name, email, phone)
VALUES (auth.uid(), 'Test Contact', 'test@example.com', '123456789')
RETURNING id, name, 'CONTACT_CREATION_SUCCESS' as test_result;
```

## 7. Procedimientos de Testing

### 7.1 Test Automatizado Frontend
```javascript
// Test de autenticación y creación de contacto
const testContactCreation = async () => {
  try {
    // 1. Verificar usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Usuario autenticado:', user?.id);
    
    // 2. Verificar usuario en public.users
    const { data: publicUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    console.log('Usuario en public.users:', publicUser);
    
    // 3. Intentar crear contacto
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        user_id: user.id,
        name: 'Test Contact',
        email: 'test@example.com',
        phone: '123456789'
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creando contacto:', error);
      return false;
    }
    
    console.log('Contacto creado exitosamente:', contact);
    
    // 4. Limpiar contacto de prueba
    await supabase.from('contacts').delete().eq('id', contact.id);
    
    return true;
  } catch (error) {
    console.error('Error en test:', error);
    return false;
  }
};
```

### 7.2 Validación de Producción
1. **Test de carga de usuarios**
2. **Test de creación masiva de contactos**
3. **Test de políticas RLS bajo diferentes roles**
4. **Test de performance de queries con foreign keys**

## 8. Monitoreo Continuo

### 8.1 Queries de Monitoreo
```sql
-- Monitorear errores de foreign key
SELECT 
    count(*) as error_count,
    date_trunc('hour', created_at) as hour
FROM logs 
WHERE message LIKE '%foreign key constraint%'
GROUP BY date_trunc('hour', created_at)
ORDER BY hour DESC;

-- Monitorear usuarios sin sincronizar
SELECT count(*) as unsynced_users
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

### 8.2 Alertas Recomendadas
- Error rate > 5% en creación de contactos
- Usuarios no sincronizados > 0
- Tiempo de respuesta > 2s en queries de contactos

## 9. Prevención Futura

### 9.1 Trigger de Sincronización
```sql
-- Trigger para auto-crear usuario en public.users
CREATE OR REPLACE FUNCTION sync_user_to_public()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.created_at, now())
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_user_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_to_public();
```

### 9.2 Validaciones Frontend
```javascript
// Validación antes de crear contacto
const validateUserBeforeContact = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuario no autenticado');
  }
  
  const { data: publicUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();
    
  if (!publicUser) {
    // Auto-crear usuario si no existe
    await supabase.from('users').insert({
      id: user.id,
      email: user.email
    });
  }
  
  return user.id;
};
```

## 10. Checklist de Implementación

- [ ] Ejecutar diagnóstico completo de BD
- [ ] Verificar sincronización auth.users ↔ public.users
- [ ] Reparar políticas RLS
- [ ] Otorgar permisos correctos
- [ ] Ejecutar tests de integridad
- [ ] Implementar trigger de sincronización
- [ ] Configurar monitoreo
- [ ] Validar en producción
- [ ] Documentar procedimientos de emergencia

---

**Prioridad:** CRÍTICA  
**Tiempo Estimado:** 2-4 horas  
**Riesgo:** ALTO si no se resuelve inmediatamente  
**Impacto en Negocio:** Funcionalidad CRM completamente bloqueada