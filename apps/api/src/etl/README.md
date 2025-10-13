# ETL Sistema - EPIC A: Datos & Atribución (AUM/Comisiones)

## 📋 Descripción General

Sistema de extracción, transformación y carga (ETL) para procesar reportes de Cluster Cuentas y Comisiones desde archivos Excel hacia el modelo de datos dimensional.

---

## 🏗️ Arquitectura

```
┌─────────────────┐
│ Upload Excel    │
│ (.xlsx files)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parser          │
│ - Validación    │
│ - Tipado        │
│ - Normalización │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Loader          │
│ - Upsert dims   │
│ - Insert facts  │
│ - Auditoría     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Database        │
│ - dim_client    │
│ - fact_aum_*    │
│ - map_*         │
└─────────────────┘
```

---

## 📁 Estructura de Módulos

### `/parsers/`
Parsers específicos por tipo de reporte.

- **`cluster-cuentas.ts`**: Parser para el reporte "Cluster Cuentas"
  - Valida tipos de datos
  - Aplica normalización
  - Genera métricas de calidad
  
- **`comisiones.ts`** *(STORY 3)*: Parser para el reporte "Comisiones"

### `/loaders/`
Loaders que proyectan datos validados a DB.

- **`cluster-cuentas-loader.ts`**: Carga de Cluster Cuentas
  - Upsert a `dim_client`
  - Insert/Update a `fact_aum_snapshot`
  - Registro en `map_cuenta_variantes`

- **`comisiones-loader.ts`** *(STORY 3)*: Carga de Comisiones

### `/`
Módulos compartidos.

- **`types.ts`**: Tipos TypeScript compartidos
- **`normalization.ts`**: Funciones de normalización de cadenas y tipos
- **`__tests__/`**: Tests unitarios (Jest)

---

## 🔧 Uso

### API Endpoint

```http
POST /etl/cluster-cuentas
Content-Type: multipart/form-data

file: [archivo.xlsx]
snapshotDate: 2025-10-09  # Opcional, default: hoy
```

### Response

```json
{
  "parseMetrics": {
    "filasLeidas": 1000,
    "filasValidas": 998,
    "filasRechazadas": 2,
    "filasInsertadas": 998,
    "tiempoMs": 1523,
    "warnings": [],
    "errors": [
      "Fila 45: AUM en Dolares inválido",
      "Fila 123: comitente faltante"
    ]
  },
  "loadResult": {
    "clientesCreados": 50,
    "clientesActualizados": 948,
    "snapshotsCreados": 998,
    "errors": []
  },
  "success": true
}
```

### Códigos de Estado

- **200**: Éxito total
- **207**: Multi-Status (parcialmente exitoso, ver `errors`)
- **400**: Bad Request (archivo faltante o fecha inválida)
- **500**: Error interno del servidor

---

## ✅ Validaciones Implementadas

### Campos Obligatorios
- `comitente` (integer, not null)
- `cuotapartista` (integer, not null)
- `AUM en Dolares` (numeric ≥ 0, not null)

### Validaciones Monetarias
- Suma de breakdowns ≈ AUM total (±0.01)
- AUM no negativo

### Normalización de Cadenas

#### Cuentas
```typescript
Raw:  "Cuenta... 123.45"
Norm: "CUENTA 12345"
```

**Reglas**:
1. UPPER case
2. Sin tildes (`normalize('NFD')`)
3. Quitar "..." y puntuación
4. Collapse spaces
5. Trim

#### Asesores
```typescript
Raw:  "Juan Pérez 2 - 1"
Norm: "JUAN PEREZ"
```

**Reglas**:
1. Quitar sufijos `\s+\d+\s*-\s*\d+\s*$`
2. UPPER case
3. Sin tildes
4. Trim

---

## 🧪 Tests

### Ejecutar Tests

```bash
pnpm -F @cactus/api test
```

### Cobertura

```bash
pnpm -F @cactus/api test --coverage
```

### Tests Implementados (STORY 2)

1. ✅ `normalizeCuenta` con puntos suspensivos
2. ✅ `normalizeCuenta` con tildes
3. ✅ `normalizeCuenta` collapse spaces
4. ✅ `normalizeCuenta` null/undefined
5. ✅ `normalizeAsesor` quitar sufijos
6. ✅ `normalizeAsesor` tildes
7. ✅ `castToInt` truncado (no redondeo)
8. ✅ `castToInt` strings
9. ✅ `castToBoolean` 0/1
10. ✅ `castToBoolean` strings ("true", "yes", "sí")
11. ✅ `validateBreakdownSum` tolerancia ±0.01
12. ✅ `levenshteinDistance` fuzzy matching

**Total: 12 tests** (supera DoD de 10 tests)

---

## 📊 Métricas de Calidad

### Criterios de Aceptación (STORY 2)

- **✅ % de filas válidas ≥ 99.5%**
  - Validado en `validarCriterioAceptacion()`
  
- **✅ AUM agregado = suma de breakdowns (±0.01)**
  - Validado en `validateBreakdownSum()`
  
- **✅ Tipos correctos ≥ 99.5%**
  - Validado en `validateClusterCuentasRow()`

### Métricas Disponibles

```typescript
interface IngestaMetrics {
  filasLeidas: number;
  filasValidas: number;
  filasRechazadas: number;
  filasInsertadas: number;
  tiempoMs: number;
  warnings: string[];
  errors: string[];
}
```

---

## 🔍 Troubleshooting

### Error: "comitente inválido o faltante"

**Causa**: El campo `comitente` está vacío, null o no es numérico.

**Solución**: Verificar que todas las filas del Excel tengan un valor numérico en la columna `comitente`.

---

### Error: "Suma de breakdowns no coincide con AUM"

**Causa**: La suma de `bolsa_arg + fondos_arg + ... + cv10000` difiere de `AUM en Dolares` por más de 0.01.

**Solución**: Revisar los datos del Excel. Puede ser un error de cálculo en la fuente.

---

### Error: "Archivo no reconocido"

**Causa**: El archivo no es `.xlsx` o `.xls`.

**Solución**: Asegurar que el archivo esté en formato Excel válido.

---

## 🚀 Roadmap

### ✅ STORY 2 (Completado)
- Parser de Cluster Cuentas
- Normalización de cadenas
- Proyección a `dim_client` y `fact_aum_snapshot`
- Tests unitarios (12/10)

### 🚧 STORY 3 (Siguiente)
- Parser de Comisiones
- Validación de splits de comisión
- Proyección a `fact_commission`

### 📋 STORY 4 (Planeado)
- Motor de matching Cliente ↔ Comisión ↔ Asesor
- Matching determinístico (P1-P4)
- Auditoría de matching

---

## 📝 Referencias

- **Jira**: KAN-123 (STORY 2 - Ingesta de Reporte Cluster Cuentas)
- **Diccionario de Datos**: `packages/db/EPIC_A_DATA_DICTIONARY.md`
- **Schema DB**: `packages/db/src/schema.ts` (líneas 966-1259)
- **Epic**: KAN-121 (EPIC A — Datos & Atribución)

---

## 📅 Changelog

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0.0 | 2025-10-09 | Cursor AI | Implementación inicial STORY 2 |




