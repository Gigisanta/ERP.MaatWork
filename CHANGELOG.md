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
- Typecheck agregado a pre-commit hook
- Dependencias reorganizadas en workspaces correctos
- Depcheck configurado para detectar dependencias no usadas
- Changesets configurado para gestión de versiones
- Documentación AI_DECISION para feature flags y TODOs en tags handlers

### Changed
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











