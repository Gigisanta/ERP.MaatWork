# Memoria: Errores Comunes y Soluciones

## Propósito
Guía rápida de errores TypeScript y de build comunes en el proyecto MAATWORK con soluciones específicas y comandos para resolverlos.

## Contexto
Usar esta memoria cuando:
- Encontrar errores de TypeScript relacionados con `exactOptionalPropertyTypes`
- Errores de build/typecheck por tipos no actualizados
- Errores de shadowing de funciones
- Errores de tipos de componentes UI
- Necesitar soluciones rápidas con comandos específicos

## Errores TypeScript Comunes

### Error: "Cannot assign undefined to optional property"

**Causa:** `exactOptionalPropertyTypes: true` en `tsconfig.base.json` no permite asignar `undefined` explícitamente.

**Ejemplo del error:**
```typescript
interface User { name?: string; }
const user: User = { name: undefined };  // ❌ ERROR
```

**Soluciones:**

```typescript
// ✅ Solución 1: Omitir propiedad si es undefined
const user: User = {};
if (someValue) user.name = someValue;

// ✅ Solución 2: Permitir null explícitamente en el tipo
interface User { name?: string | null; }
const user: User = { name: null };

// ✅ Solución 3: Usar nullish coalescing (NO ||)
const description = portfolio.description ?? null;
```

**Referencia:** `.cursor/rules/01-typescript.mdc` - Sección 1

---

### Error: "Property 'X' does not exist on type 'Y'"

**Causa común:** Tipos no actualizados después de cambios en paquetes compartidos (`@maatwork/ui`, `@maatwork/db`).

**Solución paso a paso:**

```bash
# 1. Build del paquete modificado
pnpm -F @maatwork/ui build
pnpm -F @maatwork/db build

# 2. Luego typecheck
pnpm typecheck

# 3. Si persiste, limpiar y rebuild
pnpm -F @maatwork/ui clean
pnpm -F @maatwork/ui build
```

**Prevención:** Siempre construir paquetes compartidos antes de typecheck cuando se modifican tipos exportados.

**Referencia:** `.cursor/rules/01-typescript.mdc` - Sección 5

---

### Error: "Function shadows import" o "Cannot redeclare exported function"

**Causa:** Nombre de función local igual a una función importada.

**Ejemplo del error:**
```typescript
import { createPortfolio } from '@/lib/api';
const createPortfolio = async () => { ... };  // ❌ ERROR
```

**Solución:** Usar prefijo `handle/do/perform`:

```typescript
// ✅ BIEN - Usar prefijo handle/do/perform
const handleCreatePortfolio = async () => {
  await createPortfolio({ ... });
};

// Otros ejemplos:
const handleUpdateContact = async () => { ... };
const doDeleteTeam = async () => { ... };
const performSearch = async () => { ... };
```

**Referencia:** `.cursor/rules/01-typescript.mdc` - Sección 2

---

### Error: "Property 'color' does not exist on type 'TextProps'" o similar

**Causa:** Asumir props de componentes UI sin verificar tipos.

**Ejemplo del error:**
```typescript
<Text color="error">Error</Text>  // ❌ Text no acepta "error"
```

**Solución:** Verificar tipos en `packages/ui/src/components/*` antes de usar:

```typescript
// ✅ Verificar tipos primero
// Text acepta: 'primary' | 'secondary' | 'muted'
<Text color="secondary">Error</Text>

// ✅ Button onClick espera: () => void
<Button onClick={() => router.push('/path')} />  // NO onClick={(e) => ...}
```

**Comando útil:**
```bash
# Ver tipos de componente
cat packages/ui/src/components/Text/Text.tsx
# O usar IntelliSense en el editor
```

**Referencia:** `.cursor/rules/01-typescript.mdc` - Sección 3

---

### Error: "Duplicate identifier 'X'" o "Cannot redeclare exported variable"

**Causa:** Definición duplicada de tipos/interfaces.

**Ejemplo del error:**
```typescript
export interface BenchmarkComponentForm { ... }
export interface BenchmarkComponentForm { ... }  // ❌ ERROR
```

**Solución:** Una sola definición, reutilizar desde `types/`:

```typescript
// ✅ BIEN - Definir una vez en types/[domain].ts
// types/benchmark.ts
export interface BenchmarkComponentForm { ... }

// ✅ Usar en componentes
import type { BenchmarkComponentForm } from '@/types/benchmark';
```

**Referencia:** `.cursor/rules/01-typescript.mdc` - Sección 4

---

## Errores de Build/Typecheck

### Error: "Module not found" o "Cannot find module '@maatwork/ui'"

**Causa:** Paquete no construido o dependencias no instaladas.

**Solución:**

```bash
# 1. Instalar dependencias
pnpm install --frozen-lockfile

# 2. Build paquetes compartidos
pnpm -F @maatwork/ui build
pnpm -F @maatwork/db build

# 3. Verificar build
pnpm build
```

---

### Error: Typecheck falla después de cambios en paquetes

**Causa:** Tipos exportados cambiaron pero el paquete no se reconstruyó.

**Solución:**

```bash
# Orden correcto:
# 1. Modificar código en paquete
# 2. Build del paquete
pnpm -F @maatwork/ui build

# 3. Luego typecheck en apps que lo usan
pnpm -F @maatwork/web typecheck
```

**Referencia:** `.cursor/rules/project.mdc` - Sección "Construir Paquetes Compartidos"

---

## Errores de Runtime Comunes

### Error: "Cannot read property 'X' of undefined"

**Causa:** Acceso a propiedad sin verificar existencia.

**Solución:** Usar optional chaining y nullish coalescing:

```typescript
// ❌ MAL
const name = user.profile.name;

// ✅ BIEN
const name = user.profile?.name ?? 'Unknown';
```

---

### Error: "Maximum call stack size exceeded" en logging

**Causa:** Logging recursivo o circular.

**Solución:** Usar logger estructurado (`req.log`) en lugar de `console.log`:

```typescript
// ❌ MAL
console.log({ user });  // Puede causar recursión

// ✅ BIEN
req.log.info({ userId: user.id }, 'User action');
```

**Referencia:** `.cursor/rules/patterns/logging.mdc`

---

## Comandos de Diagnóstico Rápido

```bash
# Verificar versión de TypeScript
pnpm -F @maatwork/web exec tsc --version

# Verificar tipos de un archivo específico
pnpm -F @maatwork/web exec tsc --noEmit apps/web/app/path/to/file.tsx

# Limpiar y rebuild completo
pnpm clean
pnpm install --frozen-lockfile
pnpm build

# Verificar configuración TypeScript
cat tsconfig.base.json
```

## Referencias

- Reglas relacionadas:
  - `.cursor/rules/01-typescript.mdc` (reglas TypeScript críticas)
  - `.cursor/rules/project.mdc` (arquitectura y comandos)
- Memorias relacionadas:
  - `.cursor/memories/common-workflows.md` (flujos de trabajo)
- Documentación:
  - `docs/DEVELOPMENT.md`
  - `docs/ARCHITECTURE.md`

## Última Actualización

2025-01-16 - Memoria inicial con errores comunes del proyecto




