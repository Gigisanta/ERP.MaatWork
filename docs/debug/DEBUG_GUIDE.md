# 🐛 Guía de Debugging - Cómo usar cuando no puedes pegar en la consola

## Problema: No puedo pegar en la consola de Chrome

Si Chrome no te deja pegar en la consola, usa una de estas alternativas:

## ✅ Método 1: Usar Snippets (Recomendado)

1. **Abre DevTools** (F12)
2. Ve a la pestaña **"Sources"** o **"Sources"**
3. En el panel izquierdo, busca la sección **"Snippets"**
   - Si no la ves, click derecho en el panel izquierdo → **"Add folder"** → busca **"Snippets"**
   - O ve a **"Sources"** → Panel izquierdo → Click derecho → **"New snippet"**
4. **Crea un nuevo snippet:**
   - Click derecho en "Snippets" → **"New snippet"**
   - Nómbralo "debug-helper"
5. **Copia el contenido** del archivo `apps/web/public/debug-helper.js`
6. **Pega** en el snippet
7. **Guarda** (Ctrl+S o Cmd+S)
8. **Ejecuta el snippet:**
   - Click derecho en el snippet → **"Run"**
   - O presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)

Ahora puedes usar `debugConsole.getLogs()` en la consola.

## ✅ Método 2: Cargar como Script Externo

1. **Abre DevTools** (F12) → pestaña **"Sources"**
2. En el panel derecho, busca la pestaña **"Snippets"** (o crea uno)
3. O directamente:
   - En la consola, escribe: `fetch('/debug-helper.js').then(r=>r.text()).then(eval)`
   - Esto cargará y ejecutará el script automáticamente

## ✅ Método 3: Usar Consola Multi-línea

1. **Abre Console** (F12)
2. Presiona **Shift+Enter** para crear una nueva línea (en lugar de ejecutar)
3. Copia el código **sección por sección**
4. O usa el botón **"⚙️"** (configuración) en la consola → **"Console"** → Activa **"Show console when errors occur"**

## ✅ Método 4: Ver logs directamente desde localStorage

Si no puedes usar ningún script, puedes ver los logs directamente:

### Opción A: Desde localStorage en Console

Escribe en la consola (puedes escribirlo línea por línea):

```javascript
// Ver todos los logs
localStorage.getItem('debug-console-logs')

// Ver en formato tabla (escribe línea por línea)
var logs = JSON.parse(localStorage.getItem('debug-console-logs') || '[]')
console.table(logs)

// Ver solo errores
var errors = logs.filter(l => l.type === 'error')
console.table(errors)

// Ver el último error
var lastError = logs.find(l => l.type === 'error')
if (lastError) { console.log(lastError); if (lastError.stack) console.log(lastError.stack) }
```

### Opción B: Desde Application Tab (Sin escribir código)

1. **Abre DevTools** (F12)
2. Ve a la pestaña **"Application"** (o **"Aplicación"**)
3. En el panel izquierdo: **"Local Storage"** → `http://localhost:3000`
4. Busca la clave **"debug-console-logs"**
5. **Haz doble clic** en el valor para editarlo
6. **Copia todo el JSON**
7. Pégalo en un editor de texto o un formateador JSON online

## ✅ Método 5: Usar Network Tab para Ver el Archivo Truncado

1. **Abre DevTools** (F12)
2. Ve a la pestaña **"Network"**
3. **Recarga la página** (F5 o Ctrl+R)
4. **Filtra por "JS"** (solo archivos JavaScript)
5. **Busca** `layout.js` o `vendors-*.js` en la lista
6. **Haz clic** en el archivo para abrirlo
7. Ve a la pestaña **"Response"** o **"Preview"**
8. **Busca la línea 1094** (o la línea del error)
9. **Copia** el contenido completo o la sección problemática

## ✅ Método 6: Inspeccionar el Archivo en Sources

1. **Abre DevTools** (F12)
2. Ve a la pestaña **"Sources"**
3. En el árbol de archivos izquierdo, busca:
   - `webpack://` → `.(app-pages-browser)` → busca el archivo del error
4. **Navega** al archivo y la línea problemática
5. **Inspecciona** el código truncado
6. Puedes **poner breakpoints** para debugging

## 🔧 Verificar si la Consola Está Bloqueada

Si la consola está bloqueada, intenta:

1. **Cerrar y reabrir** DevTools
2. **Presionar** `Ctrl+Shift+P` (o `Cmd+Shift+P` en Mac) → escribe "Disable JavaScript"
3. **Recargar la página** sin JavaScript temporalmente
4. **Verificar** si hay un popup o diálogo bloqueando la página

## 📋 Comandos Rápidos (Escribe línea por línea si no puedes pegar)

Si no puedes pegar, escribe estos comandos uno por uno:

```javascript
// 1. Ver logs
var logs = JSON.parse(localStorage.getItem('debug-console-logs') || '[]')

// 2. Ver en tabla
console.table(logs)

// 3. Ver solo errores
var errors = logs.filter(function(l) { return l.type === 'error' })
console.table(errors)

// 4. Ver el último error
var last = logs.find(function(l) { return l.type === 'error' })
if (last) { console.log(last); if (last.stack) console.log(last.stack) }
```

## 💡 Script Más Simple (Una línea)

Si nada funciona, intenta esta **una sola línea**:

```javascript
var d=JSON.parse(localStorage.getItem('debug-console-logs')||'[]');console.table(d.filter(function(l){return l.type==='error'}));d.find(function(l){return l.type==='error'})
```

Esta línea:
- Carga los logs
- Muestra una tabla con solo errores
- Devuelve el último error

## 🎯 Método Recomendado: Snippets

**El método más confiable es usar Snippets:**

1. F12 → Sources → Snippets
2. New snippet → Pega el código de `apps/web/public/debug-helper.js`
3. Run snippet
4. Usa `debugConsole.getLogs()` en la consola

Este método siempre funciona porque no depende de pegar en la consola.

