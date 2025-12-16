# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Auditoría técnica completa del repositorio
- Plan de mejoras técnicas implementado
- Eliminación de usos de `any` en TypeScript (tipos específicos creados)
- Eliminación de barrel exports que rompen tree-shaking
- **Limpieza de código muerto:** Eliminados 5 archivos de barrel exports no utilizados (608 exports total)
  - `apps/web/lib/api/index.ts` (177 exports)
  - `apps/api/src/utils/index.ts` (165 exports)
  - `apps/web/types/index.ts` (116 exports)
  - `packages/ui/src/components/index.ts` (86 exports)
  - `packages/ui/src/components/feedback/index.ts` (80 exports)
- **Refactorización de archivos largos:** `contacts/create.ts` reducido 34% (350→230 líneas)
  - Extraídas funciones `validateAdvisorAssignment()` y `resolvePipelineStage()` a `utils.ts`
- **Consolidación de patrones:** Nueva función helper `requireContactAccess()` en `route-handler.ts`
- Typecheck agregado a pre-commit hook
- Dependencias reorganizadas en workspaces correctos
- Depcheck configurado para detectar dependencias no usadas
- Changesets configurado para gestión de versiones
- Documentación AI_DECISION para feature flags y TODOs en tags handlers

### Changed
- **Login Redirect:** Redirección después del login ahora va directo a `/home` en lugar de `/`
  - Elimina ciclo de redirecciones innecesarias
  - Mejora experiencia de usuario después del login
- **Contacts Page:** Simplificada navegación tabla/kanban
  - Eliminado selector local de vista tabla/kanban
  - Agregado botón "Pipeline" que navega a `/pipeline` (vista kanban real)
  - Clarifica: `/contacts` = tabla con inline editing, `/pipeline` = kanban con drag & drop
  - Removido estado `viewMode` de `useContactsFilters` hook
  - Eliminada vista kanban local (duplicada) de página de contactos
- Reglas ESLint más estrictas: `@typescript-eslint/no-explicit-any` ahora es `error`
- Regla ESLint agregada para prohibir barrel exports en todos los workspaces
- Pre-commit hook ahora incluye typecheck de paquetes compartidos
- **API Versioning:** Todas las rutas ahora requieren prefijo `/v1/` obligatoriamente
  - Eliminadas rutas sin versión en backend (`apps/api/src/index.ts`)
  - Migradas todas las rutas del frontend a `/v1/` (`apps/web/lib/api-hooks.ts`)
- **Route Handlers:** Estandarizado uso de `createRouteHandler` vs `createAsyncHandler`
  - Documentados casos legítimos de `createAsyncHandler` (cookies, headers personalizados, streaming)
  - Migrado endpoint `/health/database` a `createRouteHandler`
- **Frontend Patterns:** Migrados patrones legacy a componentes modernos
  - Reemplazado `confirm()` nativo con componente `ConfirmDialog` en AUM rows page
  - Documentadas excepciones legítimas para `window.location` y `fetch()` directo
- **API Exports:** Reemplazados `export *` con exports específicos en `apps/web/lib/api/index.ts`
  - Mejora tree-shaking y reduce bundle size
  - Cumple con reglas ESLint del proyecto
  - Mantiene compatibilidad con imports existentes
- **Error Handling:** Estandarizado manejo de errores en endpoints
  - Migrados endpoints de test (`/test-db`, `/test-cactus-db`) a `createAsyncHandler`
  - Estandarizados errores en `attachments.ts` usando `createErrorResponse`
  - Estandarizados errores en `tags/handlers/rules.ts` y `tags/handlers/segments.ts`

### Fixed
- Tipos mejorados en `useEntityWithComponents` hook
- Tipos mejorados en `db-transactions` utility
- Tipos mejorados en `AssetSearcher` component
- Tipos mejorados en `bloomberg` API client
- Tipado mejorado de `memoryUsage` en endpoints de métricas (eliminado uso de `any`)
- Ruta `/v1/bloomberg` agregada al backend (estaba importada pero no registrada)
- Tests actualizados para usar rutas versionadas `/v1/`
- Consistencia en formato de respuestas de error (todos usan `createErrorResponse`)
- **Build Errors:** Corregido error de ISR con cookies en páginas autenticadas
  - Cambiadas 4 páginas de `revalidate` a `dynamic = 'force-dynamic'`: `/teams`, `/benchmarks`, `/portfolios`, `/analytics`
  - Causa: ISR no puede pre-renderizar páginas que usan `cookies()` para autenticación
  - Documentado en `docs/troubleshooting/isr-cookies-error.md`
- **Webpack Module Errors:** Corregido error "Cannot read properties of undefined (reading 'call')"
  - Limpiado caché corrupto de webpack filesystem con limpieza nuclear
  - Reconstruido paquete `@cactus/ui` completamente sin cache
  - Creado script automatizado `scripts/clean-webpack-cache.sh` para prevención
  - Documentado en `docs/troubleshooting/webpack-skeleton-error.md`
  - Agregada guía de limpieza de caché del navegador en `docs/troubleshooting/browser-cache-cleanup.md`
- **AuthContext 401s Redundantes:** Eliminados 401s innecesarios en verificación de sesión
  - Removida llamada redundante a `/logout` cuando `/users/me` devuelve 401
  - El middleware ya se encarga de limpiar cookies expiradas
  - Mejora claridad de logs y debugging











