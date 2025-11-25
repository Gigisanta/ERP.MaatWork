# Mantenimiento de Memorias Cursor

## Propósito

Este documento describe el proceso de mantenimiento, revisión y actualización de las memorias en `.cursor/memories/`.

## Frecuencia de Revisión

### Revisión Mensual
- Revisar todas las memorias una vez al mes
- Verificar que siguen siendo relevantes
- Actualizar ejemplos y referencias si es necesario
- Eliminar información obsoleta

### Actualización Inmediata
Actualizar memorias inmediatamente cuando:
- Cambian patrones del proyecto
- Se identifican nuevos errores comunes
- Se establecen nuevas preferencias de código
- Cambian decisiones arquitectónicas

## Checklist de Revisión

Para cada memoria, verificar:

- [ ] ¿La memoria sigue siendo relevante?
- [ ] ¿Los ejemplos son actuales y funcionan?
- [ ] ¿Las referencias a código/reglas son correctas?
- [ ] ¿Hay redundancia con otras memorias/reglas?
- [ ] ¿Falta información importante?
- [ ] ¿El formato sigue el estándar establecido?
- [ ] ¿Las referencias cruzadas son correctas?

## Proceso de Creación de Nueva Memoria

### Cuándo Crear una Nueva Memoria

Crear nueva memoria cuando:
- Se identifica un patrón recurrente que no está documentado
- Se establece una nueva preferencia o convención
- Se documenta una decisión arquitectónica importante
- Se necesita guía para resolver problemas comunes

**NO crear memoria para:**
- Información que ya está en reglas (usar reglas en su lugar)
- Información temporal o específica de una tarea
- Información que cambia frecuentemente

### Qué Información Incluir

1. **Propósito**: Una línea clara explicando para qué sirve
2. **Contexto**: Cuándo usar esta memoria
3. **Contenido Principal**: 
   - Ejemplos concretos del proyecto
   - Comandos específicos cuando aplique
   - Código real cuando sea posible
4. **Referencias**: 
   - Reglas relacionadas
   - Otras memorias relacionadas
   - Documentación relevante
   - Código específico

### Cómo Estructurarla

Seguir el template estándar:

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

### Cómo Referenciarla

1. **Actualizar README.md**: Agregar entrada en índice
2. **Agregar referencias cruzadas**: En memorias relacionadas
3. **Actualizar reglas si aplica**: Mencionar memoria relacionada en regla

## Proceso de Actualización de Memoria Existente

### Pasos

1. **Identificar necesidad de actualización**
   - Cambio en patrones del proyecto
   - Nuevo error común identificado
   - Información obsoleta detectada

2. **Verificar impacto**
   - ¿Afecta otras memorias?
   - ¿Necesita actualizar referencias cruzadas?
   - ¿Requiere actualizar README.md?

3. **Actualizar contenido**
   - Mantener formato estándar
   - Agregar ejemplos concretos
   - Actualizar referencias si es necesario

4. **Actualizar fecha**
   - Cambiar "Última Actualización" al final del archivo

5. **Verificar referencias cruzadas**
   - Asegurar que otras memorias/reglas referencian correctamente

## Proceso de Eliminación de Memoria

### Cuándo Eliminar

Eliminar memoria cuando:
- Información completamente obsoleta
- Redundante con reglas o documentación
- Ya no es relevante para el proyecto

### Pasos

1. **Verificar referencias**
   ```bash
   # Buscar referencias a la memoria
   grep -r "memoria-obsoleta.md" .cursor/
   ```

2. **Actualizar referencias**
   - Eliminar referencias en otras memorias
   - Actualizar README.md si es necesario

3. **Eliminar archivo**
   ```bash
   rm .cursor/memories/memoria-obsoleta.md
   ```

4. **Commit con mensaje descriptivo**
   ```bash
   git commit -m "docs: remove obsolete memory memoria-obsoleta.md"
   ```

## Mejores Prácticas

### Contenido

- ✅ **Específico**: Ejemplos concretos del proyecto, no genéricos
- ✅ **Accionable**: Comandos específicos, no descripciones vagas
- ✅ **Actualizado**: Revisar periódicamente y actualizar cuando cambia el proyecto
- ✅ **Conectado**: Referencias cruzadas con reglas y documentación

### Formato

- ✅ **Consistente**: Seguir template estándar
- ✅ **Organizado**: Secciones claras y bien estructuradas
- ✅ **Legible**: Ejemplos de código formateados correctamente
- ✅ **Enfocado**: < 200 líneas idealmente, mantener enfocado

### Mantenimiento

- ✅ **Revisión periódica**: Mensual como mínimo
- ✅ **Actualización inmediata**: Cuando cambian patrones
- ✅ **Eliminación proactiva**: Eliminar información obsoleta
- ✅ **Documentación**: Documentar cambios importantes

## Ejemplos de Buenas Prácticas

### ✅ Memoria Bien Estructurada

```markdown
# Memoria: Errores Comunes y Soluciones

## Propósito
Guía rápida de errores TypeScript comunes con soluciones específicas.

## Contexto
Usar cuando encontrar errores relacionados con exactOptionalPropertyTypes.

## Error: "Cannot assign undefined to optional property"

**Causa:** exactOptionalPropertyTypes: true no permite asignar undefined.

**Solución:**
```typescript
// ✅ Omitir propiedad
const user: User = {};
```

## Referencias
- Regla: `.cursor/rules/01-typescript.mdc`
```

### ❌ Memoria Mal Estructurada

```markdown
# Errores

Algunos errores comunes son...

A veces pasa esto...

También puede pasar esto otro...
```

## Automatización

### Scripts Útiles

```bash
# Verificar que todas las memorias tienen formato estándar
grep -L "## Propósito" .cursor/memories/*.md

# Buscar referencias rotas
grep -r "\.cursor/rules/.*\.mdc" .cursor/memories/ | \
  while read line; do
    file=$(echo "$line" | cut -d: -f1)
    ref=$(echo "$line" | cut -d: -f2- | grep -o '\.cursor/rules/[^)]*')
    if [ ! -f "$ref" ]; then
      echo "Broken reference in $file: $ref"
    fi
  done
```

## Referencias

- [Índice de Memorias](./README.md)
- [Sistema de Reglas](../rules/README.md)
- [Documentación de Cursor Memories](https://docs.cursor.com/es/context/memories)

## Última Actualización

2025-01-16 - Guía inicial de mantenimiento




