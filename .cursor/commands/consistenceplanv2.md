<role>
Eres un ingeniero senior experto en monorepos TypeScript con pnpm workspaces, Next.js/App Router, Zod validation, Pino logging y patrones de API limpios. Priorizas código profesional: DRY, SOLID, escalable, sin dead code/duplicados, con logging consistente y rutas estandarizadas. Sé conservador: verifica exhaustivamente antes de eliminar/modificar.
</role>

<objective>
Audita y optimiza TODO el repositorio para máxima consistencia, limpieza y preparación para producción. Enfócate en:
- Eliminar código muerto/duplicado/no usado (exports, deps, archivos, TODOs obsoletos).
- Estandarizar patrones: rutas API (validate + createRouteHandler), logging (req.log / logger.ts), validaciones (schemas centralizados), imports, naming.
- Reemplazar console.log, export * from, try/catch manuales.
- Asegurar typecheck, lint, tests, build pasen limpios.
</objective>

<instructions>
ACTIVA PLAN MODE: Primero, analiza TODO el codebase (tree, package.jsons, src/routes, lib, utils, common-schemas.ts, etc.). Usa herramientas internas para grep, audit scripts y búsquedas.

Paso a paso en el plan:
1. Haz preguntas aclaratorias si necesitas (e.g., "¿Qué schemas centralizados existen ya?").
2. Genera un plan detallado en Markdown con TODOs específicos y accionables (NO vagos como "clean up results").
   - Incluye comandos exactos (pnpm audit:unused-exports, pnpm audit:deps, greps concretos).
   - Referencias precisas a archivos/folders (e.g., "En apps/api/src/routes/user.ts: reemplaza console.log por req.log.info").
   - Prioriza: Alta (dead code, deps, console.log, export *), Media (consolidaciones), Baja (docs/naming polish).
   - Incluye verificación después de cada sección grande (run tests/build).
3. Estructura el plan con secciones claras, checkboxes y Mermaid si ayuda (e.g., flow de rutas API).
4. Al final, checklist obligatorio con todos los verifies (typecheck, lint, test, build, verify:all:no-e2e sin errores; no dead code/deps/TODOs obsoletos/console.log/export *).

Solo genera el PLAN. No ejecutes cambios aún. Cuando yo apruebe/edit el plan, diré "Build" o "Execute plan".
</instructions>

<specific_tasks>
Integra estas tareas concretas en el plan:

FASE 1: Detección
- Ejecutar pnpm audit:unused-exports → verificar/eliminar exports no usados en utils/, lib/, ui/src/, db/src/.
- Ejecutar pnpm audit:deps en cada workspace → eliminar deps no usadas.
- Grep TODO/FIXME/XXX/HACK → limpiar obsoletos.
- Buscar duplicados: validaciones UUID/email/paginación → consolidar en common-schemas.ts.
- Buscar console.log → backend: req.log; frontend: logger.ts.

FASE 2: Consolidaciones
- Reemplazar export * from por named exports.
- Unificar manejo errores → createRouteHandler/createAsyncHandler + createErrorResponse/ApiError.
- Mover validaciones custom legítimas a common-schemas.ts.

FASE 3: Estandarización
- Rutas API: patrón con Zod sections, validate(), requireAuth/Role, createRouteHandler.
- Imports: orden externo → @cactus/* → relativos; usar import type.
- Naming: camelCase funcs, PascalCase components/tipos, UPPER_SNAKE constantes.
- Agregar JSDoc a funcs públicas/complejas + // AI_DECISION para decisiones.

FASE 4: Verificación
- Secuencial: pnpm typecheck → lint → test → build → verify:all:no-e2e → fix hasta pasar todo.
</specific_tasks>

<output_format>
## Análisis Inicial del Codebase
[Resumen de findings clave]

## Preguntas Aclaratorias (si aplica)
- ...

## Plan Detallado de Optimización
### Alta Prioridad
- [ ] Tarea específica con archivo/comando...

### Media Prioridad
...

### Baja Prioridad
...

## Checklist Final Obligatorio
- [ ] pnpm typecheck pasa
- [ ] No dead code/exports/deps
- ... (todos los checks)

## Mermaid (opcional)
```mermaid
...
</output_format>
Analiza el repo y genera el plan ahora.