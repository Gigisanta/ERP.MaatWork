# 🔍 Google Calendar - Troubleshooting Guide

## Estado Actual

✅ Google Client Secret actualizado: `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`  
✅ Logging detallado agregado al widget  
✅ Sistema de conexión OAuth funcional

## Pasos para Verificar que Todo Funcione

### 1. Reiniciar el servidor API

El archivo `.env` fue modificado, necesitas reiniciar el servidor:

```bash
# Detener todos los procesos
Ctrl+C en la terminal donde corre pnpm dev

# Reiniciar
pnpm dev
```

### 2. Limpiar el estado del navegador

```bash
# Opción A: Hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Opción B: Abrir DevTools Console y ejecutar:
localStorage.clear()
window.location.reload()
```

### 3. Probar la Conexión

1. **Ir a `/profile`**
2. **Buscar sección "Integraciones"** → "Google Calendar"
3. **Click en "Conectar"** (o "Desconectar" y volver a "Conectar")
4. **Autorizar en Google** → Permitir todos los permisos
5. **Volver a la app** → Deberías ver "Conectado"

### 4. Verificar en `/home`

1. **Navegar a `/home`**
2. **Abrir DevTools Console** (F12)
3. **Buscar logs** que empiecen con `[PersonalCalendarWidget]`

#### ✅ Si Funciona Correctamente

Deberías ver en la consola:

```
[PersonalCalendarWidget] Component state { hasUser: true, userId: "...", isConnected: true, userFullObject: {...} }
[useCalendarEvents] Fetching calendar events { url: "...", ... }
[useCalendarEvents] Calendar events fetched successfully { eventCount: 5, userId: "..." }
```

Y en el widget de calendario:
- **Header**: "Mi Calendario" con botón "Actualizar"
- **Contenido**: Lista de eventos O "No tienes eventos para los próximos 7 días"

#### ❌ Si NO Funciona

##### Caso 1: `isConnected: false` en la consola

**Problema**: El estado del usuario no se actualizó después de la conexión.

**Solución**:
```javascript
// En DevTools Console, ejecutar:
window.location.href = '/home'
```

Si después de recargar sigue siendo `false`, el problema está en el backend. Verificar:

```bash
# En la terminal del API, buscar:
"isGoogleConnected":true
```

Si ves `"isGoogleConnected":true` en los logs del API pero `false` en el frontend, hay un problema de sincronización.

##### Caso 2: Error 401/400 al cargar eventos

**Problema**: Los tokens OAuth no están funcionando.

**Solución**:
1. Desconectar Google Calendar en `/profile`
2. Volver a conectar
3. Verificar que el `GOOGLE_CLIENT_SECRET` en `apps/api/.env` sea correcto

##### Caso 3: No se muestra nada (widget vacío)

**Problema**: El componente no se está renderizando.

**Solución**:
```bash
# Verificar que no hay errores de compilación
pnpm -F @maatwork/web typecheck

# Reiniciar el servidor web
pnpm -F @maatwork/web dev
```

### 5. Verificar Manualmente el Endpoint

Si el widget no funciona, prueba el endpoint directamente:

```bash
# En una nueva terminal:
# 1. Obtener tu JWT token desde DevTools:
# - Ir a Application → Cookies → localhost:3000 → token
# - Copiar el valor

# 2. Hacer request al endpoint:
curl -H "Cookie: token=TU_TOKEN_AQUI" \
  "http://localhost:3001/v1/calendar/personal/events?timeMin=2024-12-16T00:00:00Z&maxResults=5"
```

**Respuestas esperadas**:

✅ **Éxito (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "summary": "Evento de ejemplo",
      "start": { "dateTime": "2024-12-16T10:00:00Z" },
      ...
    }
  ]
}
```

❌ **Error 401** - No conectado:
```json
{
  "error": "Google Calendar not connected",
  "code": "GOOGLE_NOT_CONNECTED"
}
```

❌ **Error 401** - Token expirado:
```json
{
  "error": "Your Google Calendar connection has expired",
  "code": "GOOGLE_RECONNECT_REQUIRED"
}
```

### 6. Verificar Base de Datos

Si nada funciona, verificar que los tokens estén en la base de datos:

```bash
# Conectarse a PostgreSQL
psql -h localhost -p 5433 -U postgres -d CRM

