# Guía de Optimización

Esta guía documenta las estrategias de optimización implementadas y recomendadas para el proyecto CACTUS CRM.

## Índice

1. [Consolidación de Dependencias](#consolidación-de-dependencias)
2. [Optimización de TypeScript](#optimización-de-typescript)
3. [Optimización de Builds](#optimización-de-builds)
4. [Optimización de Bundle Size](#optimización-de-bundle-size)
5. [Path Aliases](#path-aliases)
6. [Scripts Consolidados](#scripts-consolidados)
7. [Archivos Grandes](#archivos-grandes)
8. [Métricas y Monitoreo](#métricas-y-monitoreo)

---

## Consolidación de Dependencias

### Principios

1. **Evitar duplicación**: Cada dependencia debe estar solo donde se usa
2. **Workspace packages primero**: Usar `workspace:*` para paquetes internos
3. **PeerDependencies correctas**: React/React-DOM como peerDependencies en UI

### Dependencias Consolidadas

| Paquete | Ubicación Correcta | Notas |
|---------|-------------------|-------|
| `lucide-react` | `packages/ui`, `apps/web` | UI library lo usa internamente, web lo importa directamente |
| `@tanstack/react-virtual` | `packages/ui` | Solo para virtualización en componentes UI |
| `jose` | `apps/api` | Solo para JWT en backend |
| `react`, `react-dom` | root (overrides) | Versionado unificado vía pnpm overrides |

### Comando para Verificar

```bash
# Ver árbol de dependencias
pnpm why <package-name>

# Verificar duplicados
pnpm dedupe --check
```

---

## Optimización de TypeScript

### Configuración Base

El archivo `tsconfig.base.json` define configuraciones compartidas:

```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Incremental Builds

Todos los `tsconfig.json` tienen habilitado incremental builds:

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

**Impacto**: Reduce tiempo de typecheck 15-25% en builds subsiguientes.

### Herencia de Configuración

```
tsconfig.base.json
├── apps/api/tsconfig.json (extends)
├── apps/web/tsconfig.json (extends)
├── packages/db/tsconfig.json (extends)
└── packages/ui/tsconfig.json (extends)
```

---

## Optimización de Builds

### Turbo Cache

El archivo `turbo.json` está configurado para caching óptimo:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "!**/*.test.*"]
    }
  }
}
```

### Comandos Optimizados

```bash
# Build con cache
pnpm build

# Build limpio (sin cache)
pnpm build:clean

# Solo typecheck (más rápido)
pnpm typecheck
```

---

## Optimización de Bundle Size

### Límites Establecidos

| Métrica | Límite |
|---------|--------|
| First Load JS | 300KB |
| Individual Chunk | 200KB |
| Total Bundle | 1MB |

### Verificación

```bash
# Build y verificar
pnpm -F @cactus/web build
pnpm -F @cactus/web check:bundle

# Análisis detallado
pnpm -F @cactus/web analyze
```

### Code Splitting Configurado

En `apps/web/next.config.js`:

```javascript
// Chunks separados para librerías grandes
config.optimization.splitChunks.cacheGroups.recharts = {
  test: /[\\/]node_modules[\\/]recharts[\\/]/,
  name: 'recharts',
  priority: 30
};
```

### Tree-shaking

**Preferir imports específicos**:

```typescript
// ✅ BIEN - Tree-shakeable
import { Search, Plus } from 'lucide-react';

// ❌ MAL - Importa todo el paquete
import * as Icons from 'lucide-react';
```

---

## Path Aliases

### Aliases Disponibles en `apps/web`

| Alias | Ruta | Uso |
|-------|------|-----|
| `@/*` | `./*` | Imports generales |
| `@/lib/*` | `./lib/*` | Utilidades |
| `@/types/*` | `./types/*` | Tipos TypeScript |
| `@/components/*` | `./app/components/*` | Componentes |
| `@/hooks/*` | `./lib/hooks/*` | Custom hooks |
| `@/auth/*` | `./app/auth/*` | Autenticación |
| `@/utils/*` | `./lib/utils/*` | Utilidades |
| `@cactus/ui` | UI package | Design system |

### Ejemplo de Uso

```typescript
// ✅ BIEN - Con alias
import { logger } from '@/lib/logger';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/hooks/useToast';

// ❌ MAL - Con rutas relativas profundas
import { logger } from '../../../lib/logger';
```

---

## Scripts Consolidados

### Script de Limpieza (`scripts/dev-clean.js`)

Script cross-platform que:
- Mata procesos en puertos 3000, 3001, 3002
- Funciona en Windows, macOS y Linux
- Soporta modo silencioso (`--quiet`)

```bash
# Ejecutar manualmente
node scripts/dev-clean.js

# Con modo silencioso
node scripts/dev-clean.js --quiet
```

### Scripts Deprecados

Los siguientes scripts están deprecados y serán removidos:
- `scripts/dev-clean.ps1` (usar `dev-clean.js`)
- `scripts/dev-clean.sh` (usar `dev-clean.js`)

---

## Archivos Grandes

### Límites Recomendados

- **Archivos**: Máximo 300 líneas
- **Funciones**: Máximo 50 líneas
- **Clases**: Máximo 100 líneas

### Archivos Ya Modularizados

| Archivo Original | Refactorización |
|-----------------|-----------------|
| `apps/api/src/routes/contacts/` | Dividido en `create.ts`, `get.ts`, `list.ts`, `update.ts`, `delete.ts` |
| `apps/api/src/routes/teams/` | Dividido en `index.ts`, `schemas.ts` |

### Archivos Pendientes de Refactorización

| Archivo | Líneas | Prioridad |
|---------|--------|-----------|
| `packages/db/src/schema.ts` | ~1759 | Media |
| `packages/db/src/seed-full.ts` | ~1552 | Baja |

### Estrategia de Modularización

1. **Crear directorio** con el mismo nombre
2. **Dividir por dominio** o responsabilidad
3. **Mantener barrel export** (`index.ts`) para compatibilidad
4. **Migrar imports** gradualmente

---

## Métricas y Monitoreo

### Comandos de Auditoría

```bash
# Auditar archivos grandes
npx tsx scripts/audit-large-files.ts

# Auditar console logs
npx tsx scripts/audit-console-logs.ts

# Auditar manejo de errores
npx tsx scripts/audit-error-handling.ts

# Auditar código duplicado
npx tsx scripts/audit-code-duplication.ts
```

### Reportes Generados

Los scripts de auditoría generan reportes que pueden ejecutarse según necesidad. Los reportes históricos se mantienen solo temporalmente para análisis.

---

## Checklist de Optimización

Antes de cada release, verificar:

- [ ] `pnpm typecheck` pasa sin errores
- [ ] `pnpm test` pasa sin errores
- [ ] `pnpm -F @cactus/web check:bundle` dentro de límites
- [ ] No hay dependencias duplicadas (`pnpm dedupe --check`)
- [ ] Archivos nuevos siguen límites de tamaño

---

## Referencias

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Turborepo Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [TypeScript Performance](https://github.com/microsoft/TypeScript/wiki/Performance)

