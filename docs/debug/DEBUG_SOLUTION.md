# 🐛 Solución: No Puedo Pegar en la Consola de Chrome

## ✅ Método Recomendado: Usar Snippets (NO requiere pegar en consola)

### Paso 1: Abrir Snippets
1. **Abre DevTools** → Presiona `F12`
2. Ve a la pestaña **"Sources"** (o "Fuentes")
3. En el **panel izquierdo**, busca **"Snippets"**
   - Si NO lo ves:
     - Click derecho en el panel izquierdo → **"New snippet"**
     - O busca el ícono de **"▶️"** o **"Snippets"** en la barra lateral

### Paso 2: Crear Snippet
1. **Click derecho** en "Snippets" → **"New snippet"**
2. **Nombra** el snippet: `debug-helper`
3. **Abre** el archivo `apps/web/public/debug-helper.js`
4. **Copia TODO** el contenido del archivo
5. **Pega** en el snippet (SÍ puedes pegar en snippets, solo no en la consola)
6. **Guarda** con `Ctrl+S` (o `Cmd+S` en Mac)

### Paso 3: Ejecutar Snippet
1. **Click derecho** en el snippet `debug-helper` → **"Run"**
   - O presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)
2. Deberías ver un mensaje: `✅ Debug Helper disponible`

### Paso 4: Usar en Consola
Ahora SÍ puedes escribir en la consola:

```javascript
debugConsole.getLogs()
debugConsole.showErrors()
debugConsole.getLastError()
```

## ✅ Método Alternativo: Ver Logs Directamente SIN Scripts

### Opción A: Application Tab (Sin código)

1. **DevTools** → pestaña **"Application"** (o "Aplicación")
2. Panel izquierdo: **"Storage"** → **"Local Storage"** → `http://localhost:3000`
3. Busca la clave **"debug-console-logs"**
4. **Click** en el valor para verlo
5. **Doble click** para editarlo y copiar todo el JSON
6. Pégalo en un editor de texto o un formateador JSON online

### Opción B: Console Multi-línea (Escribir línea por línea)

1. Abre **Console** (F12)
2. **Presiona Shift+Enter** para crear una nueva línea (NO ejecuta)
3. Escribe estas líneas UNA POR UNA:

```javascript
var logs = JSON.parse(localStorage.getItem('debug-console-logs') || '[]')
```

Presiona **Shift+Enter** (nueva línea), luego:

```javascript
console.table(logs)
```

Presiona **Shift+Enter** (nueva línea), luego:

```javascript
var errors = logs.filter(function(l) { return l.type === 'error' })
```

Presiona **Shift+Enter** (nueva línea), luego:

```javascript
console.table(errors)
```

Finalmente presiona **Enter** (ejecuta todo)

## ✅ Método 3: Network Tab (Ver el Archivo Truncado)

1. **DevTools** → pestaña **"Network"**
2. **Recarga la página** (F5)
3. **Filtra por "JS"** (solo JavaScript)
4. **Busca** `layout.js` en la lista
5. **Click** en el archivo
6. Ve a la pestaña **"Response"** o **"Preview"**
7. **Busca** la línea 1094
8. **Copia** el contenido completo o la sección problemática

## ✅ Método 4: Sources Tab (Inspeccionar Código)

1. **DevTools** → pestaña **"Sources"**
2. Panel izquierdo: busca `webpack://` → `.(app-pages-browser)`
3. **Navega** al archivo del error
4. **Busca** la línea problemática
5. Puedes poner **breakpoints** para debugging

## 🎯 Recomendación Final

**Usa Snippets** - Es el método más confiable:
- ✅ NO necesitas pegar en la consola
- ✅ Funciona siempre
- ✅ Puedes guardarlo y reusarlo
- ✅ Una vez ejecutado, puedes usar `debugConsole` en la consola

### Pasos Rápidos Snippets:

1. `F12` → **Sources** → **Snippets**
2. **Click derecho** → **New snippet** → Nombra `debug-helper`
3. **Copia** el contenido de `apps/web/public/debug-helper.js`
4. **Pega** en el snippet → `Ctrl+S`
5. **Click derecho** en snippet → **Run**
6. Ahora usa `debugConsole.getLogs()` en la consola

