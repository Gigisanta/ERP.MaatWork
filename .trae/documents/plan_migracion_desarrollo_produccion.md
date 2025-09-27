# Plan de Migración: Desarrollo a Producción - CRM Cactus Dashboard

## 1. Análisis de Persistencia Actual

### 1.1 Datos en localStorage vs Supabase
**Estado Actual:**
- ✅ **Contactos CRM**: Persistidos en Supabase con RLS por usuario
- ✅ **Etiquetas personalizadas**: Tabla `contact_tags` en Supabase
- ✅ **Usuarios y autenticación**: Supabase Auth + tabla `users`
- ✅ **Equipos y roles**: Tablas `teams` y `team_members`
- ⚠️ **Configuraciones UI**: Algunas en localStorage (tema, preferencias)
- ✅ **Métricas históricas**: Tablas dedicadas en Supabase

### 1.2 Configuraciones Hardcodeadas vs Variables de Entorno
**Verificar:**
- Variables de Supabase en `.env.local`
- URLs de API hardcodeadas
- Configuraciones de colores Cactus
- Límites y configuraciones de negocio

### 1.3 Migraciones de Base de Datos
**Estado:**
- ✅ Tabla `contacts` con campos completos
- ✅ Tabla `contact_tags` para etiquetas personalizadas
- ✅ Políticas RLS configuradas
- ✅ Índices optimizados
- ✅ Triggers de auditoría

## 2. Configuración de Producción

### 2.1 Variables de Entorno Críticas

**Desarrollo (.env.local):**
```env
VITE_SUPABASE_URL=https://pphrkrtjxwjvxokcwhjz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_ENV=development
```

**Producción (Vercel):**
```env
VITE_SUPABASE_URL=https://pphrkrtjxwjvxokcwhjz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_ENV=production
```

### 2.2 Configuración de Supabase para Producción
- ✅ **RLS habilitado** en todas las tablas críticas
- ✅ **Políticas por usuario** implementadas
- ✅ **Auth configurado** con email/password
- ⚠️ **SMTP configurado** para emails de confirmación
- ✅ **Permisos de API** configurados correctamente

### 2.3 Políticas RLS y Permisos
```sql
-- Contactos: solo ver/editar propios
CREATE POLICY "contacts_own_access" ON contacts
  FOR ALL TO authenticated
  USING (assigned_to = auth.uid());

-- Etiquetas: por usuario
CREATE POLICY "tags_own_access" ON contact_tags
  FOR ALL TO authenticated
  USING (user_id = auth.uid());
```

## 3. Migración de Datos

### 3.1 Contactos del CRM y Etiquetas
**Verificación Pre-Migración:**
1. Backup de datos actuales en Supabase
2. Verificar integridad de contactos por usuario
3. Confirmar etiquetas personalizadas guardadas
4. Validar colores Cactus aplicados

**Script de Verificación:**
```sql
-- Contar contactos por usuario
SELECT assigned_to, COUNT(*) as total_contacts 
FROM contacts 
GROUP BY assigned_to;

-- Verificar etiquetas personalizadas
SELECT user_id, COUNT(*) as total_tags 
FROM contact_tags 
GROUP BY user_id;
```

### 3.2 Usuarios y Equipos
**Estado Actual:**
- Usuarios registrados en `auth.users` y `public.users`
- Equipos y asignaciones en tablas dedicadas
- Roles y permisos configurados

### 3.3 Métricas Históricas
**Tablas a Verificar:**
- `monthly_conversion_metrics`
- `historical_metrics`
- `contact_status_history`

## 4. Verificación de Funcionalidades

### 4.1 Sistema de Autenticación
**Checklist:**
- [ ] Login con email/password funciona
- [ ] Registro de nuevos usuarios
- [ ] Recuperación de contraseña
- [ ] Persistencia de sesión
- [ ] Logout correcto

### 4.2 Persistencia de Contactos por Usuario
**Checklist:**
- [ ] Crear contacto se guarda en Supabase
- [ ] Solo ver contactos propios
- [ ] Editar contacto persiste cambios
- [ ] Eliminar contacto funciona
- [ ] Filtros por estado funcionan

### 4.3 Sistema de Etiquetas y Colores Cactus
**Checklist:**
- [ ] Crear etiqueta personalizada
- [ ] Asignar etiqueta a contacto
- [ ] Colores Cactus aplicados correctamente
- [ ] Etiquetas persisten al recargar
- [ ] Filtrar por etiquetas funciona

### 4.4 Métricas en Tiempo Real
**Checklist:**
- [ ] Dashboard muestra métricas actuales
- [ ] Gráficos se actualizan automáticamente
- [ ] Métricas por usuario correctas
- [ ] Exportación de datos funciona

## 5. Checklist de Despliegue

### 5.1 Pre-Despliegue
**Preparación:**
- [ ] Backup completo de base de datos Supabase
- [ ] Verificar todas las migraciones aplicadas
- [ ] Confirmar variables de entorno configuradas
- [ ] Probar build de producción localmente

```bash
# Build local de producción
npm run build
npm run preview
```

### 5.2 Configuración en Vercel
**Variables de Entorno:**
1. Ir a Vercel Dashboard → Proyecto → Settings → Environment Variables
2. Agregar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_ENV=production`

**Configuración de Build:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

### 5.3 Despliegue
**Pasos:**
1. Push a rama main/master
2. Vercel auto-deploy activado
3. Verificar build exitoso
4. Probar URL de producción

### 5.4 Verificación Post-Despliegue
**Checklist Crítico:**
- [ ] **Login funciona** en producción
- [ ] **Contactos se cargan** correctamente
- [ ] **Crear contacto** se guarda en Supabase
- [ ] **Etiquetas persisten** al recargar
- [ ] **Colores Cactus** aplicados correctamente
- [ ] **Métricas se muestran** sin errores
- [ ] **Responsive** funciona en móvil
- [ ] **Performance** aceptable (< 3s carga inicial)

## 6. Rollback Plan

### 6.1 En Caso de Problemas
**Acciones Inmediatas:**
1. Revertir deployment en Vercel
2. Verificar logs de errores
3. Restaurar backup de base de datos si necesario
4. Comunicar a usuarios sobre mantenimiento

### 6.2 Monitoreo Post-Despliegue
**Primeras 24 horas:**
- Monitorear errores en Vercel Analytics
- Verificar logs de Supabase
- Confirmar que usuarios pueden acceder
- Validar que no hay pérdida de datos

## 7. Optimizaciones de Producción

### 7.1 Performance
- [ ] Lazy loading de componentes
- [ ] Optimización de imágenes
- [ ] Compresión de assets
- [ ] CDN configurado (Vercel automático)

### 7.2 SEO y Accesibilidad
- [ ] Meta tags configurados
- [ ] Favicon actualizado
- [ ] Accesibilidad básica implementada

### 7.3 Monitoreo
- [ ] Error tracking configurado
- [ ] Analytics de uso
- [ ] Métricas de performance

## 8. Contactos de Emergencia

**En caso de problemas críticos:**
- Desarrollador Principal: [Contacto]
- Admin Supabase: [Acceso]
- Vercel Account: [Acceso]

---

**Fecha de Creación:** $(date)
**Última Actualización:** $(date)
**Estado:** ✅ Listo para Ejecución

**Tiempo Estimado de Migración:** 2-4 horas
**Downtime Esperado:** 0 minutos (despliegue sin interrupciones)