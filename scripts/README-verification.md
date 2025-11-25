# Scripts de Verificación de Importación AUM

## Descripción

Estos scripts permiten verificar que los datos importados desde los archivos CSV sean correctos y consistentes.

## Scripts Disponibles

### 1. `verify-aum-csv-only.js`

Compara directamente los dos archivos CSV sin necesidad de conectarse a la API.

**Uso:**
```bash
pnpm verify:aum:csv
```

**Qué verifica:**
- Consistencia entre CSV1 y CSV2
- Filas que solo están en un CSV
- Diferencias en valores financieros
- Preservación de asesores (CSV1 tiene asesores, CSV2 no)
- Estadísticas generales de los datos

**Salida:**
- Reporte en consola
- Archivo JSON: `aum-csv-verification-report.json`

### 2. `verify-aum-import.js`

Compara los CSVs con los datos cargados en la base de datos a través de la API.

**Uso:**
```bash
pnpm verify:aum
```

**Requisitos:**
- API corriendo en `http://localhost:3001` (o configurar `API_BASE_URL`)
- Autenticación (configurar `AUTH_COOKIE` si es necesario)

**Qué verifica:**
- Todos los checks de `verify-aum-csv-only.js`
- Coincidencia entre CSVs y datos en DB
- Filas faltantes en la base de datos
- Valores incorrectos en la base de datos
- Preservación correcta de asesores después de la actualización

**Salida:**
- Reporte en consola
- Archivo JSON: `aum-verification-report.json`

## Interpretación de Resultados

### Diferencias en Valores Financieros

Es **normal** que haya diferencias en valores financieros entre CSV1 y CSV2 porque:
- CSV2 es más reciente y contiene valores actualizados
- Los valores cambian con el tiempo (movimientos, cotizaciones, etc.)

### Filas Solo en un CSV

- **Solo en CSV1**: Filas que estaban en el archivo master pero no en el mensual
- **Solo en CSV2**: Filas nuevas que aparecieron en el archivo mensual

### Preservación de Asesores

El sistema debe preservar los asesores del CSV1 cuando CSV2 no los tiene. El script verifica:
- ✅ **Asesores preservados**: Asesores del CSV1 que se mantienen correctamente
- ❌ **Asesores perdidos**: Asesores del CSV1 que se perdieron durante la actualización

## Ejemplo de Uso

```bash
# 1. Verificar CSVs antes de importar
pnpm verify:aum:csv

# 2. Importar archivos
# (usar la interfaz web)

# 3. Verificar que la importación fue correcta
pnpm verify:aum
```

## Estructura del Reporte JSON

```json
{
  "timestamp": "2025-11-11T02:28:21.587Z",
  "stats": {
    "csv1Total": 765,
    "csv2Total": 766,
    "commonRows": 715,
    "csv1Only": 50,
    "csv2Only": 51,
    "discrepancies": 693
  },
  "discrepancies": [...],
  "csv1Only": [...],
  "csv2Only": [...],
  "advisorIssues": [...]
}
```

## Notas Importantes

1. **Diferencias esperadas**: Los valores financieros pueden diferir entre CSVs porque CSV2 es más reciente
2. **Asesores**: CSV1 tiene asesores, CSV2 no. El sistema debe preservar los asesores del CSV1
3. **Filas nuevas**: Es normal que CSV2 tenga filas nuevas que no estaban en CSV1
4. **Tolerancia numérica**: El script usa una tolerancia de 0.01 para comparar números (para manejar redondeos)

