# Guía de Desarrollo

Esta guía proporciona información esencial para desarrolladores que trabajan en el proyecto CACTUS CRM.

## Índice

1. [Getting Started](#getting-started)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Code Standards y Convenciones](#code-standards-y-convenciones)
4. [Guía de Debugging](#guía-de-debugging)
5. [Referencias a Módulos](#referencias-a-módulos)
6. [Comandos Útiles](#comandos-útiles)

---

## Getting Started

### Requisitos

- Node.js >=22.0.0 <25.0.0
- pnpm >=9.0.0
- Python 3.10+ (opcional, para analytics-service)
- TMUX (recomendado)
- Docker (opcional, para PostgreSQL local)

### Instalación

```bash
# 1. Instalar dependencias
pnpm install

# 2. Iniciar PostgreSQL y N8N (Docker)
docker compose up -d

# 3. Configurar variables de entorno
cp apps/api/config-example.env apps/api/.env
# Editar apps/api/.env con tus valores

# 4. Instalar dependencias Python (opcional)
pnpm -F @cactus/analytics-service install
```

### Desarrollo

```bash
# Opción 1: Con TMUX (recomendado - 4 paneles)
pnpm dev

# Opción 2: Sin TMUX
pnpm dev:basic

# Detener sesión TMUX
pnpm dev:kill
```

**URLs:**
- Web: http://localhost:3000
- API: http://localhost:3001
- Analytics: http://localhost:3002
- N8N: http://localhost:5678

---

## Estructura del Proyecto

```
CactusDashboard-epic-D/
├── apps/
│   ├── api/                 # API Express + TypeScript
│   ├── web/                 # Frontend Next.js App Router
│   └── analytics-service/   # Servicio Python de análisis
├── packages/
│   ├── db/                  # Drizzle ORM + PostgreSQL
│   └── ui/                  # Design System + React Components
├── data/                    # Archivos de datos de negocio
├── docs/                     # Documentación técnica
└── docker-compose.yml       # PostgreSQL y N8N
```

### Rutas Clave

- **API**: `apps/api/src/routes/*`, entrypoint `apps/api/src/index.ts`
- **Web**: `apps/web/app/*` (Server/Client components)
- **DB**: `packages/db/src/schema.ts`, migraciones con `drizzle-kit`
- **UI**: `packages/ui/src/components/*`

---

## Code Standards y Convenciones

### Principios Fundamentales

#### Antes de Modificar Código

1. **Prioridad:** Solución MÁS ESTABLE, no la más creativa
2. **Verificar primero:** ¿Es necesario? ¿Es seguro? ¿Romperá código? ¿Está documentado?
3. **Ejecutar typecheck ANTES:** `pnpm typecheck` (todos los workspaces)
4. **Construir paquetes compartidos si hay cambios en tipos:** `pnpm -F @cactus/ui build` antes de typecheck

### Reglas Críticas TypeScript

**Configuración:** `tsconfig.base.json` tiene `exactOptionalPropertyTypes: true` y `strict: true`

#### 1. Manejo de Propiedades Opcionales

```typescript
// ❌ MAL - Con exactOptionalPropertyTypes: true
interface User { name?: string; }
const user: User = { name: undefined };  // ERROR

// ✅ BIEN - Omitir propiedad si es undefined
const user: User = {};
if (someValue) user.name = someValue;

// ✅ BIEN - Permitir null explícitamente
interface User { name?: string | null; }
const user: User = { name: null };

// ✅ BIEN - Usar nullish coalescing (NO ||)
const description = portfolio.description ?? null;
```

#### 2. Evitar Shadowing de Funciones

```typescript
// ❌ MAL - Función local oculta import
import { createPortfolio } from '@/lib/api';
const createPortfolio = async () => { ... };  // ERROR

// ✅ BIEN - Usar prefijo handle/do/perform
const handleCreatePortfolio = async () => {
  await createPortfolio({ ... });
};
```

#### 3. Verificar Tipos de Componentes UI Antes de Usar

**SIEMPRE verificar props aceptadas en `packages/ui/src/components/*` antes de usar:**

```typescript
// ❌ MAL - Asumir props sin verificar
<Text color="error">Error</Text>  // Text no acepta "error"

// ✅ BIEN - Text acepta: 'primary' | 'secondary' | 'muted'
<Text color="secondary">Error</Text>

// ✅ BIEN - Button onClick espera: () => void
<Button onClick={() => router.push('/path')} />  // NO onClick={(e) => ...}
```

#### 4. Evitar Tipos Duplicados

```typescript
// ❌ MAL - Definición duplicada causa conflictos
export interface BenchmarkComponentForm { ... }
export interface BenchmarkComponentForm { ... }  // ERROR

// ✅ BIEN - Una sola definición, reutilizar desde types/
```

#### 5. Construir Paquetes Compartidos Antes de Typecheck

```bash
# Si modificas tipos exportados:
pnpm -F @cactus/ui build
pnpm -F @cactus/db build
# Luego:
pnpm typecheck
```

### Arquitectura de Tipos

**NUNCA usar `any`** - Crear tipos explícitos siempre.

**Estructura:**

```
types/
├── index.ts          # Barrel export
├── common.ts         # Tipos base y utility types compartidos
├── [domain].ts       # Un archivo por dominio
```

**Reglas:** 50-150 líneas máximo por archivo, separar por dominio, evitar definiciones duplicadas.

#### Principios de Diseño de Tipos

1. **Tipos Base Reutilizables**: Usar `BaseEntity`, `TimestampedEntity`
2. **Utility Types**: Usar `CreateRequest<T>`, `UpdateRequest<T>` para evitar duplicación
3. **Herencia con `extends`**: Evitar duplicar campos comunes
4. **Pick, Omit, Partial**: Usar utility types de TypeScript para crear variantes
5. **Uniones de Tipos**: Usar para estados y variantes en lugar de `string`
6. **Inferencia desde Drizzle**: Usar `InferSelectModel` para tipos de base de datos

### Cliente API Centralizado

**NUNCA usar `fetch` directamente** - Usar cliente centralizado (`lib/api/[domain].ts`).

**Features requeridos:** Retry (5xx), refresh token (401), timeout, headers automáticos.

**Ubicación:** `apps/web/lib/api/[domain].ts`

### Validaciones con Zod

**Validar en backend SIEMPRE** con schemas y middleware `validate()`.

**Ubicación:** Definir schemas en `apps/api/src/routes/*.ts` bajo `// Zod Validation Schemas`

```typescript
import { validate } from '../utils/validation';
import { uuidSchema, paginationQuerySchema } from '../utils/common-schemas';

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional()
});

// ==========================================================
// Routes
// ==========================================================

router.post('/',
  requireAuth,
  validate({ body: createSchema }),  // ✅ Middleware validate()
  async (req, res) => {
    // req.body ya está validado y tipado
  }
);
```

**Reglas:**

- ✅ Usar middleware `validate()` en la definición del endpoint
- ❌ NO usar `.parse()` manual en el handler
- ❌ NO manejar `ZodError` manualmente

### Server Component Architecture (Next.js)

**Server Component:** Data fetching, static rendering, SEO-critical content  
**Client Component:** Interactivity, hooks, browser APIs

#### Pattern: Client Islands

- Extract interactive sections into small components (< 100 lines)
- Pass server data as props
- Use SWR for client-side mutations
- Prefix with `"use client"` directive

### Anti-Patterns a Evitar

1. ❌ Tipos `any` sin justificación
2. ❌ `fetch` manual sin cliente centralizado
3. ❌ Magic numbers (usar constantes/config)
4. ❌ `window.location` en Next.js (usar `useRouter`)
5. ❌ `alert()` / `confirm()` nativos (usar Toast/Modal)
6. ❌ Queries N+1 en loops (usar batch queries)
7. ❌ Sin validación de inputs (usar Zod)
8. ❌ Timeouts hardcodeados (usar config centralizada)
9. ❌ `console.log` en producción (usar logger estructurado)
10. ❌ Shadowing de funciones importadas (usar prefijos `handle/do`)
11. ❌ Asumir props de componentes UI (verificar tipos primero)
12. ❌ Definir tipos duplicados (reutilizar definiciones)
13. ❌ Asignar `undefined` a propiedades opcionales con `exactOptionalPropertyTypes` (omitir o usar `null`)

### Checklist Pre-Modificación

**Antes de cambiar código:**

- [ ] Ejecutar `pnpm typecheck` para verificar estado actual
- [ ] Construir paquetes compartidos si hay cambios en tipos (`pnpm -F @cactus/ui build`)
- [ ] Verificar tipos de componentes UI antes de usar
- [ ] Sin tipos `any` sin justificación
- [ ] Sin dependencias nuevas sin justificación
- [ ] Sin breaking changes sin versionado
- [ ] Tests existentes pasan
- [ ] Nuevos tests agregados
- [ ] Linter limpio (`pnpm lint`)
- [ ] Documentado con comentarios inline para decisiones no obvias

**Para nuevos endpoints:**

- [ ] Schemas Zod definidos bajo `// Zod Validation Schemas`
- [ ] Middleware `validate()` aplicado en la definición del endpoint
- [ ] Tipos Request/Response definidos
- [ ] Tests de validación (casos de error 400)

---

## Guía de Debugging

### Problema Común: No puedo pegar en la consola de Chrome

Si Chrome no te deja pegar en la consola, usa una de estas alternativas:

#### Método 1: Usar Snippets (Recomendado)

1. **Abre DevTools** (F12)
2. Ve a la pestaña **"Sources"**
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

#### Método 2: Cargar como Script Externo

1. **Abre DevTools** (F12) → pestaña **"Sources"**
2. En el panel derecho, busca la pestaña **"Snippets"** (o crea uno)
3. O directamente:
   - En la consola, escribe: `fetch('/debug-helper.js').then(r=>r.text()).then(eval)`
   - Esto cargará y ejecutará el script automáticamente

#### Método 3: Usar Consola Multi-línea

1. **Abre Console** (F12)
2. Presiona **Shift+Enter** para crear una nueva línea (en lugar de ejecutar)
3. Copia el código **sección por sección**
4. O usa el botón **"⚙️"** (configuración) en la consola → **"Console"** → Activa **"Show console when errors occur"**

#### Método 4: Ver logs directamente desde localStorage

##### Opción A: Desde Application Tab (Sin código)

1. **Abre DevTools** (F12)
2. Ve a la pestaña **"Application"** (o **"Aplicación"**)
3. En el panel izquierdo: **"Local Storage"** → `http://localhost:3000`
4. Busca la clave **"debug-console-logs"**
5. **Haz doble clic** en el valor para editarlo
6. **Copia todo el JSON**
7. Pégalo en un editor de texto o un formateador JSON online

##### Opción B: Console Multi-línea (Escribir línea por línea)

1. **Abre Console** (F12)
2. Presiona **Shift+Enter** para crear una nueva línea (en lugar de ejecutar)
3. Copia el código **sección por sección**

Escribe estas líneas UNA POR UNA:

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

#### Método 5: Usar Network Tab para Ver el Archivo Truncado

1. **Abre DevTools** (F12)
2. Ve a la pestaña **"Network"**
3. **Recarga la página** (F5 o Ctrl+R)
4. **Filtra por "JS"** (solo archivos JavaScript)
5. **Busca** `layout.js` o `vendors-*.js` en la lista
6. **Haz clic** en el archivo para abrirlo
7. Ve a la pestaña **"Response"** o **"Preview"**
8. **Busca la línea 1094** (o la línea del error)
9. **Copia** el contenido completo o la sección problemática

#### Método 6: Inspeccionar el Archivo en Sources

1. **Abre DevTools** (F12)
2. Ve a la pestaña **"Sources"**
3. En el árbol de archivos izquierdo, busca:
   - `webpack://` → `.(app-pages-browser)` → busca el archivo del error
4. **Navega** al archivo y la línea problemática
5. **Inspecciona** el código truncado
6. Puedes **poner breakpoints** para debugging

### Verificar si la Consola Está Bloqueada

Si la consola está bloqueada, intenta:

1. **Cerrar y reabrir** DevTools
2. **Presionar** `Ctrl+Shift+P` (o `Cmd+Shift+P` en Mac) → escribe "Disable JavaScript"
3. **Recargar la página** sin JavaScript temporalmente
4. **Verificar** si hay un popup o diálogo bloqueando la página

### Comandos Rápidos (Escribe línea por línea si no puedes pegar)

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

### Script Más Simple (Una línea)

Si nada funciona, intenta esta **una sola línea**:

```javascript
var d=JSON.parse(localStorage.getItem('debug-console-logs')||'[]');console.table(d.filter(function(l){return l.type==='error'}));d.find(function(l){return l.type==='error'})
```

Esta línea:
- Carga los logs
- Muestra una tabla con solo errores
- Devuelve el último error

### Método Recomendado: Snippets

**El método más confiable es usar Snippets:**

1. F12 → Sources → Snippets
2. New snippet → Pega el código de `apps/web/public/debug-helper.js`
3. Run snippet
4. Usa `debugConsole.getLogs()` en la consola

Este método siempre funciona porque no depende de pegar en la consola.

### Referencias

- [Chrome DevTools Snippets](https://developer.chrome.com/docs/devtools/javascript/snippets/)
- [Debugging JavaScript](https://developer.chrome.com/docs/devtools/javascript/)
- Script de ayuda: `apps/web/public/debug-helper.js`

---

## Referencias a Módulos

Para información detallada sobre módulos específicos del sistema, consulta:

- [Guías de Módulos](./MODULES.md) - Guías específicas por módulo y componente

Los módulos principales documentados incluyen:
- Pipeline
- Analytics
- Auth (Autenticación y Autorización)
- Contacts

---

## Comandos Útiles

### Desarrollo

```bash
pnpm dev              # Inicia todos los servicios (TMUX)
pnpm dev:basic        # Inicia servicios sin TMUX
pnpm dev:kill         # Detiene sesión TMUX
```

### Typecheck y Lint

```bash
pnpm typecheck        # Verificar tipos en todos los workspaces
pnpm lint             # Ejecutar lint
```

### Build

```bash
pnpm build            # Build completo
pnpm -F @cactus/ui build    # Build solo UI
pnpm -F @cactus/db build    # Build solo DB
```

### Tests

```bash
pnpm test             # Unit tests
pnpm test:coverage    # Con cobertura
pnpm test:e2e         # E2E tests (Playwright)
```

### Base de Datos

```bash
pnpm -F @cactus/db generate    # Generar migración
pnpm -F @cactus/db migrate     # Aplicar migraciones
pnpm -F @cactus/db seed:all    # Seed completo
```

**⚠️ Importante:** Nunca usar `drizzle-kit push` en producción (es destructivo)

---

## Documentación Relacionada

- [Guía de Arquitectura](./ARCHITECTURE.md) - Arquitectura detallada del sistema
- [Guía de Base de Datos](./DATABASE.md) - Optimización y configuración de BD
- [Guía de Testing](./TESTING.md) - Estrategias y herramientas de testing
- [Guía de Operaciones](./OPERATIONS.md) - Deploy y monitoreo en producción
- [Guías de Módulos](./MODULES.md) - Guías específicas por módulo

