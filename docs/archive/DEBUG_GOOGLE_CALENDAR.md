# 🐛 Debug Google Calendar - Script Paso a Paso

## ¿Qué cambios se hicieron?

### 1. ✅ Google Client Secret Actualizado
- Archivo: `apps/api/.env`
- Valor: `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`

### 2. ✅ Revalidación Automática del Usuario
- **Archivo**: `apps/web/app/components/home/PersonalCalendarWidget.tsx`
- **Cambio**: Cuando el componente se monta en `/home`, ahora llama automáticamente a `mutateUser()` para obtener el estado más reciente del usuario
- **Impacto**: Asegura que el widget siempre tenga el estado actualizado de conexión de Google

### 3. ✅ Logging Mejorado
- **Archivos modificados**:
  - `apps/web/app/components/home/PersonalCalendarWidget.tsx`
  - `apps/web/app/auth/AuthContext.tsx`
- **Cambio**: Agregado logging detallado para debuggear problemas de conexión
- **Impacto**: Puedes ver exactamente qué está pasando en la consola del navegador

---

## 🚀 PASOS PARA PROBAR (IMPORTANTE - SEGUIR EN ORDEN)

### Paso 1: Reiniciar el Servidor API
**CRÍTICO**: El archivo `.env` cambió, DEBES reiniciar:

```bash
# En la terminal donde corre pnpm dev:
# 1. Presiona Ctrl+C para detener
# 2. Luego ejecuta:
pnpm dev
```

**¿Por qué?** El servidor lee las variables de entorno al iniciar. Si no reinicias, seguirá usando el Client Secret anterior.

### Paso 2: Limpiar Caché del Navegador
**Opción A - Hard Refresh**:
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

**Opción B - Limpiar Storage**:
1. Abre DevTools (F12)
2. Ve a Console
3. Ejecuta:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Paso 3: Desconectar y Reconectar Google Calendar

1. **Ve a `/profile`**
2. **Abre DevTools Console (F12)**
3. **Si ya está conectado**:
   - Click en "Desconectar"
   - Espera a que aparezca el botón "Conectar"
4. **Click en "Conectar"**
5. **Autoriza en Google** (permitir todos los permisos)
6. **Deberías volver a `/profile`** con:
   - Un toast verde: "Cuenta de Google conectada correctamente"
   - El botón debería decir "Desconectar"

**En la consola del navegador deberías ver**:
```
[AuthContext] mutateUser called - Refrescando datos de usuario
[AuthContext] mutateUser result { success: true, hasUser: true, isGoogleConnected: true, ... }
[AuthContext] Updating user state with new data { userId: "...", isGoogleConnected: true, changed: true }
```

### Paso 4: Ir a `/home` y Verificar

1. **Navega a `/home`**
2. **Mantén DevTools Console abierta (F12)**

**En la consola deberías ver (EN ORDEN)**:

```
1️⃣ [PersonalCalendarWidget] Component mounted, refreshing user state
2️⃣ [PersonalCalendarWidget] Component state { hasUser: true, isConnected: false, ... }
3️⃣ [AuthContext] mutateUser called - Refrescando datos de usuario
4️⃣ [AuthContext] mutateUser result { success: true, hasUser: true, isGoogleConnected: true, ... }
5️⃣ [AuthContext] Updating user state with new data { isGoogleConnected: true, changed: true }
6️⃣ [PersonalCalendarWidget] Component state { hasUser: true, isConnected: true, ... }
7️⃣ [useCalendarEvents] Fetching calendar events { url: "...", ... }
8️⃣ [useCalendarEvents] Calendar events fetched successfully { eventCount: X }
```

**El widget debería mostrar**:
- Header: "Mi Calendario" con botón "Actualizar"
- Contenido: Lista de tus eventos (o "No tienes eventos para los próximos 7 días")

---

## 🔍 Diagnóstico si NO Funciona

### Si en `/profile` NO dice "Desconectar"

**Problema**: El backend no guardó la conexión.

**Verificar en logs del API**:
```
✅ Debería aparecer:
INFO: Google OAuth tokens updated { userId: "...", ... }
INFO: Google OAuth login successful, redirecting

❌ Si NO aparece:
- Hay un error en el OAuth callback
- El Client Secret es incorrecto
- El redirect URI no coincide
```

**Solución**:
1. Verificar que `apps/api/.env` tenga:
   ```
   GOOGLE_CLIENT_SECRET=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
   ```
2. Reiniciar el servidor API (Ctrl+C y `pnpm dev`)
3. Intentar conectar de nuevo

### Si en `/home` sigue mostrando "Conecta tu Google Calendar"

**Caso A: No ves logs de `[PersonalCalendarWidget]` o `[AuthContext]`**

**Problema**: El logging no está habilitado o hay un error de compilación.

