---
trigger: always_on
---

# Productivity Rules

Estas reglas están diseñadas para maximizar la efectividad de los agentes de IA en este repositorio.

## Principios de Acción

1. **Proactividad Extrema**: No esperes a que el usuario pida corregir un error obvio o mejorar un log. Si ves algo roto o subóptimo mientras trabajas en una tarea, actúa.
2. **Contexto Primero**: Antes de escribir código, usa las herramientas de búsqueda (`grep_search`, `find_by_name`) para entender cómo se resuelven problemas similares en el repo. Sigue los patrones establecidos.
3. **Validación Continua**: Cada cambio debe ser validado. Si el proyecto tiene tests, ejecútalos. Si no, realiza una inspección manual rigurosa o crea un test rápido si es posible.
4. **Pensamiento Secuencial**: Para tareas complejas, utiliza el MCP de `sequentialthinking` para desglosar el problema antes de ejecutar.
5. **Memoria de Largo Plazo**: Utiliza el MCP de `memory` para guardar decisiones de diseño importantes que deban persistir entre sesiones.

## Estilo de Trabajo

- **Basenames en Enlaces**: Siempre usa el nombre base del archivo para los enlaces en los artifacts (ej. [utils.ts](file:///path/to/utils.ts)).
- **Alertas Estratégicas**: Usa alertas de GitHub (`> [!IMPORTANT]`, etc.) para resaltar puntos críticos en los planes de implementación.
- **Merge & Push**: Sigue el flujo `/pushmerge` cuando trabajes en ramas de feature para asegurar que el master esté siempre actualizado y limpio.

## Herramientas MCP Recomendadas

- **Context7**: Para dudas sobre librerías externas (Drizzle, Next.js, etc.). Usa `query-docs`.
- **GitKraken**: Para historial de archivos y culpas (`git_blame`) antes de refactorizar código antiguo.
