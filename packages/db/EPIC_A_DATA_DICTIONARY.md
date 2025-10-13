# EPIC A — Datos & Atribución (AUM/Comisiones)
## Diccionario de Datos

### Versión: 1.0.0
### Fecha: 2025-10-09
### Status: ✅ Implementado (STORY 1)

---

## 📋 Resumen Ejecutivo

Este documento describe el modelo de datos canónico para el sistema de atribución de AUM (Assets Under Management) y comisiones del CRM Cactus. El modelo sigue una arquitectura dimensional (star schema) con staging, dimensiones, hechos y tablas de mapeo.

### Objetivos del Modelo
- Normalizar datos de múltiples fuentes (reportes Excel de Cluster Cuentas y Comisiones)
- Soportar matching determinístico cliente ↔ comisión ↔ asesor
- Distinguir entre dueño del cliente (`owner`) y beneficiario de comisión (`benef`)
- Auditar decisiones de matching con trazabilidad completa
- Garantizar consistencia monetaria con validaciones automáticas

---

## 🏗️ Arquitectura del Modelo

```
┌─────────────────┐
│    STAGING      │
├─────────────────┤
│ stg_cluster_    │
│   cuentas       │
│ stg_comisiones  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│   DIMENSIONES   │      │     MAPEO       │
├─────────────────┤      ├─────────────────┤
│ dim_client      │◄─────┤ map_cuenta_     │
│ dim_advisor     │      │   variantes     │
└────────┬────────┘      │ map_asesor_     │
         │               │   variantes     │
         │               └─────────────────┘
         ▼
┌─────────────────┐      ┌─────────────────┐
│     HECHOS      │      │    AUDITORÍA    │
├─────────────────┤      ├─────────────────┤
│ fact_aum_       │      │ matching_       │
│   snapshot      │      │   audit         │
│ fact_commission │      └─────────────────┘
└─────────────────┘
```

---

## 📊 Tablas de Staging

### `stg_cluster_cuentas`

**Propósito**: Almacena datos crudos del reporte "Cluster Cuentas" (Excel).

**Campos Clave**:
| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `comitente` | `integer` | ID de comitente | ⚠️ Casted de decimal a int |
| `cuotapartista` | `integer` | ID de cuotapartista | ⚠️ Casted de decimal a int |
| `cuenta` | `text` | Número de cuenta (raw) | Requiere normalización |
| `asesor` | `text` | Nombre del asesor (raw) | Puede contener sufijos "2 - 1" |
| `aum_en_dolares` | `numeric(18,6)` | AUM total en USD | |
| `bolsa_arg`, `fondos_arg`, etc. | `numeric(18,6)` | Breakdowns por tipo de activo | |

**Reglas de Validación**:
- `comitente` y `cuotapartista` deben ser numéricos válidos
- La suma de breakdowns debe aproximarse a `aum_en_dolares` (±0.02)

**Procesamiento**: Campo `processed` marca si ya fue proyectado a dimensiones/hechos.

---

### `stg_comisiones`

**Propósito**: Almacena datos crudos del reporte "Comisiones" (Excel).

**Campos Clave**:
| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `fecha_concertacion` | `date` | Fecha de la operación | |
| `comitente`, `cuotapartista` | `integer` | IDs del cliente | Para matching |
| `comision_dolarizada` | `numeric(18,6)` | Comisión en USD | **Fuente de verdad** |
| `porcentaje` | `numeric(7,4)` | % de split de comisión | Default: 100% |
| `id_persona_asesor` | `integer` | ID del asesor | **Source of truth** para dim_advisor |
| `asesor` | `text` | Nombre del asesor (raw) | Requiere normalización |

**Reglas de Validación**:
- `comision_dolarizada >= 0`
- Si `comision_dolarizada` es null → `comision_pesificada / cotizacion_dolar`
- Suma de `comision_dolarizada * (porcentaje/100)` por operación debe = `comision_dolarizada` (±0.01)

**Índices**: Por `fecha_concertacion` y `comitente` para performance en matching.

---

## 🎯 Dimensiones

### `dim_client`

**Propósito**: Dimensión de clientes normalizada.

**Claves Primarias Naturales**: `(comitente, cuotapartista)` → unique constraint

**Campos**:
| Campo | Tipo | Descripción | Normalización |
|-------|------|-------------|---------------|
| `id` | `uuid` | Clave surrogada | Generated |
| `comitente` | `integer` | ID comitente | NOT NULL |
| `cuotapartista` | `integer` | ID cuotapartista | NOT NULL |
| `cuenta_norm` | `text` | Cuenta normalizada | UPPER, sin tildes, trim, collapse spaces |
| `es_juridica` | `boolean` | ¿Es persona jurídica? | |
| `equipo`, `unidad` | `text` | Dimensiones de agrupación | |

