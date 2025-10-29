# 🌍 Reglas Universales de Robustez y Calidad

> 📌 **Nota**: Este documento establece las 30 reglas universales de ingeniería de software que Cursor debe seguir en todo el proyecto. Estas reglas están diseñadas para garantizar código robusto, mantenible y de calidad profesional.

---

## 📘 CÓDIGO BASE (Reglas 1-10)

### 1. Nombres Significativos y Consistentes
**Regla**: Usar nombres que indiquen propósito, no solo tipo o contexto.

- **Ejemplos buenos**: `customerFullName`, `calculateTotalPrice`, `validateUserCredentials`
- **Ejemplos malos**: `cust`, `cName`, `temp`, `data`

**Aplicación**: Si hay que explicar qué hace el nombre, está mal nombrado.

---

### 2. Funciones con Único Propósito
**Regla**: Cada función debe hacer una sola cosa y hacerla bien.

- Si una función tiene más de un motivo para cambiar, separarla
- Si al menos dos líneas empiezan con "y también...", se está rompiendo esta regla

**Aplicación**: Una función debe poder describirse en una sola oración sin usar "y".

---

### 3. Sin Variables Globales Ocultas
**Regla**: Evitar dependencias de variables que atraviesan módulos sin control.

- Depender de variables que cruzan módulos sin documentar provoca fragilidad
- Cada variable que cruza módulo-módulo debe estar explicitada y documentada

**Aplicación**: Si una variable se usa en múltiples archivos, debe estar explícita en la interfaz pública.

---

### 4. No Repetir - "Don't Repeat Yourself" (DRY)
**Regla**: Código duplicado es peligroso: cambia en un lugar, se rompe en otro.

- Si se ve la misma lógica/estructura más de una vez, factorizarla
- Un cambio en un lugar debe propagarse automáticamente

**Aplicación**: Identificar patrones repetidos y extraerlos a funciones/componentes reutilizables.

---

### 5. Legibilidad Sobre "Clever Hacks"
**Regla**: Código limpio gana mantenimiento, más gente puede comprenderlo y absorbe menos errores.

- Si hay que agregar un comentario para explicar "por qué" demasiado, considerar refactorizar
- Código obvio es preferible a código "inteligente"

**Aplicación**: Priorizar claridad sobre brillantez técnica.

---

### 6. Formato y Estilo Consistentes
**Regla**: Usar linters, formateadores y convenciones claras para eliminar debates de estilo.

- Antes de mergear, el código ya debe pasar formateador/linter sin intervención manual
- Automatizar todo lo posible

**Aplicación**: `prettier`, `eslint`, `lint-staged` deben correr automáticamente.

---

### 7. Funciones/Clases Modulares y Cortas
**Regla**: Métodos muy largos o clases que hacen "de todo" generan errores difíciles.

- Si una clase supera los ~100 líneas o una función las ~40-50, cuestionar si hace demasiado
- Preferir composición sobre clases gigantes

**Aplicación**: Si una función no cabe en una pantalla (≈50 líneas), dividirla.

---

### 8. Tests y Revisión de Código Obligatorios
**Regla**: Cualquier cambio sustancial debe tener pruebas, revisión y pasar CI antes de merge.

- No merges sin al menos: un test, un linter limpio, y un par de ojos revisando
- Badge estándar: todo cambio debe tener cobertura de tests

**Aplicación**: PR sin tests o con linter rojo = rechazo automático.

---

### 9. Documentar "Por Qué", No "Cómo"
**Regla**: El código debe ser auto-explicativo; los comentarios sirven para justificar decisiones.

- Si se explica "cómo", quizá se está ocultando que el código es confuso
- Refactorizar hasta que el código se explique solo

**Aplicación**: Comentarios deben responder "¿Por qué se hace así?" no "¿Qué hace esto?".

---

### 10. Revisión Periódica de Reglas
**Regla**: Las reglas no son eternas; deben revisarse periódicamente.

