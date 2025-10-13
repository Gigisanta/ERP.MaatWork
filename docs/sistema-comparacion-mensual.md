# Sistema de Comparación Mensual

## Descripción

El Sistema de Comparación Mensual permite gestionar y mantener actualizado el maestro "Balanz Cactus 2025" comparándolo mensualmente con archivos "reporteClusterCuentasV2". El sistema garantiza trazabilidad completa, control de asesores y prevención de pérdida de datos.

## Características Principales

### 🔄 **Flujo Automatizado**
- Carga de archivos Excel con validación estricta
- Comparación automática por `idcuenta`
- Detección de nuevos, modificados y ausentes
- Aplicación transaccional con snapshots de auditoría

### 🛡️ **Seguridad y Control**
- Hash SHA-256 para idempotencia
- Snapshots antes/después de cada aplicación
- Control granular de asesores (nunca se pisan sin confirmación)
- Rollback automático en caso de errores

### 📊 **Trazabilidad Completa**
- Auditoría de todos los cambios
- Historial de cargas mensuales
- Comparación de snapshots
- Exportación de reportes detallados

## Arquitectura

### Backend (API)
```
apps/api/src/
├── services/ingestion/
│   ├── validation.ts          # Validación de esquemas
│   ├── staging.ts             # Carga a staging con idempotencia
│   ├── diff-engine.ts         # Motor de comparación
│   ├── snapshot-service.ts    # Gestión de snapshots
│   ├── aplicar-cambios.ts     # Aplicación transaccional
│   └── export.ts              # Exportación mejorada
├── routes/
│   └── comparacion-mensual.ts # Endpoints API
└── config/
    └── comparacion-mensual.ts # Configuración del sistema
```

### Frontend (UI)
```
apps/web/app/comparacion-mensual/
├── page.tsx                   # Dashboard principal
├── cargar/page.tsx           # Carga de archivos
├── revisar/[cargaId]/page.tsx # Revisión de cambios
├── confirmar/[cargaId]/page.tsx # Confirmación final
└── components/
    ├── GrillaNuevos.tsx      # Gestión de nuevos
    ├── GrillaModificados.tsx # Gestión de modificados
    ├── GrillaAusentes.tsx    # Gestión de ausentes
    └── AsignacionAsesor.tsx  # Asignación de asesores
```

### Base de Datos
```sql
-- Tablas principales
maestro_cuentas              # Estado actual del maestro
staging_mensual              # Datos temporales del archivo mensual
auditoria_cargas             # Registro de cada carga
diff_detalle                 # Detalle de cambios detectados
snapshots_maestro            # Snapshots para auditoría
asignaciones_asesor          # Asignaciones manuales de asesor
```

## Flujo de Trabajo

### 1. Carga de Archivo
```typescript
POST /api/comparacion-mensual/cargar
Content-Type: multipart/form-data

// Validaciones automáticas:
- Columnas obligatorias: idcuenta, comitente, cuotapartista, descripcion
- Detección de duplicados por idcuenta
- Hash SHA-256 para idempotencia
- Normalización de datos
```

### 2. Comparación Automática
```typescript
POST /api/comparacion-mensual/diff/:cargaId

// Detecta:
- Nuevos: registros en mensual NO en maestro
- Modificados: cambios en comitente/cuotapartista/descripcion
- Ausentes: registros en maestro NO en mensual
- Cambios de asesor: requiere confirmación manual
```

### 3. Revisión Interactiva
```typescript
GET /api/comparacion-mensual/revisar/:cargaId

// Permite:
- Asignar asesores a registros nuevos
- Confirmar cambios de asesor
- Marcar ausentes para inactivación
- Filtrar y buscar registros
```

### 4. Aplicación Transaccional
```typescript
POST /api/comparacion-mensual/aplicar-cambios/:cargaId

// Proceso seguro:
1. Crear snapshot "antes"
2. Aplicar cambios en transacción
3. Crear snapshot "después"
4. Registrar auditoría
5. Rollback automático si hay error
```

## Endpoints API

### Carga y Procesamiento
- `POST /cargar` - Cargar archivo mensual
- `POST /diff/:cargaId` - Ejecutar comparación
- `GET /resumen/:cargaId` - Obtener resumen de carga
- `GET /diff-resumen/:cargaId` - Obtener resumen de diff

### Revisión de Cambios
- `GET /diff-detalle/:cargaId` - Detalles de cambios
- `GET /nuevos/:cargaId` - Registros nuevos
- `GET /modificados/:cargaId` - Registros modificados
- `GET /ausentes/:cargaId` - Registros ausentes
- `GET /sin-asesor/:cargaId` - Registros sin asesor

### Asignaciones y Aplicación
- `POST /asignaciones/:cargaId` - Guardar asignaciones
- `POST /aplicar-cambios/:cargaId` - Aplicar cambios
- `POST /revertir/:cargaId` - Revertir cambios

### Exportación
- `GET /export/maestro` - Exportar maestro actual
- `GET /export/diff/:cargaId` - Exportar diff
- `GET /export/auditoria/:cargaId` - Exportar auditoría