**Solución**:
1. Verificar que no hay errores de compilación en la terminal de `@maatwork/web`
2. Hacer hard refresh (Ctrl+Shift+R)
3. Verificar que estés en la pestaña "Console" de DevTools (no "Network" ni otros)

**Caso B: Ves logs pero `isConnected: false`**

**Problema**: El backend NO está retornando `isGoogleConnected: true`.

**Logs esperados en el backend**:
```
Busca en la terminal del API:
INFO: Checked Google connection status { userId: "...", isGoogleConnected: true }
```

**Si ves `isGoogleConnected: false`**:
- El token NO está en la base de datos
- Verificar ejecutando:
  ```bash
  psql -h localhost -p 5433 -U postgres -d CRM
  SELECT "userId", email, "expiresAt" FROM google_oauth_tokens;
  ```

**Caso C: Ves logs con `isConnected: true` pero no aparecen eventos**

**Problema**: El fetch de eventos está fallando.

**Buscar en consola**:
```
❌ [useCalendarEvents] Error fetching calendar events { error: "...", status: 401 }
```

**Posibles causas**:
- Token expirado (necesita reconectar)
- Permisos insuficientes en Google
- No tienes eventos en los próximos 7 días (crear uno en https://calendar.google.com para probar)

---

## 🛠️ Script de Debug Manual

Si nada funciona, ejecuta esto en la consola del navegador (DevTools Console) cuando estés en `/home`:

```javascript
// 1. Verificar estado del contexto de autenticación
(async () => {
  console.log('=== DEBUG: Estado del usuario ===');
  
  // Verificar que el fetch funcione manualmente
  const response = await fetch('http://localhost:3001/v1/auth/me', {
    credentials: 'include',
    cache: 'no-store'
  });
  
  const data = await response.json();
  console.log('Response from /auth/me:', data);
  console.log('isGoogleConnected:', data.user?.isGoogleConnected);
  
  // Intentar fetch de eventos
  if (data.user?.isGoogleConnected) {
    console.log('\n=== DEBUG: Intentando fetch de eventos ===');
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eventsUrl = `http://localhost:3001/v1/calendar/personal/events?timeMin=${now.toISOString()}&timeMax=${nextWeek.toISOString()}&maxResults=5`;
    
    const eventsResponse = await fetch(eventsUrl, {
      credentials: 'include'
    });
    
    const eventsData = await eventsResponse.json();
    console.log('Response from /calendar/personal/events:', eventsData);
    
    if (eventsData.success && eventsData.data) {
      console.log(`✅ Eventos obtenidos: ${eventsData.data.length}`);
      eventsData.data.forEach((event, i) => {
        console.log(`${i+1}. ${event.summary} - ${event.start?.dateTime || event.start?.date}`);
      });
    } else {
      console.error('❌ Error al obtener eventos:', eventsData);
    }
  } else {
    console.warn('⚠️ Google Calendar NO está conectado según el backend');
  }
})();
```

**Interpretación de resultados**:

✅ **Si todo funciona**:
```
Response from /auth/me: { user: { id: "...", isGoogleConnected: true, ... } }
isGoogleConnected: true
Response from /calendar/personal/events: { success: true, data: [...] }
✅ Eventos obtenidos: 3
1. Reunión de equipo - 2024-12-17T10:00:00Z
2. Almuerzo - 2024-12-17T13:00:00Z
3. Presentación - 2024-12-18T15:00:00Z
```
→ **El backend funciona**, el problema es en el componente React

❌ **Si `isGoogleConnected: false`**:
```
Response from /auth/me: { user: { id: "...", isGoogleConnected: false, ... } }
isGoogleConnected: false
⚠️ Google Calendar NO está conectado según el backend
```
→ **El backend NO tiene el token guardado**, necesitas reconectar

❌ **Si hay error 401 en eventos**:
```
Response from /calendar/personal/events: { error: "Google Calendar not connected", code: "GOOGLE_NOT_CONNECTED" }
```
→ **Token expiró o no existe**, reconectar

---

## 📝 Información a Proporcionar si Sigue Fallando

Si después de seguir todos los pasos aún no funciona, necesito:

### 1. Logs del Backend
**Última parte de la terminal del API (últimas 50 líneas)**:
```bash
# Copiar desde donde dice:
INFO: Iniciando OAuth2 con Google
INFO: Google OAuth tokens updated
INFO: Checked Google connection status { isGoogleConnected: true/false }
```

### 2. Logs del Frontend
**Console completa de DevTools** (desde que navegas a `/home`):
```
[PersonalCalendarWidget] Component mounted, refreshing user state
[AuthContext] mutateUser called...
[useCalendarEvents] Fetching...
```

### 3. Resultado del Script de Debug
**Output completo del script JavaScript** que está arriba

### 4. Screenshots
- `/profile` mostrando el estado de conexión
- `/home` mostrando el widget de calendario
- DevTools Console completa

---

**Última actualización**: 2024-12-16 16:10  
**Versión**: 2.0.0

