# Limpieza de Caché del Navegador

## Cuándo Necesitas Esto

Después de resolver errores de webpack o problemas de módulos corruptos, DEBES limpiar el caché del navegador para que los cambios surtan efecto.

**Síntomas de caché corrupto en navegador**:
- Error de webpack persiste después de limpiar cachés del servidor
- Módulos webpack no se cargan correctamente
- Página muestra versión antigua después de cambios
- Error "Cannot read properties of undefined (reading 'call')"

## Métodos de Limpieza

### Método 1: Hard Refresh (Recomendado)

El "Hard Refresh" fuerza al navegador a descargar todos los recursos de nuevo, ignorando el caché.

#### Chrome / Edge / Brave

**Opción A - Con DevTools**:
1. Abre DevTools (F12 o Cmd+Option+I en Mac)
2. Haz **click derecho** en el botón de recargar del navegador (🔄)
3. Selecciona **"Empty Cache and Hard Reload"** (Vaciar caché y recargar completamente)

**Opción B - Atajo de teclado**:
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + F5` o `Ctrl + F5`

#### Firefox

**Atajo de teclado**:
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + F5` o `Ctrl + F5`

**Con DevTools**:
1. Abre DevTools (F12)
2. Haz click derecho en el botón de recargar
3. Selecciona **"Empty Cache and Hard Reload"**

#### Safari

**Atajo de teclado**:
- **Mac**: `Cmd + Option + R`

**Manual**:
1. Abre Safari > Preferences > Advanced
2. Marca "Show Develop menu in menu bar"
3. Menu Develop > Empty Caches
4. Recarga la página con `Cmd + R`

### Método 2: Ventana de Incógnito/Privada

El modo incógnito no usa el caché persistente, ideal para verificar que el fix funciona.

- **Chrome/Edge/Brave**: `Cmd + Shift + N` (Mac) o `Ctrl + Shift + N` (Windows/Linux)
- **Firefox**: `Cmd + Shift + P` (Mac) o `Ctrl + Shift + P` (Windows/Linux)
- **Safari**: `Cmd + Shift + N`

Luego navega a `http://localhost:3000`

### Método 3: Limpiar Todo el Caché (Nuclear)

Si los métodos anteriores no funcionan:

#### Chrome / Edge / Brave

1. Abre `chrome://settings/clearBrowserData`
2. Selecciona:
   - ✅ Cached images and files
   - ✅ (Opcional) Cookies and other site data
3. Time range: **"All time"** o **"Last hour"** (para ser más específico)
4. Click **"Clear data"**
5. Cierra y reabre el navegador

#### Firefox

1. Abre `about:preferences#privacy`
2. Scroll a "Cookies and Site Data"
3. Click "Clear Data..."
4. Selecciona:
   - ✅ Cached Web Content
   - ✅ (Opcional) Cookies and Site Data
5. Click "Clear"
6. Cierra y reabre el navegador

#### Safari

1. Safari > Preferences > Privacy
2. Click "Manage Website Data..."
3. Click "Remove All"
4. Confirm
5. Cierra y reabre Safari

## Verificación

Después de limpiar el caché:

1. **Abre DevTools** (F12)
2. Ve a la pestaña **Network**
3. Marca **"Disable cache"** (mientras DevTools esté abierto)
4. Recarga la página
5. Verifica que:
   - Los archivos JS se descargan (Status 200, no "from cache")
   - No aparecen errores de webpack en Console
   - La aplicación funciona correctamente

## Prevención

Para desarrollo, mantén DevTools abierto con **"Disable cache"** marcado:

1. Abre DevTools (F12)
2. Ve a Network tab
3. Marca ✅ **"Disable cache"**
4. Deja DevTools abierto mientras desarrollas

Esto previene problemas de caché durante desarrollo activo.

## Limpieza de Service Workers (Avanzado)

Si usas Service Workers (PWA), también necesitas limpiarlos:

### Chrome / Edge / Brave

1. Abre DevTools (F12)
2. Ve a **Application** tab
3. En el sidebar, click **"Service Workers"**
4. Click **"Unregister"** en cada service worker listado
5. Recarga la página

### Firefox

1. Abre DevTools (F12)
2. Ve a **Application** tab (o **Storage** en versiones antiguas)
3. Click **"Service Workers"**
4. Click **"Unregister"** en cada service worker

## Troubleshooting

### El error persiste después de hard refresh

1. **Cierra COMPLETAMENTE el navegador** (todas las ventanas)
2. Reabre el navegador
3. Navega a `http://localhost:3000`

### El error persiste después de cerrar el navegador

1. **Prueba en otro navegador** (Firefox, Safari, etc.)
2. Si funciona en otro navegador, el problema es caché específico del navegador original
3. Usa el Método 3 (Nuclear) para el navegador problemático

### Funciona en incógnito pero no en normal

Esto confirma que es un problema de caché. Usa el Método 3 (Nuclear) para limpiar todo.

## Scripts de Automatización (Opcional)

Para automatizar la limpieza en desarrollo:

```bash
# Script que reinicia todo limpio
./scripts/clean-webpack-cache.sh

# Luego haz hard refresh en el navegador
```

## Relación con Otros Problemas

Este procedimiento es **crítico** después de:

- Resolver errores de webpack en desarrollo
- Limpiar cachés del servidor (`.next`, webpack cache)
- Actualizar paquetes del workspace (`@cactus/ui`, etc.)
- Cambios en configuración de webpack

**Recuerda**: Los cachés del servidor y del navegador son independientes. Debes limpiar AMBOS.

## Referencias

- Error de webpack: `docs/troubleshooting/webpack-skeleton-error.md`
- Script de limpieza: `scripts/clean-webpack-cache.sh`
- Plan de fix: `fix-webpack-and-auth-issues.plan.md`

