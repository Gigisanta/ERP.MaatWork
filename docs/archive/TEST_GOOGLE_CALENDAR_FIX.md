# ✅ Google Calendar - Fix Aplicado - Script de Verificación

## 🎯 Problema Identificado y Resuelto

### El Problema
El endpoint `/v1/auth/me` retornaba:
```json
{
  "success": true,
  "data": {
    "user": { ..., "isGoogleConnected": true }  // ← Usuario dentro de "user"
  }
}
```

Pero el frontend buscaba `data.user`, cuando en realidad estaba en `data.data.user`.

### La Solución
**Backend** (`apps/api/src/routes/auth/handlers/session.ts`):
- Cambió para retornar el usuario directamente sin envolverlo en `{ user: ... }`
- Ahora retorna: `{ success: true, data: { id, email, isGoogleConnected, ... } }`

**Frontend** (`apps/web/lib/auth/session-manager.ts`):
- Cambió de buscar `data.user` a `data.data`
- Ahora parsea correctamente la respuesta del backend

---

## 🚀 PASOS PARA VERIFICAR EL FIX

### Paso 1: Reiniciar el Servidor API (YA HECHO)
El servidor ya debería estar reiniciado con los cambios.

### Paso 2: Ejecutar Script de Verificación en DevTools

Abre la consola del navegador (F12) en `/home` y ejecuta:

```javascript
(async () => {
  console.log('=== VERIFICACIÓN DE FIX GOOGLE CALENDAR ===\n');
  
  // 1. Verificar endpoint /auth/me (el que se arregló)
  console.log('1️⃣ Verificando /auth/me (endpoint arreglado)...');
  const authResponse = await fetch('http://localhost:3001/v1/auth/me', {
    credentials: 'include',
    cache: 'no-store'
  });
  const authData = await authResponse.json();
  
  console.log('Estructura de respuesta:', authData);
  console.log('✅ data.data existe:', !!authData.data);
  console.log('✅ data.data.id:', authData.data?.id);
  console.log('✅ data.data.isGoogleConnected:', authData.data?.isGoogleConnected);
  
  if (authData.data?.isGoogleConnected === true) {
    console.log('\n✅ ¡ÉXITO! isGoogleConnected está correctamente en data.data');
  } else if (authData.data?.isGoogleConnected === false) {
    console.warn('\n⚠️ isGoogleConnected es false - necesitas conectar Google Calendar en /profile');
  } else {
    console.error('\n❌ ERROR: isGoogleConnected no está presente en la respuesta');
  }
  
  // 2. Verificar endpoint /users/me (endpoint de perfil)
  console.log('\n2️⃣ Verificando /users/me (endpoint de perfil)...');
  const usersResponse = await fetch('http://localhost:3001/v1/users/me', {
    credentials: 'include',
    cache: 'no-store'
  });
  const usersData = await usersResponse.json();
  
  console.log('Estructura de respuesta:', usersData);
  console.log('✅ data.data existe:', !!usersData.data);
  console.log('✅ data.data.isGoogleConnected:', usersData.data?.isGoogleConnected);
  
  // 3. Si está conectado, intentar fetch de eventos
  if (authData.data?.isGoogleConnected) {
    console.log('\n3️⃣ Google Calendar conectado, intentando fetch de eventos...');
    
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eventsUrl = `http://localhost:3001/v1/calendar/personal/events?timeMin=${now.toISOString()}&timeMax=${nextWeek.toISOString()}&maxResults=5`;
    
    try {
      const eventsResponse = await fetch(eventsUrl, {
        credentials: 'include'
      });
      
      const eventsData = await eventsResponse.json();
      
      if (eventsData.success && eventsData.data) {
        console.log(`✅ Eventos obtenidos exitosamente: ${eventsData.data.length}`);
        
        if (eventsData.data.length > 0) {
          console.log('\nPrimeros eventos:');
          eventsData.data.slice(0, 3).forEach((event, i) => {
            console.log(`  ${i+1}. ${event.summary} - ${event.start?.dateTime || event.start?.date}`);
          });
        } else {
          console.log('ℹ️ No tienes eventos en los próximos 7 días');
          console.log('💡 Crea un evento en https://calendar.google.com para probar');
        }
      } else {
        console.error('❌ Error al obtener eventos:', eventsData);
      }
    } catch (error) {
      console.error('❌ Error de red al fetch eventos:', error);
    }
  } else {
    console.log('\n3️⃣ Google Calendar NO conectado');
    console.log('💡 Ve a /profile y conecta Google Calendar para ver eventos');
  }
  
  console.log('\n=== FIN DE VERIFICACIÓN ===');
})();
```

### Paso 3: Interpretar Resultados

#### ✅ Resultado Esperado (TODO FUNCIONA):
```
=== VERIFICACIÓN DE FIX GOOGLE CALENDAR ===

1️⃣ Verificando /auth/me (endpoint arreglado)...
Estructura de respuesta: {success: true, data: {id: "...", email: "...", isGoogleConnected: true, ...}, requestId: "..."}
✅ data.data existe: true
✅ data.data.id: "ef8dcaea-c30b-4b65-85a5-cf7fbf19f2ce"
✅ data.data.isGoogleConnected: true

