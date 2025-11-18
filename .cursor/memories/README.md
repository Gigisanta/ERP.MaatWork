# Índice de Memorias Cursor

## Propósito

Este directorio contiene memorias contextuales para Cursor AI que documentan preferencias, decisiones, flujos de trabajo y soluciones específicas del proyecto CACTUS CRM.

## Diferencia entre Memorias y Reglas

### Reglas (`.cursor/rules/`)
- **Qué hacer**: Instrucciones persistentes para el agente
- **Aplicación**: Automática según contexto (globs, alwaysApply)
- **Formato**: MDC con metadatos
- **Ejemplo**: "Usar Zod para validaciones", "Server Components por defecto"

### Memorias (`.cursor/memories/`)
- **Por qué y cómo resolver**: Contexto histórico, preferencias, soluciones
- **Aplicación**: Referenciadas manualmente o automáticamente por Cursor
- **Formato**: Markdown estándar
- **Ejemplo**: "Por qué elegimos Server Components", "Cómo resolver error X"

## Categorización de Memorias

### Terminal y Configuración

#### `terminal-best-practices.md`
Guía completa para evitar cuelgues de terminal y usar comandos de forma segura.
- Comandos no-interactivos con flags específicos
- Timeouts y límites
- Troubleshooting de cuelgues
- Comandos específicos del proyecto CACTUS

**Cuándo usar:** Al ejecutar comandos de terminal desde Cursor o troubleshooting de cuelgues.

#### `cursor-settings.md`
Configuración recomendada de Cursor IDE para el proyecto.
- Settings de TypeScript strict mode
- Configuración para monorepo (pnpm workspaces)
- Settings de terminal y editor
- Variables de entorno

**Cuándo usar:** Al configurar Cursor por primera vez o optimizar settings.

---

### Desarrollo

#### `common-workflows.md`
Flujos paso a paso para tareas comunes de desarrollo.
- Agregar nuevo endpoint API
- Crear nuevo componente UI
- Agregar migración de base de datos
- Hacer refactor grande
- Checklist pre-commit

**Cuándo usar:** Al realizar tareas comunes de desarrollo que requieren pasos específicos.

#### `code-style-preferences.md`
Convenciones de código y estilo específicas del proyecto.
- Convenciones de nombrado (camelCase, PascalCase)
- Estilo de funciones (async/await, early returns)
- Estilo de comentarios (JSDoc, inline)
- Patrones de importación
- Preferencias de formato

**Cuándo usar:** Al escribir nuevo código o revisar código existente.

#### `common-errors-solutions.md`
Guía rápida de errores comunes con soluciones específicas.
- Errores TypeScript con `exactOptionalPropertyTypes`
- Errores de build/typecheck
- Errores de shadowing de funciones
- Errores de tipos de componentes UI
- Comandos de diagnóstico

**Cuándo usar:** Al encontrar errores comunes y necesitar soluciones rápidas.

---

### Arquitectura

#### `architecture-decisions.md`
Decisiones arquitectónicas clave en formato ADR (Architecture Decision Record).
- Server Components por defecto
- Patrón Client Islands
- Cliente API centralizado
- Validación siempre en backend (Zod)
- Migraciones con generate + migrate
- Monorepo con pnpm + Turborepo
- TypeScript strict mode

**Cuándo usar:** Al entender por qué se eligió una solución arquitectónica o evaluar cambios.

---

### Testing

#### `testing-preferences.md`
Estándares y preferencias de testing específicas del proyecto.
- Framework stack (Vitest, Playwright, Testing Library)
- Ubicación de tests
- Coverage targets
- Estructura de tests (AAA pattern)
- Mocking preferido
- Patrones específicos del proyecto

**Cuándo usar:** Al escribir nuevos tests o revisar tests existentes.

---

## Guía de Uso

### Para Desarrolladores

1. **Nuevo en el proyecto**: Leer `architecture-decisions.md` y `common-workflows.md`
2. **Encontrar error**: Consultar `common-errors-solutions.md`
3. **Escribir código**: Revisar `code-style-preferences.md`
4. **Escribir tests**: Consultar `testing-preferences.md`
5. **Configurar entorno**: Revisar `cursor-settings.md` y `terminal-best-practices.md`

### Para Cursor AI

Las memorias se aplican automáticamente cuando:
- Cursor genera código relacionado con el tema
- Se menciona un concepto relacionado en la conversación
- Se referencia explícitamente con `@memories`

### Referencias Cruzadas

Las memorias están conectadas con:
- **Reglas**: `.cursor/rules/**/*.mdc` (instrucciones de qué hacer)
- **Documentación**: `docs/**/*.md` (documentación detallada)
- **Código**: Referencias a archivos específicos cuando aplica

## Estructura de una Memoria

Todas las memorias siguen este formato estándar:

```markdown
# Memoria: [Título Descriptivo]

## Propósito
[Una línea explicando para qué sirve esta memoria]

## Contexto
[Cuándo usar esta memoria]

## Contenido Principal
[Secciones organizadas con ejemplos concretos]

## Referencias
- Reglas relacionadas: `.cursor/rules/[archivo].mdc`
- Memorias relacionadas: `.cursor/memories/[archivo].md`
- Documentación: `docs/[archivo].md`
- Código relevante: `[ruta]`

## Última Actualización
[Fecha o versión]
```

## Mantenimiento

Ver `.cursor/memories/MAINTENANCE.md` para:
- Proceso de revisión periódica
- Cuándo crear nueva memoria
- Cómo actualizar memorias existentes
- Checklist de calidad

## Referencias

- [Documentación de Cursor Memories](https://docs.cursor.com/es/context/memories)
- [Sistema de Reglas](./rules/README.md)
- [Documentación del Proyecto](../../docs/README.md)

## Última Actualización

2025-01-16 - Índice inicial de memorias



