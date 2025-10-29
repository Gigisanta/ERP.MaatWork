# Datos de Negocio

Esta carpeta contiene archivos de datos de negocio utilizados para el sistema Cactus CRM.

## Archivos

### Balanz Cactus 2025 - AUM Balanz.xlsx
- **Propósito**: Archivo madre con datos de AUM (Assets Under Management) por cuenta/cliente
- **Fuente**: Balanz - Sistema principal de gestión de carteras
- **Uso**: Importación de datos de clientes y sus activos bajo gestión
- **Frecuencia**: Actualización periódica (mensual/trimestral)

### reporteClusterCuentasV2.xlsx
- **Propósito**: Reporte mensual de cluster de cuentas
- **Fuente**: Balanz - Sistema de reportes
- **Uso**: Descubrimiento y actualización de atributos no-autoritativos de clientes
- **Frecuencia**: Mensual

### Comisiones (2).xlsx
- **Propósito**: Datos de comisiones por operaciones
- **Fuente**: Balanz - Sistema de comisiones
- **Uso**: Análisis de comisiones y atribución de ingresos
- **Frecuencia**: Mensual

## Notas Importantes

- Estos archivos contienen datos sensibles de clientes y operaciones financieras
- No deben ser modificados manualmente
- Se utilizan como fuente de datos para el proceso ETL del sistema
- Mantener versiones históricas para auditoría y comparación temporal

