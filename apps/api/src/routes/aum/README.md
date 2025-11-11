# AUM Upload Workflow

> Arquitectura final del módulo de importación mensual para Balanz.

## Flujo recomendado

1. **Carga inicial (`Balanz Cactus 2025 - AUM Balanz.csv`)**  
   - Incluye todos los clientes y la columna `asesor`.  
   - Se importa primero para poblar `aum_import_rows`, `broker_accounts` y para fijar el asesor actual de cada cuenta.

2. **Actualización mensual (`reporteClusterCuentasV2.csv`)**  
   - No trae la columna `asesor`.  
   - Durante la carga heredamos automáticamente el asesor previo por cuenta usando `inheritAdvisorFromExisting`.  
   - Solo marcamos conflicto cuando el archivo **nuevo** trae explícitamente un asesor distinto o un titular distinto; los uploads sin asesor no generan conflictos.

3. **Nuevos clientes**  
   - Si aparece un comitente que nunca se cargó antes, la fila queda con `advisorRaw = null`.  
   - En el administrador se debe completar el asesor manualmente antes de confirmar el archivo.

4. **Commit**  
   - Cada archivo se confirma desde `/admin/aum/uploads/:fileId/commit`.  
   - Los commits solo permiten filas `matched` y sin conflictos pendientes.

## Reglas clave implementadas

- **Scope por broker**: la detección de duplicados solo considera filas del mismo broker para evitar falsos positivos.
- **Herencia de asesor**: si la importación mensual no incluye asesor, reutilizamos el último asesor conocido para esa cuenta.  
- **Conflictos explícitos**: solo marcamos `ambiguous` si el CSV provee un asesor distinto del registrado previamente o cambia el titular.
- **Totales coherentes**: las métricas de `aum_import_files` se recalculan después del `upsert` para reflejar exactamente lo persistido.

## Operativa rápida

1. Importar archivo base con asesores.  
2. Confirmar/commit para sincronizar cuentas y asesores.  
3. Cada mes importar el `reporteClusterCuentasV2.csv`.  
4. Resolver manualmente los nuevos clientes sin asesor.  
5. Confirmar el archivo mensual para propagar los saldos actualizados.


