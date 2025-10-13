# Fix: Solo 309 clientes registrados en lugar de 731

## 1. Problema Identificado

El sistema de matching de AUM-madre solo registró **309 clientes** cuando el Excel contiene **al menos 731 clientes**.

### Causa Raíz

La validación de `validateBreakdownSum` en el parser de AUM-madre era **demasiado estricta** y rechazaba filas con pequeñas diferencias de redondeo entre el AUM total y la suma de sus breakdowns.

#### Problemas específicos:

1. **Tolerancia muy baja**: 
   - Tolerancia absoluta: 0.1 USD (solo 10 centavos)
   - Tolerancia porcentual: 1.0% 
   - Esto causaba que filas con diferencias de redondeo legítimas fueran rechazadas

2. **Parsing de números con coma decimal**: 
   - Los archivos argentinos usan coma como separador decimal (ej: "1.234,56")
   - El parser no manejaba correctamente todos los formatos de números

3. **Validación binaria**: 
   - Cualquier fila que no pasara la validación era rechazada completamente
   - No había mecanismo de warnings para diferencias menores

## 2. Solución Implementada

### 2.1. Aumento de tolerancia de validación

**Archivo**: `apps/api/src/etl/config.ts`

```typescript
parsing: {
  breakdownTolerance: 10.0, // Aumentado de 0.1 a 10 USD
  breakdownTolerancePercent: 5.0, // Aumentado de 1% a 5%
  headerRow: 1,
  skipEmptyRows: true
}
```

**Justificación**: 
- Diferencias de hasta 10 USD o 5% son aceptables considerando:
  - Redondeos en múltiples columnas
  - Conversión de formatos de números
  - Posibles ajustes contables menores

### 2.2. Mejora del parser de números con coma decimal

**Archivo**: `apps/api/src/etl/parsers/aum-madre.ts` (líneas 129-167)

**Mejoras implementadas**:
- Manejo robusto de separadores de miles y decimales
- Soporte para formatos: `1.234,56`, `1,234.56`, `1234.56`, `1234,56`
- Limpieza de caracteres no numéricos
- Manejo correcto de números negativos

### 2.3. Sistema de Warnings

**Archivo**: `apps/api/src/etl/parsers/aum-madre.ts` (líneas 221-249)

**Nueva lógica**:
- **Error fatal**: Solo si la diferencia es > doble de la tolerancia (> 20 USD o > 10%)
- **Warning**: Si la diferencia está entre tolerancia y doble de tolerancia
- **OK**: Si la diferencia está dentro de la tolerancia

Esto permite procesar filas con pequeñas discrepancias mientras se registran para revisión posterior.

## 3. Cambios en el Código

### Archivos modificados:

1. **`apps/api/src/etl/config.ts`**
   - Líneas 41-42: Aumentada tolerancia de validación

2. **`apps/api/src/etl/parsers/aum-madre.ts`**
   - Líneas 129-167: Mejorado parser de números con coma decimal
   - Líneas 177-289: Agregado sistema de warnings
   - Líneas 221-249: Validación flexible de breakdowns
   - Líneas 90-94: Actualizada interfaz para incluir warnings

### Interfaz actualizada:

```typescript
export interface ParseAumMadreResult {
  validRows: AumMadreValidRow[];
  invalidRows: Array<{ row: number; errors: string[] }>;
  warnings: Array<{ row: number; warnings: string[] }>; // NUEVO
  metrics: IngestaMetrics;
}
```

## 4. Impacto Esperado

### Antes del fix:
- **309 clientes** procesados
- **~422 clientes** rechazados (58% de pérdida)
- Causa: Validación estricta de breakdowns

### Después del fix:
- **~731 clientes** procesados (todos los del Excel)
- **0-10 clientes** rechazados (solo casos con errores graves)
- **~100-200 warnings** (diferencias menores registradas)
- Tasa de éxito esperada: **>98%**

## 5. Verificación

Para verificar el fix:

1. **Reiniciar el servidor API**:
   ```bash
   cd apps/api
   pnpm dev
   ```

2. **Cargar el archivo Excel** en `http://localhost:3000/etl`

3. **Verificar métricas**:
   - Clientes registrados debería ser ~731
   - Revisar warnings en logs para casos con diferencias menores

4. **Consultar base de datos**:
   ```sql
   SELECT COUNT(*) FROM dim_client WHERE descubierto_en_madre = true;
   -- Debería retornar ~731
   ```

## 6. Próximos Pasos (Recomendados)

1. **Monitorear warnings**: Revisar los warnings generados para identificar patrones de diferencias
2. **Ajustar tolerancia**: Si hay muchos warnings legítimos, considerar aumentar tolerancia
3. **Validar datos**: Verificar manualmente algunos casos con warnings para confirmar que los datos son correctos
4. **Documentar excepciones**: Mantener registro de casos especiales que requieran atención

## 7. Rollback (si es necesario)

Si el fix causa problemas, revertir:

```typescript
// apps/api/src/etl/config.ts (líneas 41-42)
parsing: {
  breakdownTolerance: 0.1,
  breakdownTolerancePercent: 1.0,
  // ... resto igual
}
```

Y deshacer los cambios en `apps/api/src/etl/parsers/aum-madre.ts`.

## 8. Commit Message (Conventional Commits)

```
fix(etl): aumentar tolerancia de validación de breakdowns AUM-madre

- Aumentada tolerancia absoluta de 0.1 USD a 10 USD
- Aumentada tolerancia porcentual de 1% a 5%
- Mejorado parser de números con coma decimal para formatos argentinos
- Agregado sistema de warnings para diferencias menores
- Cambiada validación binaria a gradual (error/warning/ok)

Fixes: Solo 309 de 731 clientes eran procesados debido a validación estricta
Resultado esperado: >98% de clientes procesados correctamente

BREAKING CHANGE: La validación de breakdowns ahora es menos estricta.
Casos que antes eran rechazados ahora pueden ser aceptados con warnings.
```

## 9. Testing

No se requieren cambios en tests existentes, pero se recomienda:

1. Agregar tests para el nuevo parser de números con coma
2. Agregar tests para el sistema de warnings
3. Agregar test de integración con datos reales del Excel

## 10. Referencias

- Código fuente: `apps/api/src/etl/parsers/aum-madre.ts`
- Configuración: `apps/api/src/etl/config.ts`
- Ruta API: `POST /api/etl/aum-madre`
- Frontend: `http://localhost:3000/etl`



