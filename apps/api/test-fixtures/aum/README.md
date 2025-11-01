# Test Fixtures - AUM (Assets Under Management)

Este directorio contiene archivos CSV de prueba para el sistema de importación AUM.

## 📋 Archivos

Los CSVs contienen datos sintéticos de cuentas comitentes de Balanz con:
- **Número de comitente** (cuenta)
- **Titular** (nombre del cliente)
- **Asesor** (advisor asignado)

Cada archivo tiene **~730 registros** para pruebas de volumen.

## 🧪 Uso en Tests

### Desarrollo Local

```typescript
// Ejemplo: Cargar fixture en test
import { readFile } from 'fs/promises';
import { join } from 'path';

const fixturePath = join(__dirname, '..', '..', 'test-fixtures', 'aum', '1761781426170-8hqr5uut5jr.csv');
const csvContent = await readFile(fixturePath, 'utf-8');
```

### Tests E2E

```typescript
// Ejemplo: Upload de fixture en test E2E
const fixturePath = 'apps/api/test-fixtures/aum/1761781426170-8hqr5uut5jr.csv';
await page.setInputFiles('input[type="file"]', fixturePath);
```

### Manual Testing

Puedes usar estos archivos para probar la feature de importación AUM:

1. Ir a `/admin/aum`
2. Clic en "Cargar archivo"
3. Seleccionar cualquiera de estos CSVs
4. Verificar parsing, matching y commit

## 📊 Estructura del CSV

```csv
comitente,Descripcion,Asesor
76551,MARITANO FEDERICO NICOLAS,Nicanor Zappia
76656,VITALI ROMANI FRANCO,Mateo Vicente
...
```

**Columnas:**
- `comitente`: Número de cuenta (string/number)
- `Descripcion`: Nombre completo del titular
- `Asesor`: Nombre del asesor asignado

## ⚠️ Notas Importantes

- ✅ Estos archivos **SÍ están en Git** (son fixtures de prueba)
- ✅ Los uploads de usuarios en runtime van a `apps/api/uploads/` (NO en Git)
- ✅ Los datos son sintéticos/anonymizados - no son datos reales de clientes

## 🔄 Actualizar Fixtures

Si necesitas crear nuevos fixtures:

1. Generar CSV con estructura correcta
2. Anonymizar/sintetizar datos sensibles
3. Colocar en este directorio
4. Commitear al repo

**NO commitear datos reales de clientes.**

