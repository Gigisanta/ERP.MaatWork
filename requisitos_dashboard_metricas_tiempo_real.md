# Requisitos del Producto - Dashboard CRM con Métricas en Tiempo Real

## 1. Descripción General del Producto

Dashboard de Métricas en Tiempo Real es un sistema integrado de análisis y visualización que forma parte del CRM Cactus Dashboard. Proporciona cálculos automáticos de métricas de ventas, detección de conversiones en tiempo real y visualizaciones dinámicas con gráficos interactivos usando Recharts.

El sistema está dirigido a asesores comerciales y managers que necesitan monitorear el rendimiento de sus actividades de ventas con actualizaciones instantáneas cada vez que se modifica el estado de un contacto, permitiendo tomar decisiones basadas en datos en tiempo real y optimizar estrategias de conversión.

## 2. Funcionalidades Principales

### 2.1 Roles de Usuario
| Rol | Método de Registro | Permisos Principales |
|-----|-------------------|---------------------|
| Asesor | Registro directo con aprobación automática | Ve métricas personales calculadas en tiempo real, gestiona solo contactos asignados |
| Manager | Registro con aprobación manual requerida | Ve métricas consolidadas del equipo, gestiona todos los contactos, acceso a análisis comparativos |
| Admin | Acceso directo del sistema | Acceso completo a métricas globales, configuraciones avanzadas del sistema |

### 2.2 Módulo de Características

Nuestro dashboard de métricas en tiempo real integrado consta de las siguientes funcionalidades principales:

1. **Dashboard de Métricas en Tiempo Real**: cálculo automático de KPIs con actualización instantánea, gráficos Recharts dinámicos con auto-refresh.
2. **Sistema CRM con Tracking de Conversiones**: gestión de contactos con detección automática de conversiones y registro de eventos.
3. **Visualizaciones Dinámicas**: gráficos de barras, pie charts y líneas que se actualizan automáticamente con cada cambio de estado.

### 2.3 Detalles de Páginas

| Nombre de Página | Nombre del Módulo | Descripción de Características |
|------------------|-------------------|---------------------------------|
| Dashboard | Métricas en Tiempo Real | Calcular y mostrar automáticamente: total de contactos, prospectos activos, conversiones del mes, tasa de conversión, tiempo promedio de conversión. Actualización instantánea con cada cambio de estado |
| Dashboard | Gráficos Dinámicos Recharts | Generar gráficos responsivos: barras (llamadas semanales), pie chart (distribución pipeline), líneas (tendencias conversión). Auto-refresh cada 30 segundos |
| Dashboard | Tarjetas de KPIs | Mostrar métricas en tarjetas con iconos Lucide, animaciones de conteo, indicadores de tendencia (+/-), colores dinámicos según rendimiento |
| Dashboard | Actividad Reciente | Mostrar últimas conversiones y cambios de estado con timestamps relativos, badges coloridos, scroll vertical |
| CRM | Detección Automática de Conversiones | Detectar automáticamente conversiones válidas al cambiar estados, registrar ConversionEvent, actualizar métricas instantáneamente |
| CRM | Gestión de Estados con Tracking | Cambiar estados de contactos con actualización automática de métricas, badges coloridos por estado, confirmación visual |
| CRM | Sistema de Notas Integrado | Agregar notas por contacto con tipos (llamada, reunión, email, general), timestamps automáticos, historial completo |
| CRM | Filtros y Búsqueda en Tiempo Real | Filtrar contactos por estado, búsqueda instantánea, vista filtrada según rol de usuario |

## 3. Flujo Principal del Proceso

El proceso principal se centra en la **detección automática de conversiones y actualización de métricas en tiempo real**:

1. **Cambio de Estado**: Un usuario cambia el estado de un contacto en el CRM usando updateContact()
2. **Detección Automática**: CRMStore detecta automáticamente si el cambio representa una conversión válida usando detectConversion()
3. **Registro de Conversión**: Se crea un ConversionEvent y se registra en MetricsStore usando recordConversion()
4. **Actualización Instantánea**: MetricsStore recalcula automáticamente todas las métricas:
   - Total de contactos y prospectos activos
   - Conversiones del mes y tasa de conversión
   - Tiempo promedio de conversión
   - Distribución del pipeline
   - Métricas filtradas por usuario
5. **Refresh de Dashboard**: Los componentes React se re-renderizan automáticamente con las nuevas métricas
6. **Persistencia**: Los cambios se guardan automáticamente en LocalStorage vía Zustand persist

```mermaid
graph TD
  A[Usuario cambia estado en CRM] --> B[CRMStore.updateContact()]
  B --> C[detectConversion() evalúa cambio]
  C --> D{¿Es conversión válida?}
  D -->|Sí| E[MetricsStore.recordConversion()]
  D -->|No| F[Solo actualiza contacto]
  E --> G[calculateMetrics() recalcula KPIs]
  F --> G
  G --> H[React re-renderiza Dashboard]
  H --> I[Zustand persist guarda en LocalStorage]
  I --> J[Dashboard actualizado en tiempo real]
```

## 4. Diseño de Interfaz de Usuario

### 4.1 Estilo de Diseño
- **Colores primarios:** Verde (#10b981) para conversiones y éxito, azul (#3b82f6) para acciones principales
- **Colores de métricas:** Rojo (#ef4444) para alertas, amarillo (#f59e0b) para advertencias, gris (#6b7280) para texto secundario
- **Colores de estado:** Verde claro (#dcfce7) para prospectos, azul claro (#dbeafe) para contactados, púrpura (#f3e8ff) para reuniones
- **Estilo de botones:** Redondeados (rounded-lg) con efectos hover, transiciones suaves, estados de carga
- **Tipografía:** Sistema de fuentes nativo, jerarquía desde text-sm (14px) hasta text-2xl (24px)
- **Estilo de layout:** Grid responsivo con tarjetas, sombras sutiles, bordes redondeados, espaciado consistente
- **Iconografía:** Lucide React para consistencia, iconos temáticos para cada tipo de métrica y estado

### 4.2 Diseño de Páginas

| Nombre de Página | Nombre del Módulo | Elementos de UI |
|------------------|-------------------|------------------|
| Dashboard | Tarjetas de Métricas | Tarjetas con gradientes sutiles, iconos Lucide temáticos, números grandes con animaciones de conteo, indicadores de tendencia |
| Dashboard | Gráficos Recharts | Gráficos responsivos con tooltips interactivos, colores temáticos consistentes, leyendas dinámicas, auto-refresh visual |
| Dashboard | Actividad Reciente | Lista con timestamps relativos, badges coloridos por estado, scroll vertical, avatares de usuario |
| CRM | Estados con Tracking | Badges coloridos por estado, dropdown de cambio de estado, confirmación visual, actualización instantánea de métricas |
| CRM | Gestión de Contactos | Tabla responsiva con filtros, búsqueda en tiempo real, acciones contextuales, modales para edición |
| CRM | Sistema de Notas | Modal con textarea, tipos de nota seleccionables, timestamps automáticos, historial expandible |

### 4.3 Responsividad
Diseño mobile-first con adaptación completa para tablets y desktop. Optimización táctil para dispositivos móviles con gestos intuitivos para navegación entre métricas.