### Snapshots y Auditoría
- `GET /snapshots/:cargaId` - Obtener snapshots
- `GET /snapshots/:cargaId/compare` - Comparar snapshots
- `GET /auditoria/:cargaId` - Detalle de auditoría
- `GET /cargas-recientes` - Historial de cargas

## Configuración

### Variables de Entorno
```bash
# Base de datos
DATABASE_URL=postgresql://...

# Configuración de archivos
MAX_FILE_SIZE=104857600  # 100MB
ALLOWED_EXTENSIONS=.xlsx,.xls

# Configuración de snapshots
SNAPSHOT_RETENTION_DAYS=365
ENABLE_SNAPSHOT_INTEGRITY_CHECK=true

# Configuración de auditoría
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_LEVEL=info
```

### Configuración del Sistema
```typescript
// apps/api/src/config/comparacion-mensual.ts
export const COMPARACION_MENSUAL_CONFIG = {
  archivos: {
    maestro: {
      columnasObligatorias: ['idcuenta', 'comitente', 'cuotapartista', 'descripcion'],
      tamanoMaximo: 50 * 1024 * 1024
    }
  },
  validacion: {
    detectarDuplicados: true,
    porcentajeWarningSinAsesor: 50
  }
  // ... más configuración
};
```

## Casos de Uso

### Carga Mensual Típica
1. **Usuario sube Excel** → Sistema valida y carga a staging
2. **Sistema ejecuta diff** → Detecta nuevos/modificados/ausentes
3. **Usuario revisa cambios** → Asigna asesores y confirma cambios
4. **Usuario aplica cambios** → Sistema actualiza maestro con snapshots
5. **Usuario exporta reportes** → Descarga maestro actualizado y diff

### Manejo de Errores
- **Duplicados en mensual** → Warning, carga solo primera ocurrencia
- **Archivo ya procesado** → Idempotencia, retorna carga existente
- **Error en aplicación** → Rollback automático, mantiene snapshots
- **Cambio de asesor** → Requiere confirmación manual

### Casos Especiales
- **Registros ausentes** → No se eliminan automáticamente, requieren confirmación
- **Re-procesamiento** → Hash-based idempotencia previene duplicados
- **Archivos grandes** → Procesamiento en lotes, timeouts configurables

## Monitoreo y Logs

### Logs Estructurados
```json
{
  "timestamp": "2025-01-27T10:30:00Z",
  "level": "info",
  "service": "comparacion-mensual",
  "operation": "cargar-archivo",
  "cargaId": "uuid",
  "fileName": "reporteClusterCuentasV2.xlsx",
  "totalRows": 15000,
  "duplicatesFound": 5,
  "warnings": ["50% registros sin asesor"]
}
```

### Métricas Importantes
- Tiempo de procesamiento por archivo
- Número de cambios detectados por tipo
- Tasa de registros sin asesor
- Frecuencia de cargas por mes
- Errores y warnings por carga

## Mantenimiento

### Limpieza Automática
```typescript
// Limpiar snapshots antiguos (>1 año)
await snapshotService.cleanupOldSnapshots();

// Limpiar staging de cargas aplicadas
await stagingService.cleanupProcessedData();
```

### Backup y Recuperación
- Snapshots automáticos antes de cada aplicación
- Exportación regular del maestro
- Logs de auditoría para trazabilidad
- Rollback manual desde snapshots

### Optimización
- Índices en campos de búsqueda frecuente
- Procesamiento en lotes para archivos grandes
- Cache de consultas frecuentes
- Limpieza periódica de datos temporales

## Troubleshooting

### Problemas Comunes

**Error: "Columna obligatoria no encontrada"**
- Verificar que el Excel tenga las columnas: idcuenta, comitente, cuotapartista, descripcion
- Verificar nombres exactos de columnas (case-sensitive)

**Error: "Archivo ya procesado"**
- Sistema detectó archivo idéntico ya cargado
- Verificar hash del archivo en auditoría
- Usar archivo diferente si es intencional

**Warning: "Muchos registros sin asesor"**
- >50% de registros no tienen asesor asignado
- Completar asignaciones antes de aplicar cambios

**Error en aplicación de cambios**
- Sistema ejecuta rollback automático
- Verificar logs para causa del error
- Reintentar después de corregir problema

### Comandos de Diagnóstico
```bash
# Verificar estado de cargas
curl /api/comparacion-mensual/cargas-recientes

# Verificar snapshots
curl /api/comparacion-mensual/snapshots/:cargaId

# Verificar integridad de snapshots
curl /api/comparacion-mensual/snapshots/:cargaId/verify
```

## Roadmap

### Próximas Mejoras
- [ ] Automatización con cron jobs
- [ ] Notificaciones por email
- [ ] Dashboard de KPIs
- [ ] API de rollback manual
- [ ] Soporte para múltiples formatos
- [ ] Integración con sistemas externos

### Optimizaciones
- [ ] Cache inteligente
- [ ] Procesamiento paralelo
- [ ] Compresión de snapshots
- [ ] Índices optimizados
- [ ] Métricas en tiempo real


