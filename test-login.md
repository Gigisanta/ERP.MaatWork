# Test de Login - Guía y verificación

## Entorno y credenciales
- `src/config/environment.ts` está en modo producción (`ENVIRONMENT = 'production'`).
- Usuario admin por defecto (preconfigurado):
  - Usuario: `Gio`
  - Contraseña: `Gio123`
  - Fuente: `CONFIG.DEFAULT_ADMIN` y `CONFIG.DEFAULT_ADMIN_PASSWORD` en `src/config/environment.ts`.

## Cómo ejecutar localmente
1) Instalar Node.js LTS (si no está instalado):
```bash
winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
# cierra y reabre la terminal
node -v && npm -v
```
2) Instalar dependencias y levantar Vite:
```bash
npm ci
npm run client:dev
```
3) Abrir la app:
```text
http://localhost:5173/login
```

## Casos de prueba
### Test 1: Login SIN "Recordar sesión"
1. Ir a `http://localhost:5173/login`.
2. Usuario: `Gio`, Contraseña: `Gio123`.
3. NO marcar "Recordar sesión".
4. Click en "Iniciar Sesión".
5. Esperado: Redirección automática a `/dashboard` (la hace `PublicRoute`).

### Test 2: Login CON "Recordar sesión"
1. Logout si está autenticado.
2. Usuario: `Gio`, Contraseña: `Gio123`.
3. Marcar "Recordar sesión".
4. Click en "Iniciar Sesión" ➜ redirige a `/dashboard`.
5. Refrescar la página: debe permanecer autenticado.

### Test 3: Persistencia al reabrir
1. Con "Recordar sesión" activo y sesión iniciada, cerrar la pestaña.
2. Abrir `http://localhost:5173`.
3. Esperado: Navega directamente al dashboard.

## Notas técnicas
- Redirección post-login: `src/components/PublicRoute.tsx` redirige si `isAuthenticated && user`.
- Flujo de login: `src/store/authStore.ts` ➜ `login(username, password, remember)` valida contra `mockUsers/mockCredentials` en producción usando `CONFIG.DEFAULT_ADMIN`.
- Pantalla de setup inicial: En producción, no aparece porque existe al menos un admin (`getAdminUsers`).

## Troubleshooting
- Borrar estado persistido:
```js
localStorage.removeItem('auth-storage');
location.reload();
```
- Auto-login (debug rápido): abre la consola y pega `auto_login.js` de la raíz del proyecto.

## Referencias
- `src/config/environment.ts`
- `src/store/authStore.ts`
- `src/components/PublicRoute.tsx`
- `src/pages/Login.tsx`