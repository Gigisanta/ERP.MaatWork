# Mejoras Implementadas en el Sistema de Importación AUM

## Resumen de Cambios

Basado en los resultados de los scripts de verificación, se han realizado mejoras para asegurar que la importación funcione perfectamente:

- **CSV1**: 765 filas (721 con asesor)
- **CSV2**: 766 filas (0 con asesor)
- **715 filas comunes**
- **707 asesores que se preservarían**

## Mejoras Implementadas

### 1. Mejora en la Herencia de Asesor (`apps/api/src/routes/aum/upload.ts`)

**Problema**: Cuando CSV2 tiene `accountNumber` pero CSV1 solo tenía `holderName` o `idCuenta`, el sistema no encontraba la fila existente para heredar el asesor.

**Solución**:
- Buscar por `accountNumber` normalizado primero
- Si no se encuentra, buscar también por `idCuenta` si existe
- Si aún no se encuentra o el CSV actual no trae asesor, buscar por `holderName`
- Combinar resultados de todas las búsquedas para maximizar la preservación del asesor

**Código mejorado**:
```typescript
// Buscar por accountNumber normalizado
if (normalizedAccountNumber && existingAccounts.has(normalizedAccountNumber)) {
  existingRowsForInheritance = existingAccounts.get(normalizedAccountNumber)!;
}

// También buscar por idCuenta si existe
if (r.idCuenta && r.idCuenta.trim().length > 0 && existingAccounts.has(r.idCuenta.trim())) {
  const idCuentaRows = existingAccounts.get(r.idCuenta.trim())!;
  existingRowsForInheritance = [...existingRowsForInheritance, ...idCuentaRows];
}

// Buscar también por holderName si no se encontró asesor
if (r.holderName && (!originalAdvisorRaw || originalAdvisorRaw.trim().length === 0)) {
  const normalizedHolderName = r.holderName.toLowerCase().trim();
  if (normalizedHolderName && existingHolderNames.has(normalizedHolderName)) {
    const holderNameRows = existingHolderNames.get(normalizedHolderName)!;
    existingRowsForInheritance = [...existingRowsForInheritance, ...holderNameRows];
  }
}
```

### 2. Mejora en la Carga de Filas Existentes (`apps/api/src/routes/aum/upload.ts`)

**Problema**: Solo se cargaban filas con `accountNumber`, no se incluían filas con solo `idCuenta`.

**Solución**:
- Cargar filas con `accountNumber` O `idCuenta`
- Agregar al mapa tanto por `accountNumber` como por `idCuenta`
- Esto permite encontrar filas cuando CSV2 tiene `accountNumber` pero CSV1 solo tenía `idCuenta`

**Código mejorado**:
```typescript
// Obtener filas con accountNumber O idCuenta
const existingResult = await dbi.execute(sql`
  SELECT r.account_number, r.id_cuenta, r.holder_name, r.advisor_raw, r.file_id, r.created_at
  FROM aum_import_rows r
  INNER JOIN aum_import_files f ON r.file_id = f.id
  WHERE (r.account_number IS NOT NULL OR r.id_cuenta IS NOT NULL)
    AND f.broker = ${broker as string}
`);

// Agregar por accountNumber si existe
if (row.account_number) {
  const normalizedAccount = normalizeAccountNumber(row.account_number);
  existingAccounts.set(normalizedAccount, [...]);
}

// También agregar por idCuenta si existe
if (row.id_cuenta && row.id_cuenta.trim().length > 0) {
  existingAccounts.set(normalizedIdCuenta, [...]);
}
```

### 3. Mejora en `findExistingRow` (`apps/api/src/services/aumUpsert.ts`)

**Problema**: Solo buscaba por `holderName` cuando la fila no tenía `accountNumber` ni `idCuenta`.

**Solución**:
- Buscar por `holderName` también como fallback cuando no se encuentra por `accountNumber` o `idCuenta`
- Primero intentar buscar filas que solo tienen `holderName` (sin identificadores)
- Si no se encuentra, buscar por `holderName` sin restricción de identificadores
- Esto cubre el caso donde CSV2 tiene `accountNumber` pero CSV1 solo tenía `holderName`