✅ ¡ÉXITO! isGoogleConnected está correctamente en data.data

2️⃣ Verificando /users/me (endpoint de perfil)...
Estructura de respuesta: {success: true, data: {id: "...", email: "...", isGoogleConnected: true, ...}, requestId: "..."}
✅ data.data existe: true
✅ data.data.isGoogleConnected: true

3️⃣ Google Calendar conectado, intentando fetch de eventos...
✅ Eventos obtenidos exitosamente: 3

Primeros eventos:
  1. Reunión de equipo - 2024-12-17T10:00:00Z
  2. Almuerzo - 2024-12-17T13:00:00Z
  3. Presentación - 2024-12-18T15:00:00Z

=== FIN DE VERIFICACIÓN ===
```

#### ⚠️ Si `isGoogleConnected: false`:
```
⚠️ isGoogleConnected es false - necesitas conectar Google Calendar en /profile
```
**Solución**: Ve a `/profile` y conecta Google Calendar.

#### ❌ Si NO aparece `isGoogleConnected`:
```
❌ ERROR: isGoogleConnected no está presente en la respuesta
```
**Solución**: El servidor no se reinició correctamente. Ejecuta:
```bash
Ctrl+C
pnpm dev
```

---

## 🎯 Verificar el Widget en /home

Después de ejecutar el script de verificación:

### 1. Ir a `/home`
Navega a `http://localhost:3000/home`

### 2. Abrir DevTools Console (F12)
Busca estos logs:

```
[PersonalCalendarWidget] Component mounted, refreshing user state
[AuthContext] mutateUser called - Refrescando datos de usuario
[AuthContext] mutateUser result { success: true, hasUser: true, isGoogleConnected: true, ... }
[PersonalCalendarWidget] Component state { hasUser: true, isConnected: true, ... }
[useCalendarEvents] Fetching calendar events...
[useCalendarEvents] Calendar events fetched successfully { eventCount: 3 }
```

### 3. Verificar el Widget Visualmente

**✅ Debería mostrar:**
- **Header**: "Mi Calendario" con botón "Actualizar"
- **Contenido**: Lista de eventos O "No tienes eventos para los próximos 7 días"

**❌ Si aún muestra "Conecta tu Google Calendar":**
1. Haz hard refresh (Ctrl+Shift+R)
2. Ejecuta en Console:
   ```javascript
   localStorage.clear();
   location.reload();
   ```
3. Si persiste, comparte los logs completos de la consola

---

## 📊 Cambios Técnicos Aplicados

### Backend
1. **`apps/api/.env`**
   - ✅ Google Client Secret actualizado

2. **`apps/api/src/routes/auth/handlers/session.ts`**
   - ✅ Handler `handleGetCurrentUser` ahora retorna usuario directamente
   - ✅ Estructura: `{ success: true, data: { id, email, isGoogleConnected, ... } }`

### Frontend
1. **`apps/web/lib/auth/session-manager.ts`**
   - ✅ `verifySession` ahora busca `data.data` en lugar de `data.user`
   - ✅ Logging mejorado con `isGoogleConnected`

2. **`apps/web/app/components/home/PersonalCalendarWidget.tsx`**
   - ✅ Revalidación automática del usuario al montar
   - ✅ Logging detallado para debugging

3. **`apps/web/app/auth/AuthContext.tsx`**
   - ✅ `mutateUser` con logging mejorado
   - ✅ Tracking de cambios en `isGoogleConnected`

---

## 🐛 Troubleshooting

### Problema: Script da error "Failed to fetch"
**Causa**: El servidor API no está corriendo.
**Solución**: 
```bash
pnpm dev
```

### Problema: `isGoogleConnected: undefined` después del fix
**Causa**: El servidor no se reinició.
**Solución**:
```bash
# En la terminal del servidor:
Ctrl+C
pnpm dev
```

### Problema: Widget sigue mostrando "Conecta tu Google Calendar"
**Causa**: Estado del usuario desactualizado en el navegador.
**Solución**:
```javascript
// En DevTools Console:
localStorage.clear();
location.reload();
```

### Problema: Error 401 al fetch eventos
**Causa**: Token de Google expiró.
**Solución**:
1. Ve a `/profile`
2. Click en "Desconectar"
3. Click en "Conectar"
4. Autoriza de nuevo

---

## ✅ Checklist Final

- [ ] Servidor API reiniciado
- [ ] Script de verificación ejecutado en DevTools
- [ ] `data.data.isGoogleConnected` aparece correctamente
- [ ] Navegado a `/home`
- [ ] Widget muestra eventos O "No tienes eventos"
- [ ] Logs en consola muestran `isConnected: true`

---

**Si todos los pasos están ✅ pero aún no funciona:**

1. Ejecuta el script de verificación y copia TODO el output
2. Copia los logs de la consola cuando navegas a `/home`
3. Copia las últimas 50 líneas de la terminal del API
4. Compártelo para debugging avanzado

---

**Última actualización**: 2024-12-16 16:30  
**Fix aplicado**: Estructura de respuesta de `/auth/me` corregida