# Verificar tokens:
SELECT id, "userId", email, "expiresAt", "calendarSyncEnabled" 
FROM google_oauth_tokens 
WHERE "userId" = 'TU_USER_ID';

# Si no hay registros, el OAuth no se guardó correctamente
# Si el expiresAt es pasado, el token expiró
```

## Logs Importantes a Buscar

### En el Backend (Terminal del API):

```
✅ Conexión exitosa:
INFO: Google OAuth tokens updated
INFO: Google OAuth login successful, redirecting
INFO: isGoogleConnected":true

✅ Fetch de eventos exitoso:
INFO: Personal calendar events fetched

❌ Error de conexión:
ERROR: Failed to refresh Google token
WARN: Token marked as invalid, user must reconnect
```

### En el Frontend (DevTools Console):

```
✅ Estado correcto:
[PersonalCalendarWidget] Component state { isConnected: true }
[useCalendarEvents] Fetching calendar events
[useCalendarEvents] Calendar events fetched successfully

❌ Estado incorrecto:
[PersonalCalendarWidget] Component state { isConnected: false }
[useCalendarEvents] No se hace fetch (porque isConnected es false)
```

## Problemas Conocidos y Soluciones

### Problema: "Conectado" en `/profile` pero "Conectar en Perfil" en `/home`

**Causa**: El estado del usuario en `/home` no se actualizó después de la conexión.

**Solución**:
1. Hacer hard refresh en `/home` (Ctrl+Shift+R)
2. O navegar a otra página y volver a `/home`
3. O ejecutar en Console: `window.location.href = '/home'`

### Problema: Eventos no aparecen pero no hay error

**Causa**: No tienes eventos en tu Google Calendar en los próximos 7 días.

**Verificación**:
1. Ir a https://calendar.google.com
2. Crear un evento para hoy o mañana
3. Volver a la app y hacer click en "Actualizar"

### Problema: Error "Google Calendar API request timed out"

**Causa**: Google API tardó más de 10 segundos en responder.

**Solución**:
1. Click en "Reintentar"
2. Si persiste, verificar conexión a internet
3. Si persiste, Google API podría estar con problemas

## Variables de Entorno Requeridas

Verificar que existan en `apps/api/.env`:

```env
GOOGLE_CLIENT_ID=641908288178-937m4kvthd9m6jh59n3dg561bira535l.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=http://localhost:3001/v1/auth/google/callback
GOOGLE_ENCRYPTION_KEY=99e998c952441e3abd3fd0d9729ec73a0af3e7c35e1abf969b3f77787d0fd5eb
FRONTEND_URL=http://localhost:3000
```

## Script de Verificación Automática

```bash
pnpm tsx apps/api/src/scripts/verify-google-oauth-env.ts
```

Debería mostrar:
```
✅ [REQUIRED] GOOGLE_CLIENT_ID
✅ [REQUIRED] GOOGLE_CLIENT_SECRET
✅ [REQUIRED] GOOGLE_REDIRECT_URI
✅ [REQUIRED] GOOGLE_ENCRYPTION_KEY
✅ [REQUIRED] FRONTEND_URL
```

## Contacto y Ayuda

Si nada de esto funciona:

1. **Capturar logs**: 
   - Terminal del API (últimas 50 líneas)
   - DevTools Console (todo lo de `[PersonalCalendarWidget]` y `[useCalendarEvents]`)
2. **Capturar screenshots**:
   - `/profile` mostrando el estado de conexión
   - `/home` mostrando el widget
3. **Enviar información** para debugging avanzado

---

**Última actualización**: 2024-12-16  
**Versión**: 1.0.1

