# Error de Webpack: "Cannot read properties of undefined (reading 'call')"

## Problema

Error en la aplicación al cargar cualquier página:

```
TypeError: Cannot read properties of undefined (reading 'call')
    at options.factory (webpack.js:715:31)
    at eval (SkeletonLoader.tsx:12:79)
```

## Causa

Caché corrupto de Next.js (carpeta `.next`) que contiene módulos webpack compilados con referencias incorrectas.

## Solución

### 1. Limpiar caché de Next.js

```bash
cd apps/web
rm -rf .next
```

### 2. Reconstruir paquetes internos

```bash
# Reconstruir @maatwork/ui (dependencia de SkeletonLoader)
pnpm -F @maatwork/ui build

# Opcional: Reconstruir @maatwork/db si es necesario
pnpm -F @maatwork/db build
```

### 3. Verificar tipos

```bash
# Verificar que no hay errores de TypeScript
pnpm typecheck

# O solo web
pnpm -F @maatwork/web typecheck
```

### 4. Reiniciar servidor de desarrollo

```bash
pnpm dev
```

## Prevención

- **No editar manualmente archivos en `.next`**: Son generados automáticamente
- **Limpiar caché después de cambios en `@maatwork/ui`**: Los componentes UI compartidos pueden causar problemas de caché
- **Usar `pnpm dev` limpio**: Si el error persiste después de cambios grandes, reiniciar el proceso dev

## Script Automatizado

Hemos creado un script para automatizar la limpieza de cachés:

```bash
./scripts/clean-webpack-cache.sh
```

Este script:
- Detiene servidores de desarrollo
- Limpia caché de Next.js y webpack
- Reconstruye @maatwork/ui
- Verifica que el build fue exitoso

## Archivos Relacionados

- `packages/ui/src/components/feedback/SkeletonLoader.tsx` - Componente afectado
- `apps/web/app/contacts/components/FiltersDropdown.tsx` - Otro componente afectado
- `apps/web/.next/` - Caché de Next.js (ignorar en git)
- `apps/web/config/webpack.js` - Configuración de webpack con filesystem cache
- `scripts/clean-webpack-cache.sh` - Script de limpieza automatizado

## Nota Técnica

El `SkeletonLoader.tsx` ya tiene una solución implementada (AI_DECISION en líneas 21-24) para evitar problemas de resolución de módulos webpack creando una función `cn` local en lugar de importarla de `@maatwork/ui`. Sin embargo, el caché corrupto aún puede causar problemas que requieren limpieza manual.

