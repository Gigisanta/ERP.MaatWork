# Runbook: Sistema de Comparación Mensual de Cuentas

## Descripción General

El Sistema de Comparación Mensual de Cuentas automatiza la comparación entre reportes mensuales (reporteClusterCuentasV2) y el maestro de cuentas (Balanz Cactus 2025), permitiendo la gestión controlada y auditable de cambios.

## Arquitectura

### Componentes Principales

1. **Motor de Ingesta**: Validación y carga de archivos Excel
2. **Motor de Diff**: Detección de nuevos y modificados
3. **UI de Gestión**: Interfaz para asignación de asesores
4. **Sistema de Exportación**: Generación de reportes y snapshots
5. **Auditoría**: Trazabilidad completa de cambios

### Base de Datos

- **maestro_cuentas**: Estado vigente de todas las cuentas
- **staging_mensual**: Datos temporales del Excel mensual
- **auditoria_cargas**: Registro de cada carga con metadatos
- **diff_detalle**: Detalle de cambios detectados
- **asignaciones_asesor**: Asignaciones manuales de asesores
- **snapshots_maestro**: Snapshots históricos para auditoría

## Flujo de Operación Mensual

### 1. Preparación del Maestro (Una sola vez)

```bash
# Cargar archivo maestro inicial
POST /api/comparacion-mensual/cargar
Content-Type: multipart/form-data

# Archivo: Balanz Cactus 2025 - AUM Balanz.xlsx
```

**Validaciones requeridas:**
- Columnas obligatorias: idcuenta, comitente, cuotapartista, descripcion
- Asesor puede estar vacío (se completará manualmente)
- Archivo máximo 100MB
- Formato: .xlsx o .xls

### 2. Procesamiento Mensual

#### Paso 1: Cargar Archivo Mensual

```bash
# Subir archivo mensual
POST /api/comparacion-mensual/cargar
Content-Type: multipart/form-data

# Archivo: reporteClusterCuentasV2.xlsx
```

**Respuesta esperada:**
```json
{
  "success": true,
  "cargaId": "uuid-carga",
  "metadata": {
    "mes": "2025-01",
    "nombreArchivo": "reporteClusterCuentasV2.xlsx",
    "totalRegistros": 1500
  },
  "warnings": []
}
```

#### Paso 2: Ejecutar Comparación (Diff)

```bash
# Ejecutar proceso de diff
POST /api/comparacion-mensual/diff/{cargaId}
```

**Respuesta esperada:**
```json
{
  "success": true,
  "cargaId": "uuid-carga",
  "diff": {
    "nuevos": [...],
    "modificados": [...],
    "sinAsesor": [...],
    "resumen": {
      "totalNuevos": 25,
      "totalModificados": 12,
      "totalSinAsesor": 8,
      "porcentajeSinAsesor": 21.6
    }
  }
}
```

#### Paso 3: Revisar Cambios Detectados

```bash
# Obtener resumen de diff
GET /api/comparacion-mensual/diff-resumen/{cargaId}

# Obtener detalles de cambios
GET /api/comparacion-mensual/diff-detalle/{cargaId}?tipo=nuevo&limit=50

# Obtener registros sin asesor
GET /api/comparacion-mensual/sin-asesor/{cargaId}
```

#### Paso 4: Asignar Asesores a Clientes Sueltos

**Acceso via UI:**
- URL: `/comparacion-mensual/asignar-asesores/{cargaId}`
- Completar asesor para registros sin asignación
- Agregar motivo opcional
- Guardar asignaciones en lote

**API para asignaciones:**
```bash
POST /api/comparacion-mensual/asignaciones/{cargaId}
Content-Type: application/json

{
  "asignaciones": [
    {
      "idcuenta": "12345",
      "asesorNuevo": "Juan Pérez",
      "motivo": "Asignación inicial"
    }
  ]
}
```

#### Paso 5: Aplicar Cambios al Maestro

```bash
# Aplicar cambios detectados
POST /api/comparacion-mensual/aplicar-cambios/{cargaId}
```

**Proceso interno:**
1. Crear snapshot del maestro actual
2. Insertar registros nuevos
3. Actualizar registros modificados
4. Aplicar asignaciones de asesores
5. Crear snapshot del maestro actualizado
6. Registrar en auditoría

#### Paso 6: Exportar Resultados

```bash
# Exportar maestro actualizado
GET /api/comparacion-mensual/export/maestro?formato=xlsx

# Exportar detalles de cambios
GET /api/comparacion-mensual/export/diff/{cargaId}

# Exportar estadísticas
GET /api/comparacion-mensual/stats/maestro
```