**Código mejorado**:
```typescript
// Strategy 4: Search by holderName (for rows without accountNumber or idCuenta, OR as fallback)
if (row.holderName && row.holderName.trim().length > 0) {
  // Primero intentar buscar filas que solo tienen holderName
  let result = await dbi.execute(sql`
    WHERE LOWER(TRIM(r.holder_name)) = LOWER(TRIM(${row.holderName}))
      AND (r.account_number IS NULL OR r.account_number = '')
      AND (r.id_cuenta IS NULL OR r.id_cuenta = '')
  `);

  // Si no encontramos, buscar por holderName sin restricción
  if (!result.rows || result.rows.length === 0) {
    result = await dbi.execute(sql`
      WHERE LOWER(TRIM(r.holder_name)) = LOWER(TRIM(${row.holderName}))
    `);
  }
}
```

### 4. Mejora en Búsqueda por `accountNumber` (`apps/api/src/services/aumUpsert.ts`)

**Problema**: No se normalizaba el `accountNumber` antes de buscar.

**Solución**:
- Normalizar el `accountNumber` antes de buscar
- Esto asegura que se encuentren filas incluso si el formato cambió ligeramente

**Código mejorado**:
```typescript
// Strategy 3: Search by accountNumber (normalized)
if (hasAccountNumber && row.accountNumber) {
  const normalizedAccountNumber = normalizeAccountNumber(row.accountNumber);
  const result = await dbi.execute(sql`
    WHERE r.account_number = ${normalizedAccountNumber}
  `);
}
```

### 5. Preservación de Asesor en `updateExistingRow` (`apps/api/src/services/aumUpsert.ts`)

**Estado**: Ya estaba correctamente implementado.

**Lógica**:
```typescript
const hasAdvisorRawInNew = newRow.advisorRaw !== null &&
  newRow.advisorRaw !== undefined &&
  newRow.advisorRaw.trim().length > 0;

const preservedAdvisorRaw = hasAdvisorRawInNew
  ? newRow.advisorRaw
  : (existingRow.advisorRaw || null);
```

## Casos Cubiertos

### ✅ Caso 1: CSV1 tiene asesor, CSV2 no tiene asesor
- **Solución**: Se hereda el asesor del CSV1 correctamente

### ✅ Caso 2: CSV1 solo tiene holderName, CSV2 tiene accountNumber
- **Solución**: Se busca por holderName para encontrar la fila y heredar el asesor

### ✅ Caso 3: CSV1 solo tiene idCuenta, CSV2 tiene accountNumber
- **Solución**: Se busca por idCuenta en el mapa de existingAccounts

### ✅ Caso 4: CSV1 tiene accountNumber, CSV2 tiene el mismo accountNumber
- **Solución**: Se encuentra directamente por accountNumber normalizado

### ✅ Caso 5: CSV2 tiene accountNumber nuevo (no estaba en CSV1)
- **Solución**: Se inserta como nueva fila (comportamiento correcto)

## Resultados Esperados

Después de estas mejoras, el sistema debería:

1. ✅ Importar todas las 765 filas del CSV1
2. ✅ Importar todas las 766 filas del CSV2
3. ✅ Preservar los 707 asesores del CSV1 cuando se actualiza con CSV2
4. ✅ Actualizar correctamente las 715 filas comunes
5. ✅ Insertar las 51 filas nuevas del CSV2
6. ✅ Mantener las 50 filas que solo están en CSV1

## Verificación

Para verificar que todo funciona correctamente:

```bash
# 1. Verificar CSVs
pnpm verify:aum:csv

# 2. Importar archivos (usar la interfaz web)

# 3. Verificar importación completa
pnpm test:aum:full
```

## Archivos Modificados

1. `apps/api/src/routes/aum/upload.ts` - Mejora en herencia de asesor y carga de filas existentes
2. `apps/api/src/services/aumUpsert.ts` - Mejora en búsqueda de filas existentes
3. `apps/api/src/routes/aum/rows.ts` - Mejora en parseo de valores numéricos (ya estaba implementado)

