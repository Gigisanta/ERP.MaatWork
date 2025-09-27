# README - Notion CRM Integration

## 📋 Resumen

Este documento describe cómo configurar y usar la integración de Notion CRM en CactusDashboard. La funcionalidad permite embeber páginas de Notion directamente en el dashboard, proporcionando acceso seamless a workspaces de Notion personalizados por usuario.

## 🚀 Configuración Rápida

### 1. Variables de Entorno

Agregar al archivo `.env.local`:

```bash
# Notion CRM - URL de fallback (REQUERIDO)
NOTION_CRM_FALLBACK_URL="https://giolivosantarelli.notion.site/ebd/27296d1d68a3800e9860d8d8bc746181"

# Funcionalidad PRO - OAuth (OPCIONAL)
NOTION_CLIENT_ID=""
NOTION_CLIENT_SECRET=""
NOTION_REDIRECT_URI="https://tu-dominio.vercel.app/api/notion/oauth/callback"
ENCRYPTION_KEY="" # 32 caracteres aleatorios para cifrar tokens
```

### 2. Ejecutar Migración de Base de Datos

```bash
# Aplicar migración para crear tabla notion_pages_map
npx supabase db push

# O ejecutar manualmente la migración SQL
psql -h your-supabase-host -d postgres -f supabase/migrations/create_notion_pages_map.sql
```

### 3. Desplegar Cambios

```bash
# Desarrollo
npm run dev

# Producción
npm run build
vercel --prod
```

## 🔧 Configuración Detallada

### URL de Fallback

La `NOTION_CRM_FALLBACK_URL` es la página de Notion que se mostrará por defecto cuando:
- Un usuario no tiene una URL personalizada configurada
- Hay errores al obtener la configuración del usuario
- El sistema OAuth no está configurado

**URL Ejemplo Proporcionada:**
```
https://giolivosantarelli.notion.site/ebd/27296d1d68a3800e9860d8d8bc746181
```

### Configuración OAuth de Notion (PRO)

Para habilitar URLs personalizadas por usuario:

1. **Crear Notion App:**
   - Ir a https://www.notion.so/my-integrations
   - Crear nueva integración
   - Copiar Client ID y Client Secret

2. **Configurar Redirect URI:**
   ```
   https://tu-dominio.vercel.app/api/notion/oauth/callback
   ```

3. **Generar Encryption Key:**
   ```bash
   # Generar clave de 32 caracteres
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## 📊 Gestión de Usuarios

### Mapear Usuario a URL Personalizada

```sql
-- Insertar URL personalizada para un usuario
INSERT INTO notion_pages_map (user_id, notion_page_url, notion_page_id)
VALUES (
  'uuid-del-usuario',
  'https://workspace.notion.site/pagina-personalizada',
  'page-id-opcional'
);

-- Actualizar URL existente
UPDATE notion_pages_map 
SET notion_page_url = 'https://nueva-url.notion.site/pagina'
WHERE user_id = 'uuid-del-usuario';

-- Ver configuraciones existentes
SELECT u.email, npm.notion_page_url, npm.updated_at
FROM auth.users u
LEFT JOIN notion_pages_map npm ON u.id = npm.user_id
ORDER BY npm.updated_at DESC;
```

### Script de Configuración Masiva

Crear archivo `scripts/setup_notion_users.js`:

```javascript
const { supabase } = require('../src/lib/supabase');

const userNotionMappings = [
  {
    email: 'usuario1@empresa.com',
    notionUrl: 'https://workspace.notion.site/usuario1-page'
  },
  {
    email: 'usuario2@empresa.com', 
    notionUrl: 'https://workspace.notion.site/usuario2-page'
  }
];

async function setupNotionUsers() {
  for (const mapping of userNotionMappings) {
    try {
      // Buscar usuario por email
      const { data: user } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', mapping.email)
        .single();

      if (user) {
        // Insertar o actualizar mapping
        await supabase
          .from('notion_pages_map')
          .upsert({
            user_id: user.id,
            notion_page_url: mapping.notionUrl,
            updated_at: new Date().toISOString()
          });
        
        console.log(`✅ Configurado: ${mapping.email}`);
      } else {
        console.log(`❌ Usuario no encontrado: ${mapping.email}`);
      }
    } catch (error) {
      console.error(`Error configurando ${mapping.email}:`, error);
    }
  }
}