**Normalización de `cuenta_norm`**:
```
Raw: "Cuenta... 123.45"
Norm: "CUENTA 12345"
```

**Auditoría**: `created_at`, `updated_at` para tracking de cambios.

---

### `dim_advisor`

**Propósito**: Dimensión de asesores normalizada.

**Clave Natural**: `id_persona_asesor` (desde `stg_comisiones`) → unique

**Campos**:
| Campo | Tipo | Descripción | Normalización |
|-------|------|-------------|---------------|
| `id` | `uuid` | Clave surrogada | Generated |
| `id_persona_asesor` | `integer` | ID del asesor | UNIQUE, source of truth |
| `asesor_norm` | `text` | Nombre normalizado | REGEXP_REPLACE + UPPER + trim |
| `cuil_asesor` | `text` | CUIL del asesor | |
| `equipo`, `unidad` | `text` | Dimensiones | |
| `arancel`, `esquema_comisiones` | `text` | Config comercial | |

**Normalización de `asesor_norm`**:
```sql
REGEXP_REPLACE(asesor_raw, '\s+\d+\s*-\s*\d+$','') -- Quita "2 - 1"
UPPER(...)
TRIM(...)
```

---

## 📈 Tablas de Hechos

### `fact_aum_snapshot`

**Propósito**: Snapshots diarios de AUM por cliente.

**Granularidad**: (snapshot_date, id_client) → unique

**Campos**:
| Campo | Tipo | Descripción | Validación |
|-------|------|-------------|------------|
| `snapshot_date` | `date` | Fecha del snapshot | Parametrizable en ingesta |
| `id_client` | `uuid` | FK → dim_client | NOT NULL |
| `id_advisor_owner` | `uuid` | FK → dim_advisor (dueño) | Nullable |
| `aum_usd` | `numeric(18,6)` | AUM total en USD | NOT NULL |
| `bolsa_arg`, `fondos_arg`, ... | `numeric(18,6)` | Breakdowns | Default: 0 |

**Constraint de Validación**:
```sql
ABS(aum_usd - (bolsa_arg + fondos_arg + ... + cv10000)) <= 0.02
```

**Índices**:
- Por `snapshot_date` (rango de fechas)
- Por `id_advisor_owner` (agregación por asesor)

---

### `fact_commission`

**Propósito**: Registro de comisiones por operación.

**Granularidad**: `op_id` (generado) → unique

**Campos**:
| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `op_id` | `text` | ID único de operación | Generado: `{fecha}_{comitente}_{ticker}_{seq}` |
| `fecha` | `date` | Fecha de concertación | |
| `id_client` | `uuid` | FK → dim_client | NOT NULL |
| `id_advisor_benef` | `uuid` | FK → dim_advisor (beneficiario) | Nullable |
| `comision_usd` | `numeric(18,6)` | Comisión bruta en USD | NOT NULL |
| `comision_usd_alloc` | `numeric(18,6)` | Con split aplicado | `comision_usd * (porcentaje_alloc/100)` |
| `porcentaje_alloc` | `numeric(7,4)` | % aplicado | Default: 100 |
| `owner_vs_benef_mismatch` | `boolean` | Flag de mismatch | `true` si owner ≠ benef |

**Validación Monetaria**:
```sql
SUM(comision_usd_alloc) per operation = comision_usd ± 0.01
```

**Índices**:
- Por `fecha` (reportes temporales)
- Por `id_client` (vista por cliente)
- Por `id_advisor_benef` (vista por asesor)
- Por `tipo` (filtrado por tipo de operación)

---

## 🗺️ Tablas de Mapeo

### `map_asesor_variantes`

**Propósito**: Mapea variantes de nombres de asesores a `dim_advisor`.

**Uso**: Resolver nombres inconsistentes antes de matching final.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `asesor_raw` | `text` | Nombre original (unique) |
| `asesor_norm` | `text` | Nombre normalizado |
| `id_advisor` | `uuid` | FK → dim_advisor (nullable hasta resolver) |
| `confidence` | `numeric(4,3)` | Score de matching (0-1) |

**Ejemplo**:
```
asesor_raw: "Juan Perez 2 - 1"
asesor_norm: "JUAN PEREZ"
id_advisor: uuid-xxx
confidence: 1.000
```

---

### `map_cuenta_variantes`

**Propósito**: Registra heurísticas de normalización de cuentas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `cuenta_raw` | `text` | Cuenta original (unique) |
| `cuenta_norm` | `text` | Cuenta normalizada |
| `heuristica` | `text` | Regla aplicada (documentación) |

---

## 🔍 Auditoría de Matching

### `matching_audit`

