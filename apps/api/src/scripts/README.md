# Scripts de Verificación y Utilidades

Este directorio contiene scripts para verificar la integridad de los datos y diagnosticar problemas en el sistema CACTUS CRM.

## 📋 Scripts Disponibles

### Verificación de Datos

#### `verify-aum-import.ts`
Verifica que las importaciones AUM se hayan cargado correctamente comparando el CSV original con la base de datos.

**Uso:**
```bash
# Verificar archivo por defecto
pnpm -F @cactus/api verify-aum-import

# Verificar archivo específico
pnpm -F @cactus/api verify-aum-import --file "mi-archivo.csv"

# Verificar importación específica por ID
pnpm -F @cactus/api verify-aum-import --file-id "uuid-del-archivo"
```

**Qué verifica:**
- ✅ Conteo de filas (CSV vs DB)
- ✅ Filas faltantes en la base de datos
- ✅ Filas en DB que no están en CSV
- ✅ Discrepancias en campos básicos (idCuenta, comitente, Descripcion, Asesor)
- ✅ Discrepancias en campos financieros (AUM USD, Bolsa Arg, Fondos Arg, Bolsa BCI, Pesos, MEP, Cable, CV7000)
- ✅ Filas con solo Descripcion (sin idCuenta ni comitente)

**Salida:**
- Reporte detallado con estadísticas por campo
- Ejemplos de discrepancias encontradas
- Exit code 0 si todo está correcto, 1 si hay problemas

**Documentación completa:** Ver [AUM_VERIFICATION.md](./AUM_VERIFICATION.md) para detalles completos, casos de uso y troubleshooting.

---

#### `verify-contacts-assignment.ts`
Verifica que todos los contactos estén correctamente asignados a asesores.

**Uso:**
```bash
pnpm -F @cactus/api verify-contacts-assignment
```

**Qué verifica:**
- ✅ Total de contactos activos
- ✅ Contactos asignados vs sin asignar
- ✅ Asignaciones inválidas (asesor inexistente)
- ✅ Contactos con múltiples asignaciones

**Salida:**
- Estadísticas generales
- Lista de contactos sin asignar (si los hay)
- Lista de asignaciones inválidas (si las hay)

---

### Diagnóstico y Reparación

#### `diagnose-missing-rows.ts`
Diagnostica por qué ciertas filas del CSV no se cargaron en la base de datos.

**Uso:**
```bash
pnpm -F @cactus/api tsx src/scripts/diagnose-missing-rows.ts
```

**Qué hace:**
- Analiza filas faltantes en detalle
- Identifica patrones comunes de errores
- Sugiere soluciones

---

#### `assign-unassigned-contacts.ts`
Asigna contactos sin asignar a asesores basándose en reglas de negocio.

**Uso:**
```bash
pnpm -F @cactus/api assign-unassigned-contacts
```

**Qué hace:**
- Encuentra contactos sin asesor asignado
- Intenta asignarlos automáticamente según reglas
- Reporta resultados

---

## 🚀 Script Maestro de Verificación

### `verify-all.ts`
Ejecuta todas las verificaciones en secuencia y genera un reporte consolidado.

**Uso:**
```bash
pnpm -F @cactus/api verify-all
```

**Qué verifica:**
1. Importaciones AUM
2. Asignación de contactos
3. Integridad de datos general

**Salida:**
- Reporte consolidado con todas las verificaciones
- Exit code 0 solo si todas las verificaciones pasan

---

## 📊 Estructura de Reportes

Todos los scripts de verificación siguen un formato consistente:

```
================================================================================
[SECCIÓN]
================================================================================

📊 RESUMEN:
   [Estadísticas]

✅/⚠️/❌ [DETALLE]:
   [Información específica]

================================================================================
RESUMEN FINAL
================================================================================
```

---

## 🔧 Crear Nuevos Scripts de Verificación

Para crear un nuevo script de verificación, sigue este patrón:

```typescript
#!/usr/bin/env tsx
/**
 * Script de verificación: [Descripción]
 * 
 * Verifica: [Qué verifica]
 * 
 * Uso: pnpm -F @cactus/api verify-[nombre]
 */

import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '@cactus/db';

// Cargar .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..', '..');
config({ path: join(projectRoot, 'apps', 'api', '.env') });

interface VerificationResult {
  // Definir estructura de resultados
}

async function verify(): Promise<VerificationResult> {
  console.log('='.repeat(80));
  console.log('VERIFICACIÓN: [Nombre]');
  console.log('='.repeat(80));
  
  // Lógica de verificación
  
  return result;
}

function printReport(result: VerificationResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('REPORTE DE VERIFICACIÓN');
  console.log('='.repeat(80));
  
  // Imprimir reporte
  
  console.log('\n' + '='.repeat(80));
  console.log('RESUMEN FINAL');
  console.log('='.repeat(80));
  
  const totalIssues = /* calcular problemas */;
  
  if (totalIssues === 0) {
    console.log('\n✅ VERIFICACIÓN EXITOSA');
    process.exit(0);
  } else {
    console.log('\n⚠️  VERIFICACIÓN CON PROBLEMAS');
    console.log(`   Total de problemas: ${totalIssues}`);
    process.exit(1);
  }
}

async function main() {
  try {
    const result = await verify();
    printReport(result);
  } catch (error) {
    console.error('\n❌ Error durante la verificación:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
```

**Requisitos:**
- ✅ Cargar variables de entorno correctamente
- ✅ Usar formato de reporte consistente
- ✅ Exit codes apropiados (0 = éxito, 1 = problemas)
- ✅ Manejo de errores robusto
- ✅ Documentación clara en comentarios

---

## 📝 Agregar Comando npm

Para agregar un nuevo script al `package.json`:

```json
{
  "scripts": {
    "verify-[nombre]": "tsx src/scripts/verify-[nombre].ts"
  }
}
```

---

## 🎯 Mejores Prácticas

1. **Siempre verificar después de importaciones importantes**
   ```bash
   pnpm -F @cactus/api verify-aum-import
   ```

2. **Ejecutar verificación completa periódicamente**
   ```bash
   pnpm -F @cactus/api verify-all
   ```

3. **Revisar reportes antes de proceder con operaciones críticas**

4. **Documentar cualquier problema encontrado**

---

## 🔍 Troubleshooting

### Error: "DATABASE_URL environment variable is required"
Asegúrate de tener un archivo `.env` en `apps/api/` con la variable `DATABASE_URL`.

### Error: "No se encontró el archivo en la base de datos"
Verifica que el archivo CSV haya sido importado correctamente antes de ejecutar la verificación.

### Script muy lento
Para archivos grandes, considera agregar límites o paginación en las queries.

---

## 📚 Referencias

- [Documentación de Drizzle ORM](https://orm.drizzle.team/)
- [Documentación de TypeScript](https://www.typescriptlang.org/docs/)

