# ✅ Google Calendar - Fix Final Completo

## 🎯 Problemas Resueltos

### 1. ✅ Estructura de Respuesta Incorrecta
**Problema**: `/auth/me` retornaba `{ success, data: { user: {...} } }` (doble nesting)  
**Solución**: Ahora retorna `{ success, data: { id, email, isGoogleConnected, ... } }`

### 2. ✅ Bucle Infinito de Requests
**Problema**: 120+ requests a `/auth/me` en 2 segundos  
**Causa**: `useEffect` con dependencias que causaban re-renders infinitos  
**Solución**: 
- `mutateUser` ahora es estable (sin dependencias)
- `useEffect` en `PersonalCalendarWidget` ejecuta solo al montar (`[]`)
- `useEffect` en `GoogleCalendarSection` ejecuta solo al montar (`[]`)

### 3. ✅ Frontend Parseaba Incorrectamente
**Problema**: Buscaba `data.user` pero estaba en `data.data.user`  
**Solución**: `session-manager.ts` ahora busca correctamente en `data.data`

### 4. ✅ Profile Mostraba "Conectar" Incorrecto
**Problema**: Componente no se actualizaba después del OAuth  
**Solución**: Flujo de actualización mejorado con `mutateUser` estable

---

## 📋 Cambios Técnicos Aplicados

### Backend

#### 1. `apps/api/.env`
```env
GOOGLE_CLIENT_SECRET=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
```

#### 2. `apps/api/src/routes/auth/handlers/session.ts`
```typescript
// ❌ ANTES
return {
  user: {
    ...user,
    isGoogleConnected,
  },
};

// ✅ AHORA
return {
  ...user,
  isGoogleConnected,
};
```

### Frontend

#### 3. `apps/web/lib/auth/session-manager.ts`
```typescript
// ❌ ANTES
if (data?.user) {
  return { success: true, user: data.user };
}

// ✅ AHORA  
if (data?.data) {
  return { success: true, user: data.data };
}
```

#### 4. `apps/web/app/auth/AuthContext.tsx`
```typescript
// ❌ ANTES
const mutateUser = React.useCallback(async () => {
  // ...
}, [user]); // ← Causaba bucle

// ✅ AHORA
const mutateUser = React.useCallback(async () => {
  // ...
}, []); // ← Función estable
```

#### 5. `apps/web/app/components/home/PersonalCalendarWidget.tsx`
```typescript
// ❌ ANTES
React.useEffect(() => {
  mutateUser();
}, [mutateUser]); // ← Causaba bucle

// ✅ AHORA
React.useEffect(() => {
  mutateUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // ← Solo al montar
```

#### 6. `apps/web/app/profile/components/GoogleCalendarSection.tsx`
```typescript
// ❌ ANTES
}, [mutateUser, showToast]); // ← Podía causar bucle

// ✅ AHORA
}, []); // ← Solo al montar
```

---

## 🚀 Cómo Probar (Después del Fix)

### Paso 1: Hard Refresh
```
Ctrl + Shift + R
```

### Paso 2: Verificar que NO hay bucle infinito

Abre DevTools Console (F12) y verifica que **NO** veas cientos de logs de `/auth/me`.

**✅ Correcto** (solo 1-2 requests al cargar):
```
[PersonalCalendarWidget] Component mounted, refreshing user state
[AuthContext] mutateUser called - Refrescando datos de usuario
[AuthContext] mutateUser result { isGoogleConnected: true, ... }
```

**❌ Incorrecto** (bucle):
```
INFO: Checked Google connection status (x100 requests en 2 segundos)
```

### Paso 3: Verificar `/profile`

1. Ve a `http://localhost:3000/profile`
2. Deberías ver **"Desconectar"** (no "Conectar")
3. Si ves "Conectar", necesitas reconectar:
   - Click en "Conectar"
   - Autoriza en Google
   - Deberías volver con "Desconectar"

### Paso 4: Verificar `/home`

1. Ve a `http://localhost:3000/home`
2. El widget de calendario debería mostrar:
   - **Header**: "Mi Calendario" con botón "Actualizar"
   - **Contenido**: Lista de eventos O "No tienes eventos para los próximos 7 días"

**NO** debería mostrar:
- ❌ "Conecta tu Google Calendar"
- ❌ Botón "Conectar en Perfil"

### Paso 5: Verificar en Logs del Backend

En la terminal del API, busca:
```
✅ Debe aparecer UNA VEZ:
INFO: Personal calendar events fetched {"eventCount":5}

✅ NO debe aparecer cientos de veces:
INFO: Checked Google connection status
```

---

## 🧪 Script de Verificación Rápida

Ejecuta en DevTools Console (F12):