- Actualizar reglas cuando se aprenden lecciones nuevas
- Consolidar o eliminar reglas que ya no aplican

**Aplicación**: Revisar este documento cada 6 meses o al finalizar features grandes.

---

## ⚙️ ROBUSTEZ AVANZADA (Reglas 11-20)

### 11. Validar Supuestos Explícitamente
**Regla**: No asumir; validar explícitamente todos los supuestos.

- Validar que los datos existen antes de usarlos
- Validar tipos, rangos, estados esperados

**Aplicación**: Usar guards, type guards, y validaciones tempranas.

---

### 12. Fallar Rápido con Mensajes Claros
**Regla**: "Fail-fast" - detectar errores lo antes posible con mensajes claros.

- Errores inmediatos son más fáciles de debuguear que errores tardíos
- Mensajes de error deben indicar QUÉ falló y DÓNDE

**Aplicación**: Throw early, throw clearly. Mensajes descriptivos siempre.

---

### 13. Tests Previos Antes de Refactor
**Regla**: Refactorear sin tests es peligroso; siempre tener tests primero.

- Sin tests, no se puede saber si el refactor rompió algo
- "Green" tests son el contrato que se debe mantener

**Aplicación**: Red-Green-Refactor. Nunca refactorear sin tests.

---

### 14. No Optimizar Sin Métrica
**Regla**: No optimizar sin evidencia de que hay un problema.

- No asumir que algo es lento; medirlo primero
- Optimizar solo si la métrica indica necesidad

**Aplicación**: Profile first, optimize second. Nunca optimizar sin data.

---

### 15. Cambios Pequeños, Scope Controlado
**Regla**: Cambios grandes son difíciles de revertir; preferir cambios pequeños e incrementales.

- Un PR grande es difícil de revisar y más riesgoso
- Dividir cambios grandes en pasos pequeños y atómicos

**Aplicación**: Preferir 10 commits pequeños sobre 1 commit gigante.

---

### 16. Código Idempotente y Seguro
**Regla**: Operaciones deben ser idempotentes (ejecutarlas múltiples veces produce el mismo resultado).

- No debe importar cuántas veces se ejecuta algo si es idempotente
- Facilita reintentos, recovery, y pruebas

**Aplicación**: GET requests deben ser idempotentes. PUT/DELETE también.

---

### 17. Automatizar Linters, Análisis y CI
**Regla**: Humanos no deberían revisar estilo de código; automatizarlo.

- CI debe bloquear merges con errores de linter
- Ahorra tiempo y garantiza consistencia

**Aplicación**: GitHub Actions, pre-commit hooks, husky.

---

### 18. Separar Lógica y Presentación
**Regla**: Lógica de negocio no debe estar en componentes de UI.

- Separar "qué hace" de "cómo se muestra"
- Facilita testing y mantenimiento

**Aplicación**: Services, hooks, utils para lógica; componentes solo para UI.

---

### 19. Versionar Interfaces Críticas
**Regla**: Cambiar interfaces públicas sin versionar rompe integraciones.

- APIs públicas deben ser versionadas
- Cambios breaking deben ser explicitados

**Aplicación**: `/api/v1/`, `/api/v2/` o similar. Semver para librerías.

---

### 20. Documentar Soluciones Complejas Inmediatamente
**Regla**: Soluciones complejas se olvidan; documentarlas mientras se implementan.

- Hacks temporales deben tener fecha de expiración
- Workarounds deben explicar por qué y cuándo se eliminarán

**Aplicación**: TODO comments con fecha y contexto.

---

## 🚀 ESCALABILIDAD Y RESILIENCIA (Reglas 21-30)

### 21. Límite de Complejidad <10 por Función
**Regla**: Complejidad ciclomática alta = funciones difíciles de testear y mantener.

- Usar herramientas de análisis de complejidad
- Refactorizar funciones con complejidad >10

**Aplicación**: Usar herramientas como `complexity` en CI.

---

