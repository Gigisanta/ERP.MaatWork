# Scripts de Verificación AUM

Documentación completa de los scripts de verificación para importaciones AUM (Assets Under Management).

## 📋 Scripts Disponibles

### `verify-aum-import.ts` - Verificación Completa

Script principal que verifica que todas las importaciones AUM se hayan cargado correctamente.

#### Uso Básico

```bash
# Verificar el archivo por defecto (Balanz Cactus 2025 - AUM Balanz.csv)
pnpm -F @cactus/api verify-aum-import

# Verificar un archivo específico
pnpm -F @cactus/api verify-aum-import --file "mi-archivo.csv"

# Verificar una importación específica por ID
pnpm -F @cactus/api verify-aum-import --file-id "uuid-del-archivo"

# Especificar broker
pnpm -F @cactus/api verify-aum-import --broker "balanz"
```

#### Qué Verifica

**1. Conteo de Filas**
- ✅ Total de filas en CSV vs DB
- ✅ Filas válidas vs filas cargadas
- ✅ Diferencia entre CSV y DB

**2. Campos Básicos**
- ✅ `idCuenta` (ID Cuenta)
- ✅ `comitente` (Comitente / Account Number)
- ✅ `Descripcion` (Holder Name)
- ✅ `Asesor` (Advisor)

**3. Campos Financieros**
- ✅ `AUM USD` (aum_dollars)
- ✅ `Bolsa Arg` (bolsa_arg)
- ✅ `Fondos Arg` (fondos_arg)
- ✅ `Bolsa BCI` (bolsa_bci)
- ✅ `Pesos` (pesos)
- ✅ `MEP` (mep)
- ✅ `Cable` (cable)
- ✅ `CV7000` (cv7000)

**4. Casos Especiales**
- ✅ Filas con solo Descripcion (sin idCuenta ni comitente)
- ✅ Filas faltantes en DB
- ✅ Filas en DB que no están en CSV
- ✅ Errores de mapeo

#### Salida del Script

El script genera un reporte detallado con:

```
================================================================================
REPORTE DE VERIFICACIÓN
================================================================================

📊 RESUMEN GENERAL:
   CSV filas válidas: 765
   DB filas cargadas: 765
   Diferencia: 0
   ✅ Los conteos coinciden

📋 FILAS CON SOLO DESCRIPCION:
   CSV: 36
   DB: 36
   Faltantes: 0

💰 Campos financieros:
   Estadísticas por campo:
      - AUM USD: 0 discrepancias
      - Bolsa Arg: 0 discrepancias
      ...

================================================================================
RESUMEN FINAL
================================================================================

✅ VERIFICACIÓN EXITOSA
   Todos los datos están correctamente cargados y mapeados.
   Puedes confiar en que la información está correcta.
```

#### Exit Codes

- `0`: Verificación exitosa (todos los datos correctos)
- `1`: Hay discrepancias o problemas encontrados

#### Comparación Numérica

El script usa tolerancia de `0.01` para comparar valores numéricos, lo que significa:
- `2.06` en CSV vs `2.060000` en DB = ✅ Match
- `0` en CSV vs `0.000000` en DB = ✅ Match
- `100.50` en CSV vs `100.49` en DB = ✅ Match (diferencia < 0.01)
- `100.50` en CSV vs `100.60` en DB = ❌ Mismatch (diferencia > 0.01)

#### Manejo de Valores Null/Vacíos

- CSV vacío vs DB null = ✅ Match
- CSV null vs DB null = ✅ Match
- CSV con valor vs DB null = ❌ Mismatch
- CSV null vs DB con valor = ❌ Mismatch

---

### `diagnose-missing-rows.ts` - Diagnóstico de Filas Faltantes

Script de diagnóstico para investigar por qué ciertas filas no se cargaron.

**Uso:**
```bash
pnpm -F @cactus/api tsx src/scripts/diagnose-missing-rows.ts
```

**Qué hace:**
- Analiza filas con solo Descripcion en detalle
- Verifica el mapeo de columnas
- Identifica patrones de errores
- Sugiere soluciones

---

## 🔧 Configuración

### Valores por Defecto

Edita las constantes al inicio de `verify-aum-import.ts`:

```typescript
const DEFAULT_CSV_FILE = 'Balanz Cactus 2025 - AUM Balanz.csv';
const DEFAULT_BROKER = 'balanz';
```

### Argumentos de Línea de Comandos

