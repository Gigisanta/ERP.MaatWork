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

### Changed
- Reglas ESLint más estrictas: `@typescript-eslint/no-explicit-any` ahora es `error`
- Regla ESLint agregada para prohibir barrel exports en todos los workspaces
- Pre-commit hook ahora incluye typecheck de paquetes compartidos

### Fixed
- Tipos mejorados en `useEntityWithComponents` hook
- Tipos mejorados en `db-transactions` utility
- Tipos mejorados en `AssetSearcher` component
- Tipos mejorados en `bloomberg` API client