## Monitoreo y Mantenimiento

### Logs Importantes

```bash
# Logs de la API
tail -f apps/api/logs/app.log

# Buscar errores de validación
grep "Error de validación" apps/api/logs/app.log

# Buscar problemas de diff
grep "Error en proceso de diff" apps/api/logs/app.log
```

### Métricas Clave

```bash
# Verificar estado de cargas recientes
GET /api/comparacion-mensual/cargas-recientes

# Estadísticas del maestro
GET /api/comparacion-mensual/stats/maestro
```

### Verificaciones de Salud

```bash
# Health check general
GET /api/health

# Test de conexión a base de datos
GET /api/test-db

# Verificar tablas del sistema
GET /api/test-cactus-db
```

## Resolución de Problemas

### Error: "Ya existe una carga para el mes X con el mismo archivo"

**Causa:** Idempotencia activada - mismo archivo ya procesado.

**Solución:**
1. Verificar que es realmente el mismo archivo
2. Si es correcto, usar la carga existente
3. Si es diferente, cambiar nombre del archivo

### Error: "Columna obligatoria 'idcuenta' no encontrada"

**Causa:** Esquema del Excel no coincide con el esperado.

**Solución:**
1. Verificar nombres de columnas en el Excel
2. Configurar mapeo de columnas si es necesario
3. Validar formato del archivo

### Error: "Error de conexión al servidor"

**Causa:** Problemas de conectividad o base de datos.

**Solución:**
1. Verificar estado de la API: `GET /api/health`
2. Verificar conexión a BD: `GET /api/test-db`
3. Revisar logs de la aplicación

### Rendimiento Lento

**Para archivos grandes (>50k registros):**

1. **Monitorear tiempo de procesamiento:**
   ```bash
   # Tiempo esperado: <15s para 100k filas
   ```

2. **Optimizar si es necesario:**
   - Aumentar batch size en staging
   - Optimizar índices de base de datos
   - Usar procesamiento en background

## Configuración

### Variables de Entorno

```bash
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/cactus_db

# API
PORT=3001
LOG_LEVEL=info
NODE_ENV=production

# CORS (producción)
CORS_ORIGINS=https://yourdomain.com
CSP_ENABLED=true
```

### Límites y Configuración

```typescript
// Configuración de loader
const LOADER_CONFIGS = {
  clusterCuentas: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedExtensions: ['.xlsx'],
    // Sin mapeo de columnas por defecto
  }
};
```

## Backup y Recuperación

### Snapshots Automáticos

El sistema crea snapshots automáticamente antes y después de cada aplicación de cambios:

```sql
-- Ver snapshots disponibles
SELECT 
  sm.id,
  sm.tipo,
  sm.total_registros,
  sm.created_at,
  ac.mes,
  ac.nombre_archivo
FROM snapshots_maestro sm
JOIN auditoria_cargas ac ON sm.carga_id = ac.id
ORDER BY sm.created_at DESC;
```

### Restauración desde Snapshot

```sql
-- Restaurar maestro desde snapshot
-- (Proceso manual - contactar administrador)
```

## Escalabilidad

### Volumen Esperado

- **Registros por mes:** 1,000 - 100,000
- **Tiempo de procesamiento:** <15s para 100k registros
- **Archivos concurrentes:** 1 (proceso secuencial)

### Consideraciones de Rendimiento

1. **Índices optimizados** en tablas principales
2. **Procesamiento en lotes** para inserciones masivas
3. **Limpieza automática** de staging temporal
4. **Snapshots comprimidos** para ahorro de espacio

## Seguridad

### Validaciones de Entrada

- **Tamaño máximo de archivo:** 100MB
- **Tipos permitidos:** .xlsx, .xls únicamente
- **Validación de esquema** estricta
- **Sanitización** de datos de entrada

### Auditoría

- **Log completo** de todas las operaciones
- **Trazabilidad** de cambios (quién, qué, cuándo)
- **Snapshots** para rollback
- **Hash de archivos** para idempotencia

## Contacto y Soporte

- **Logs:** `apps/api/logs/app.log`
- **Monitoreo:** Dashboard en `/comparacion-mensual`
- **Métricas:** Endpoint `/api/comparacion-mensual/stats/maestro`

---

**Última actualización:** 2025-01-XX  
**Versión:** 1.0.0  
**Mantenido por:** Equipo CACTUS