### 22. Documentar Decisiones de Arquitectura
**Regla**: Decidir sobre arquitectura no debe ser un misterio para futuros desarrolladores.

- ADRs (Architecture Decision Records) para decisiones importantes
- Explicar por qué, no solo qué

**Aplicación**: Documento `ARCHITECTURE_DECISIONS.md` o similar.

---

### 23. Ambientes Dev/Test/Prod Idénticos
**Regra**: "Works on my machine" no debe ser excusa; ambientes deben ser idénticos.

- Docker, Docker Compose, o infraestructura como código
- Mismo código corre en todos los ambientes

**Aplicación**: Containerización o IaC para consistencia.

---

### 24. Feature Flags o Rollback para Cambios Críticos
**Regra**: Poder revertir cambios críticos sin deploy es esencial.

- Feature flags permiten activar/desactivar features
- Rollback rápido si algo sale mal

**Aplicación**: Launchdarkly, Unleash, o flags simples en env vars.

---

### 25. Monitorear Regresiones Automáticamente
**Regla**: CI/CD debe detectar regresiones automáticamente.

- Tests automáticos en cada PR
- Alerts cuando algo rompe en producción

**Aplicación**: CI/CD pipeline con tests, linters, smoke tests.

---

### 26. Eliminar Código Muerto Sin Demoras
**Regla**: Código muerto es deuda técnica que acumula.

- Eliminar código que ya no se usa
- Dead code elimina confusión y reduce superficie de mantenimiento

**Aplicación**: Herramientas como `unimported`, `ts-prune` para detectar dead code.

---

### 27. Mantener Lista de Riesgos Antes de Refactor
**Regra**: Refactors grandes tienen riesgos; listarlos antes de empezar.

- Identificar qué puede romperse
- Plan de mitigación para cada riesgo

**Aplicación**: Documentar riesgos en el PR o issue antes de empezar.

---

### 28. Validar Inputs/Outputs en APIs Públicas
**Regra**: APIs públicas deben validar entradas y garantizar outputs consistentes.

- Validación temprana con schemas (Zod, Yup, etc.)
- Error messages claros para inputs inválidos

**Aplicación**: Middleware de validación en Express, tRPC, o similar.

---

### 29. Logging y Trazabilidad de Errores
**Regla**: Errores en producción deben ser trazables y logueables.

- Structured logging (JSON) para parsing
- Contexto completo: user, request ID, timestamp, stack trace

**Aplicación**: Pino para Node.js, Winston con formato JSON.

---

### 30. Revisión Semestral de Reglas Globales
**Regla**: Reglas deben evolucionar con el proyecto.

- Revisar este documento cada 6 meses
- Agregar reglas nuevas, archivar obsoletas

**Aplicación**: Tarea recurrente en el backlog del equipo.

---

## 📚 Relación con Otros Documentos

Estas reglas deben consultarse junto con:
- **`SYSTEM_NOTES.md`**: Contexto arquitectónico del proyecto
- **`ROBUSTIFY_RULES.md`**: Reglas operativas específicas de este proyecto
- **`MEMORY_ENGINE.md`**: Decisiones técnicas históricas
- **`.cursorrules`**: Convenciones del proyecto

---

## 🎯 Cómo Usar Este Documento

1. **Antes de cualquier cambio grande**: Revisar reglas relevantes
2. **Durante code review**: Usar estas reglas como checklist
3. **Al iniciar features nuevas**: Consultar reglas de arquitectura y escalabilidad
4. **Cada 6 meses**: Actualizar y consolidar reglas

---

## ✅ Verificación

**Para Cursor AI**:
- Actuar como ingeniero senior con foco en estabilidad
- Explicar justificación de cada cambio
- No eliminar comentarios, imports o tipados sin revisión
- Alinear cada mejora con las reglas 1-30
- Actualizar `MEMORY_ENGINE.md` automáticamente tras cambios significativos

**Si el modelo duda entre dos soluciones**: Elegir **la más estable, no la más creativa**.
