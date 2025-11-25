# Guía de Pruebas del Sistema AUM

## Scripts Disponibles

### 1. `verify:aum:csv` - Verificación de CSVs
Compara los dos archivos CSV sin necesidad de API.

```bash
pnpm verify:aum:csv
```

**Qué verifica:**
- ✅ Consistencia entre CSV1 y CSV2
- ✅ Filas únicas en cada CSV
- ✅ Diferencias en valores financieros
- ✅ Preservación de asesores

**Salida:** `aum-csv-verification-report.json`

### 2. `verify:aum` - Verificación con API
Compara CSVs con datos en la base de datos (requiere API y autenticación).

```bash
pnpm verify:aum
```

**Requisitos:**
- API corriendo en `http://localhost:3001`
- Autenticación configurada (variable `AUTH_COOKIE`)

**Salida:** `aum-verification-report.json`

### 3. `test:aum:full` - Prueba End-to-End Completa
Prueba todo el sistema automáticamente.

```bash
pnpm test:aum:full
```

**Qué hace:**
1. ✅ Verifica que los archivos CSV existan
2. ✅ Lee y parsea los CSVs
3. ✅ Calcula estadísticas
4. ✅ Intenta conectar con la API
5. ✅ Compara datos si la API está disponible
6. ✅ Genera reporte completo

**Salida:** `aum-full-test-report.json`

## Flujo de Trabajo Recomendado

### Antes de Importar

```bash
# 1. Verificar CSVs
pnpm verify:aum:csv
```

Esto te mostrará:
- Si hay problemas en los CSVs
- Cuántas filas se importarán
- Cuántos asesores se preservarán

### Después de Importar

```bash
# 2. Verificar importación completa
pnpm test:aum:full
```

Esto verificará:
- ✅ Que los datos se cargaron correctamente
- ✅ Que los asesores se preservaron
- ✅ Que no hay discrepancias

## Interpretación de Resultados

### ✅ Todo Correcto
- CSVs válidos
- Datos cargados en DB
- Asesores preservados
- Sin discrepancias críticas

### ⚠️ Advertencias
- Diferencias en valores financieros (normal, CSV2 es más reciente)
- Filas nuevas en CSV2 (normal)
- Algunas filas solo en CSV1 (normal si no tienen accountNumber)

### ❌ Errores
- Asesores perdidos (debe investigarse)
- Filas faltantes en DB (debe investigarse)
- Valores incorrectos (debe investigarse)

## Notas Importantes

1. **Diferencias en valores financieros son normales** porque CSV2 es más reciente
2. **CSV2 no tiene asesores** - el sistema debe preservarlos del CSV1
3. **Filas nuevas en CSV2** son normales en archivos mensuales
4. **La API requiere autenticación** - el script intentará conectarse pero puede fallar si no estás autenticado

## Solución de Problemas

### API no responde
- Verifica que la API esté corriendo: `pnpm -F @cactus/api dev`
- Verifica la URL en el script si usas un puerto diferente

### No autenticado
- El script continuará solo con verificación de CSVs
- Para verificación completa, necesitas autenticarte primero

### Archivos no encontrados
- Asegúrate de que los CSVs estén en la raíz del proyecto
- Verifica los nombres de archivo en el script

## Reportes Generados

Todos los scripts generan reportes JSON con información detallada:

- `aum-csv-verification-report.json` - Comparación de CSVs
- `aum-verification-report.json` - Comparación CSV vs DB
- `aum-full-test-report.json` - Reporte completo del sistema