```bash
--file "nombre-archivo.csv"     # Especificar archivo CSV
--file-id "uuid"                # Verificar importación específica
--broker "balanz"               # Especificar broker
```

---

## 📊 Interpretación de Resultados

### ✅ Verificación Exitosa

```
✅ VERIFICACIÓN EXITOSA
   Todos los datos están correctamente cargados y mapeados.
   Puedes confiar en que la información está correcta.
```

**Significa:**
- Todas las filas del CSV están en la DB
- Todos los valores coinciden (con tolerancia numérica)
- No hay discrepancias en campos básicos ni financieros

### ⚠️ Verificación con Discrepancias

```
⚠️  VERIFICACIÓN CON DISCREPANCIAS
   Total de problemas encontrados: X
   - Filas faltantes en DB: Y
   - Filas en DB no en CSV: Z
   - Discrepancias de valores: W
```

**Acciones recomendadas:**
1. Revisar el reporte detallado
2. Verificar ejemplos de discrepancias
3. Reimportar el archivo si es necesario
4. Contactar al equipo si persisten los problemas

---

## 🎯 Casos de Uso

### Después de una Importación

```bash
# 1. Importar archivo AUM (vía UI o API)
# 2. Ejecutar verificación
pnpm -F @cactus/api verify-aum-import

# 3. Si hay problemas, revisar reporte y corregir
```

### Verificar Importación Específica

```bash
# Obtener fileId de la base de datos o UI
# Verificar esa importación específica
pnpm -F @cactus/api verify-aum-import --file-id "9034eabe-db62-452d-af53-c8f4947547be"
```

### Verificar Archivo Diferente

```bash
# Colocar archivo CSV en la raíz del proyecto
# Verificar ese archivo
pnpm -F @cactus/api verify-aum-import --file "mi-archivo.csv"
```

### En CI/CD

```yaml
# Ejemplo para GitHub Actions
- name: Verify AUM Import
  run: pnpm -F @cactus/api verify-aum-import
  continue-on-error: true
```

---

## 🔍 Troubleshooting

### Error: "No se encontró el archivo en la base de datos"

**Causas posibles:**
1. El archivo no ha sido importado aún
2. El nombre del archivo no coincide exactamente
3. El archivo fue importado con un nombre diferente

**Soluciones:**
- Verificar que el archivo haya sido importado en el sistema
- Usar `--file-id` con el UUID de la importación
- Verificar el nombre exacto del archivo en la base de datos

### Error: "No se pudo leer el archivo CSV"

**Causas posibles:**
1. El archivo no existe en la ruta especificada
2. Permisos insuficientes para leer el archivo
3. Ruta incorrecta

**Soluciones:**
- Verificar que el archivo CSV esté en la raíz del proyecto
- Verificar permisos del archivo
- Usar ruta absoluta si es necesario

### Muchas Discrepancias en Campos Financieros

**Causas posibles:**
1. Formato de números diferente (separadores de miles, decimales)
2. Redondeo en la base de datos
3. Valores null vs 0

**Soluciones:**
- Revisar ejemplos específicos en el reporte
- Verificar formato del CSV original
- Ajustar tolerancia si es necesario (editar `numericValuesMatch`)

---

## 📈 Mejores Prácticas

1. **Ejecutar después de cada importación importante**
   ```bash
   pnpm -F @cactus/api verify-aum-import
   ```

2. **Guardar reportes para auditoría**
   ```bash
   pnpm -F @cactus/api verify-aum-import > verification-report-$(date +%Y%m%d).txt
   ```

3. **Integrar en pipeline de CI/CD**
   - Ejecutar automáticamente después de imports
   - Alertar si hay discrepancias

4. **Revisar estadísticas de campos financieros**
   - Identificar campos con más problemas
   - Priorizar correcciones

---

## 🔄 Flujo de Trabajo Recomendado

```
1. Importar archivo AUM
   ↓
2. Ejecutar verificación
   pnpm -F @cactus/api verify-aum-import
   ↓
3. Revisar reporte
   - Si ✅: Continuar con el proceso
   - Si ⚠️: Revisar discrepancias y corregir
   ↓
4. Reimportar si es necesario
   ↓
5. Verificar nuevamente hasta que pase
```

---

## 📚 Referencias

- [README Principal de Scripts](./README.md)
- [Documentación de Importación AUM](../../routes/aum.ts)
- [Mapeo de Columnas AUM](../../utils/aum-column-mapper.ts)