```javascript
(async () => {
  console.log('=== VERIFICACIÓN RÁPIDA ===\n');
  
  // 1. Verificar estructura de respuesta
  const response = await fetch('http://localhost:3001/v1/auth/me', {
    credentials: 'include',
    cache: 'no-store'
  });
  const data = await response.json();
  
  console.log('1️⃣ Estructura:', JSON.stringify(data, null, 2));
  console.log('✅ data.data existe:', !!data.data);
  console.log('✅ data.data.isGoogleConnected:', data.data?.isGoogleConnected);
  
  if (data.data?.isGoogleConnected) {
    console.log('\n2️⃣ Probando fetch de eventos...');
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eventsUrl = `http://localhost:3001/v1/calendar/personal/events?timeMin=${now.toISOString()}&timeMax=${nextWeek.toISOString()}&maxResults=5`;
    
    const eventsResponse = await fetch(eventsUrl, { credentials: 'include' });
    const eventsData = await eventsResponse.json();
    
    if (eventsData.success) {
      console.log(`✅ Eventos: ${eventsData.data.length}`);
      if (eventsData.data.length > 0) {
        console.log('\nPrimeros 3 eventos:');
        eventsData.data.slice(0, 3).forEach((e, i) => {
          console.log(`  ${i+1}. ${e.summary || '(Sin título)'}`);
        });
      } else {
        console.log('ℹ️ No hay eventos en los próximos 7 días');
        console.log('💡 Crea uno en https://calendar.google.com');
      }
    }
  } else {
    console.log('\n⚠️ Google Calendar NO conectado');
    console.log('👉 Ve a /profile y conecta');
  }
  
  console.log('\n=== FIN ===');
})();
```

**Resultado Esperado**:
```
=== VERIFICACIÓN RÁPIDA ===

1️⃣ Estructura: {
  "success": true,
  "data": {
    "id": "...",
    "email": "...",
    "isGoogleConnected": true,
    ...
  }
}
✅ data.data existe: true
✅ data.data.isGoogleConnected: true

2️⃣ Probando fetch de eventos...
✅ Eventos: 5

Primeros 3 eventos:
  1. Reunión de equipo
  2. Almuerzo
  3. Presentación

=== FIN ===
```

---

## 🐛 Troubleshooting

### Problema: Sigue habiendo bucle infinito

**Causa**: Caché del navegador no se limpió  
**Solución**:
```javascript
// En DevTools Console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Problema: En `/profile` sigue mostrando "Conectar"

**Causa**: El estado del usuario no se actualizó  
**Solución**:
1. Hard refresh (Ctrl+Shift+R)
2. O reconectar:
   - Click en "Desconectar" (si aparece)
   - Click en "Conectar"
   - Autorizar en Google

### Problema: Widget en `/home` muestra "Conecta tu Google Calendar"

**Causa 1**: No está conectado realmente  
**Solución**: Ir a `/profile` y conectar

**Causa 2**: Estado desactualizado  
**Solución**:
```javascript
// En DevTools Console en /home:
location.reload();
```

### Problema: Error "Failed to fetch" en eventos

**Causa**: Token de Google expiró  
**Solución**:
1. Ve a `/profile`
2. Click en "Desconectar"
3. Click en "Conectar"
4. Autoriza de nuevo en Google

---

## ✅ Checklist de Verificación

Marca cada item después de verificar:

- [ ] No hay bucle infinito (solo 1-2 requests a `/auth/me` al cargar)
- [ ] `/profile` muestra "Desconectar" (no "Conectar")
- [ ] `/home` muestra widget con eventos (o "No tienes eventos")
- [ ] Widget NO muestra "Conecta tu Google Calendar"
- [ ] Script de verificación retorna estructura correcta
- [ ] Logs del backend muestran `eventCount` sin spam de requests

---

## 📊 Logs Esperados

### Backend (Terminal API)
```
✅ CORRECTO - Una vez al cargar /home:
INFO: Checked Google connection status in profile {"isGoogleConnected":true}
INFO: Personal calendar events fetched {"eventCount":5}

❌ INCORRECTO - Cientos de veces:
INFO: Checked Google connection status {...}
INFO: Checked Google connection status {...}
INFO: Checked Google connection status {...}
(x100 requests)
```

### Frontend (DevTools Console)
```
✅ CORRECTO:
[PersonalCalendarWidget] Component mounted, refreshing user state
[PersonalCalendarWidget] Component state { isConnected: true, ... }
[useCalendarEvents] Fetching calendar events...
[useCalendarEvents] Calendar events fetched successfully { eventCount: 5 }

❌ INCORRECTO - Logs en bucle:
[PersonalCalendarWidget] Component mounted, refreshing user state
[PersonalCalendarWidget] Component mounted, refreshing user state
[PersonalCalendarWidget] Component mounted, refreshing user state
(x100 veces)
```

---

## 🎉 Si Todo Funciona

Deberías poder:

✅ Ver "Desconectar" en `/profile`  
✅ Ver tus eventos en `/home`  
✅ Click en "Actualizar" para refrescar eventos  
✅ Navegar entre páginas sin bucles infinitos  
✅ Ver logs limpios sin spam de requests

---

**Última actualización**: 2024-12-16 16:35  
**Fix aplicado**: Estructura de respuesta + Bucle infinito resuelto  
**Archivos modificados**: 6 (backend: 2, frontend: 4)

