# Sistema de Reglas Cursor - CACTUS CRM

Este proyecto usa un sistema de reglas modular organizado por dominio y patrón para mejorar la calidad de código y comprensión contextual de Cursor AI.

## Estructura

```
.cursor/rules/
├── 00-core.mdc              # Reglas base siempre aplicadas
├── 01-typescript.mdc        # Reglas TypeScript
├── 02-testing.mdc           # Reglas de testing
├── domains/
│   ├── api.mdc              # Backend API
│   ├── web.mdc              # Frontend Next.js
│   ├── ui-package.mdc       # UI Components
│   ├── database.mdc         # Database
│   └── python.mdc           # Analytics Service
└── patterns/
    ├── error-handling.mdc   # Manejo de errores
    ├── logging.mdc          # Logging estructurado
    ├── security.mdc         # Seguridad y auth
    ├── api-design.mdc       # Diseño de API
    └── performance.mdc      # Optimización
```

## Reglas Base

### 00-core.mdc
**Siempre aplica** (`alwaysApply: true`)

- Arquitectura general del monorepo
- Principios fundamentales
- Comandos útiles
- Referencias rápidas

### 01-typescript.mdc
**Aplica inteligentemente** - Se activa automáticamente al editar archivos TypeScript

- Reglas críticas TypeScript (exactOptionalPropertyTypes)
- Arquitectura de tipos
- Manejo de propiedades opcionales
- Evitar shadowing
- Construir paquetes antes de typecheck

### 02-testing.mdc
**Aplica inteligentemente** - Se activa automáticamente al editar archivos de test

- Framework stack (Vitest, Playwright, Testing Library)
- Ubicación de tests
- Coverage targets
- Patrones de testing

## Reglas por Dominio

### domains/api.mdc
**Aplica inteligentemente** - Se activa automáticamente al editar código del backend API

- Estructura de rutas Express
- Validaciones con Zod
- Middleware patterns
- Cliente API centralizado
- Logging con pino

### domains/web.mdc
**Aplica inteligentemente** - Se activa automáticamente al editar código del frontend Next.js

- Server Component Architecture
- Client Islands pattern
- SWR configuration
- Next.js App Router patterns

### domains/ui-package.mdc
**Aplica inteligentemente** - Se activa automáticamente al editar componentes UI

- Estructura de componentes
- Exports específicos (tree-shaking)
- Tipos exportados explícitamente
- Tests co-ubicados

### domains/database.mdc
**Aplica inteligentemente** - Se activa automáticamente al editar código de base de datos

- Migraciones (generate + migrate, NO push)
- Seeds disponibles
- Singleton db()
- Schema patterns

### domains/python.mdc
**Aplica inteligentemente** - Se activa automáticamente al editar código Python

- Estructura del servicio Python
- Patrones de yfinance client
- Caching con TTLCache

## Reglas por Patrón

### patterns/error-handling.mdc
**Aplica inteligentemente** - Se activa automáticamente al trabajar con manejo de errores

- Uso de `createErrorResponse()` y `ApiError`
- Códigos HTTP consistentes
- Manejo de errores transitorios
- No exponer detalles en producción

### patterns/logging.mdc
**Aplica inteligentemente** - Se activa automáticamente al trabajar con logging

- Uso de `req.log` (pino) vs `console.log`
- Niveles de log apropiados
- Contexto estructurado
- Prevención de recursión

### patterns/security.mdc
**Aplica inteligentemente** - Se activa automáticamente al trabajar con seguridad y autenticación

- Middleware `requireAuth` y `requireRole`
- Validación de tokens JWT
- Headers de seguridad (Helmet)
- Sanitización de inputs

### patterns/api-design.mdc
**Aplica inteligentemente** - Se activa automáticamente al diseñar endpoints de API

- Estructura RESTful
- Paginación consistente
- Request IDs
- Versionado `/v1/`

### patterns/performance.mdc
**Aplica inteligentemente** - Se activa automáticamente al trabajar con optimización

- Caching con ETags
- SWR configuration
- Batch queries (evitar N+1)
- Timeouts dinámicos

## Cómo Funciona

Las reglas se aplican automáticamente según el contexto del archivo que estás editando:

1. **00-core.mdc** siempre se aplica (arquitectura general)
2. Las demás reglas se aplican **inteligentemente** cuando Cursor detecta que son relevantes al contexto
3. Cursor AI analiza el contenido y contexto del archivo para determinar qué reglas aplicar
4. Esto elimina problemas con globs que no coinciden y mejora la precisión de aplicación

## Ejemplos de Aplicación

### Editando un archivo de API
```
apps/api/src/routes/contacts.ts
```
**Reglas aplicadas:**
- 00-core.mdc (siempre)
- 01-typescript.mdc (archivo .ts)
- domains/api.mdc (ruta API)
- patterns/error-handling.mdc (utils/lib)
- patterns/logging.mdc (apps/api/src)
- patterns/security.mdc (auth/middleware si aplica)
- patterns/api-design.mdc (routes)

### Editando un componente React
```
packages/ui/src/components/Button.tsx
```
**Reglas aplicadas:**
- 00-core.mdc (siempre)
- 01-typescript.mdc (archivo .tsx)
- domains/ui-package.mdc (packages/ui/src)
- 02-testing.mdc (si hay Button.test.tsx abierto)

### Editando un test
```
apps/api/src/routes/contacts.test.ts
```
**Reglas aplicadas:**
- 00-core.mdc (siempre)
- 01-typescript.mdc (archivo .ts)
- 02-testing.mdc (archivo .test.ts)
- domains/api.mdc (apps/api/src)

## Beneficios

1. **Aplicación Contextual**: Reglas solo se aplican cuando son relevantes
2. **Mejor Comprensión**: Cursor AI recibe contexto específico según archivo
3. **Mantenibilidad**: Reglas más pequeñas y enfocadas son más fáciles de actualizar
4. **Performance**: Menos tokens procesados al aplicar solo reglas relevantes
5. **Claridad**: Desarrolladores pueden entender qué reglas aplican a cada área

## Mantenimiento

### Agregar Nueva Regla

1. Crear archivo `.mdc` en el directorio apropiado
2. Agregar metadatos MDC con `description` y `alwaysApply: false`
3. NO usar `globs` - dejar que Cursor aplique inteligentemente
4. Documentar en este README

### Actualizar Regla Existente

1. Editar el archivo `.mdc` correspondiente
2. Mantener formato MDC consistente
3. Actualizar este README si cambia el alcance

### Validar Reglas

```bash
# Verificar que todos los archivos .mdc tienen metadatos válidos
# Verificar que no hay duplicación de reglas
# Verificar que solo 00-core.mdc tiene alwaysApply: true
```

## Referencias

- [Documentación de Cursor Rules](https://docs.cursor.com/en/context/rules)
- [Formato MDC](https://docs.cursor.com/en/context/rules#mdc-format)