**Propósito**: Traza completa de decisiones de matching.

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `run_id` | `uuid` | FK → integration_runs (contexto) |
| `source_table` | `text` | `stg_cluster_cuentas` \| `stg_comisiones` |
| `source_record_id` | `uuid` | ID del registro de staging |
| `match_status` | `text` | `matched` \| `multi_match` \| `no_match` \| `mismatch_owner_benef` \| `pending` |
| `match_rule` | `text` | `P1_comitente` \| `P2_cuotapartista` \| `P3_cuenta_norm` \| `P4_fuzzy` |
| `target_client_id` | `uuid` | FK → dim_client (si matched) |
| `target_advisor_id` | `uuid` | FK → dim_advisor (si matched) |
| `confidence` | `numeric(4,3)` | Score de matching |
| `context` | `jsonb` | Metadata adicional (candidatos, scores, etc.) |
| `resolved_by_user_id` | `uuid` | FK → users (si resolución manual) |
| `resolved_at` | `timestamp` | Timestamp de resolución |

**Estados de Matching**:
- **`matched`**: Match exitoso con alta confianza
- **`multi_match`**: Múltiples candidatos con scores similares
- **`no_match`**: Sin candidatos válidos
- **`mismatch_owner_benef`**: Cliente matched pero owner ≠ benef
- **`pending`**: Requiere revisión manual

**Reglas de Matching (Orden de Prioridad)**:
1. **P1_comitente**: Match exacto por `comitente` (int)
2. **P2_cuotapartista**: Match exacto por `cuotapartista` (int)
3. **P3_cuenta_norm**: Match exacto por `cuenta_norm` (text normalizado)
4. **P4_fuzzy**: Match fuzzy por `cuenta_norm` (Levenshtein ≤ 2) → **pending**

---

## 📐 Criterios de Aceptación (STORY 1)

### ✅ Validaciones Implementadas

1. **Integridad Referencial**:
   - Todas las FK hacia `dim_client`, `dim_advisor`, `users`, `integration_runs` definidas
   - Cascade deletes configurados donde corresponde

2. **Constraints de Datos**:
   - `fact_aum_snapshot`: suma de breakdowns ≈ `aum_usd` (±0.02)
   - Unique constraints en keys naturales: `(comitente, cuotapartista)`, `id_persona_asesor`, `op_id`

3. **Índices de Performance**:
   - Staging: por fecha y comitente
   - Hechos: por fecha, cliente, asesor
   - Dimensiones: por campos de búsqueda y agrupación

4. **Auditoría**:
   - `created_at`, `updated_at` en dimensiones
   - `matching_audit` registra todas las decisiones con timestamp

### 📊 Métricas de Calidad

- **Tasa de Match**: ≥ 95% de comisiones en estado `matched` (según Jira KAN-125)
- **Precisión Monetaria**: Diferencias ≤ 0.01 en sumas de comisiones
- **Precisión AUM**: Diferencias ≤ 0.02 en sumas de breakdowns

---

## 🚀 Comandos de Migración

```bash
# Generar migración (ya ejecutado)
pnpm -F @cactus/db generate

# Aplicar migración a DB
pnpm -F @cactus/db push
# O con verificación manual:
pnpm -F @cactus/db migrate
```

---

## 📝 Notas de Implementación

### Decisiones de Diseño

1. **UUID vs. IDs Naturales**: Se usa UUID como clave surrogada para flexibilidad, pero se preservan claves naturales con unique constraints.

2. **Numeric Precision**: 
   - Montos: `numeric(18,6)` → 12 enteros + 6 decimales
   - Cantidades: `numeric(28,8)` → precisión para instrumentos fraccionarios
   - Porcentajes: `numeric(7,4)` → 3 enteros + 4 decimales (0.0000 - 100.0000)

3. **Normalización**: Se preserva el dato raw en staging y se normaliza en dimensiones para trazabilidad completa.

4. **Soft Deletes**: No implementados en este modelo; se confía en auditoría y versionado de integration_runs.

### Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Cambio en formato de Excel | Alto | Parser configurable + staging raw |
| Asesores con nombres inconsistentes | Medio | Tabla `map_asesor_variantes` + UI de resolución |
| Comisiones sin cliente matching | Medio | Estado `pending` + bandeja de pendientes (STORY 5) |
| Splits de comisión mal configurados | Bajo | Validación suma de `comision_usd_alloc` |

---

## 🔗 Referencias

- **Jira**: KAN-122 (STORY 1 - Modelo de datos canónico)
- **Schema**: `packages/db/src/schema.ts` (líneas 966-1259)
- **Migración**: `packages/db/migrations/0001_icy_sasquatch.sql`
- **Epic**: KAN-121 (EPIC A — Datos & Atribución)

---

## 📅 Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0.0 | 2025-10-09 | Cursor AI | Creación inicial - STORY 1 completada |