setupNotionUsers();
```

## 🎯 Flujos de Usuario

### Flujo Básico (Sin OAuth)

1. Usuario hace click en "Notion CRM" en sidebar
2. Sistema carga página `/notion-crm`
3. Se consulta API `/api/notion/me` para URL personalizada
4. Si no existe, se usa `NOTION_CRM_FALLBACK_URL`
5. Se renderiza iframe con la URL correspondiente

### Flujo con OAuth (PRO)

1. Usuario sin configuración ve banner "Conectar con Notion"
2. Click en "Conectar" redirige a `/api/notion/oauth/start`
3. Sistema redirige a OAuth de Notion
4. Usuario autoriza la aplicación en Notion
5. Notion redirige a `/api/notion/oauth/callback`
6. Sistema guarda token y detecta páginas del usuario
7. Usuario es redirigido a `/notion-crm` con su configuración personalizada

## 🔒 Seguridad

### Content Security Policy

El sistema configura automáticamente CSP headers para permitir embeds de Notion:

```
frame-src 'self' https://*.notion.site https://*.notion.so;
```

### Row Level Security (RLS)

La tabla `notion_pages_map` tiene políticas RLS que garantizan:
- Usuarios solo pueden ver sus propias configuraciones
- No hay acceso cruzado entre usuarios
- Tokens están cifrados con `ENCRYPTION_KEY`

### Validaciones

- URLs de Notion se validan con regex antes de guardar
- Tokens de autenticación se verifican en cada request
- State parameter previene ataques CSRF en OAuth

## 🐛 Troubleshooting

### iFrame No Carga

**Síntoma:** Pantalla en blanco o error de carga

**Soluciones:**
1. Verificar que la URL de Notion es pública
2. Comprobar CSP headers en Network tab
3. Revisar console por errores X-Frame-Options
4. Probar URL directamente en nueva pestaña

```javascript
// Debug en console del navegador
console.log('Notion URL:', document.querySelector('iframe').src);
console.log('CSP Headers:', document.querySelector('meta[http-equiv="Content-Security-Policy"]'));
```

### API Errors

**Error 404 en `/api/notion/me`:**
- Usuario no tiene URL configurada (comportamiento normal)
- Usar fallback URL o mostrar banner OAuth

**Error 401 en APIs:**
- Token de Supabase expirado o inválido
- Usuario debe hacer login nuevamente

**Error 500 en OAuth:**
- Verificar `NOTION_CLIENT_ID` y `NOTION_CLIENT_SECRET`
- Comprobar `NOTION_REDIRECT_URI` coincide con app de Notion
- Revisar logs del servidor

### Base de Datos

**Tabla no existe:**
```bash
# Verificar migración aplicada
supabase db diff

# Aplicar migración manualmente
supabase db push
```

**RLS Policies:**
```sql
-- Verificar políticas activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'notion_pages_map';

-- Verificar RLS habilitado
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'notion_pages_map';
```

## 📈 Monitoreo

### Métricas Importantes

1. **Uso de iFrame:** Usuarios que cargan exitosamente Notion
2. **Fallback Rate:** % de usuarios que ven fallback vs iframe
3. **OAuth Conversions:** Usuarios que completan setup OAuth
4. **Error Rate:** Errores de API y carga de iframe

### Logs Útiles

```javascript
// En NotionCRM.tsx - agregar para monitoreo
const trackNotionCRMEvent = (event, data) => {
  console.log(`[NotionCRM] ${event}:`, data);
  // Integrar con analytics (Google Analytics, Mixpanel, etc.)
};

// Eventos a trackear:
trackNotionCRMEvent('iframe_loaded', { url: notionUrl });
trackNotionCRMEvent('fallback_shown', { reason: 'iframe_blocked' });
trackNotionCRMEvent('oauth_started', { userId });
trackNotionCRMEvent('oauth_completed', { userId, hasCustomUrl: true });
```

## 🚀 Despliegue en Producción

### Variables de Entorno en Vercel

```bash
# Configurar en Vercel Dashboard > Settings > Environment Variables
NOTION_CRM_FALLBACK_URL=https://giolivosantarelli.notion.site/ebd/27296d1d68a3800e9860d8d8bc746181
NOTION_CLIENT_ID=notion_client_id_aqui
NOTION_CLIENT_SECRET=notion_client_secret_aqui  
NOTION_REDIRECT_URI=https://tu-dominio.vercel.app/api/notion/oauth/callback
ENCRYPTION_KEY=clave_de_32_caracteres_aqui
```

### Checklist de Deploy

- [ ] Variables de entorno configuradas
- [ ] Migración de DB aplicada
- [ ] CSP headers configurados en `vercel.json`
- [ ] URL de fallback funciona correctamente
- [ ] OAuth app configurada en Notion (si aplica)
- [ ] Tests de carga de iframe ejecutados
- [ ] Monitoreo y logs configurados

## 📞 Soporte

Para problemas o preguntas:

1. **Revisar logs:** Console del navegador y logs del servidor
2. **Verificar configuración:** Variables de entorno y DB
3. **Probar manualmente:** URLs de Notion en navegador
4. **Consultar documentación:** Notion API docs para OAuth

---

**Última actualización:** Enero 2024  
**Versión:** 1.0.0  
**Compatibilidad:** React 18+ | Su