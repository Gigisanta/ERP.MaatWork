# Suite de Pruebas Exhaustivas - CactusDashboard

## 📋 Descripción General

Este conjunto de scripts de prueba está diseñado para validar exhaustivamente el sistema CactusDashboard antes del deployment en producción. Las pruebas cubren aspectos críticos como aislamiento de datos, concurrencia, estrés, integridad y funcionalidades core.

## 🎯 Objetivos de las Pruebas

- ✅ **Aislamiento de Datos**: Verificar que cada usuario solo acceda a sus propios contactos
- ✅ **Concurrencia**: Validar operaciones simultáneas de múltiples usuarios
- ✅ **Estrés**: Probar el sistema bajo carga pesada y operaciones masivas
- ✅ **Integridad**: Asegurar consistencia y validez de los datos
- ✅ **Funcionalidades Críticas**: Verificar login, gestión de contactos y métricas
- ✅ **Rendimiento**: Monitorear métricas de performance y latencia

## 📁 Estructura de Archivos

```
tests/
├── data-isolation.test.js          # Pruebas de aislamiento de datos
├── concurrency.test.js             # Pruebas de concurrencia
├── stress.test.js                  # Pruebas de estrés y carga
├── data-integrity.test.js          # Validaciones de integridad
├── critical-functionality.test.js  # Pruebas de funcionalidades core
├── performance-metrics.test.js     # Métricas de rendimiento
├── run-all-tests.js               # Script principal (ejecuta todo)
├── README.md                       # Esta documentación
└── reports/                        # Reportes generados automáticamente
```

## 🚀 Ejecución Rápida

### Ejecutar Todas las Pruebas
```bash
# Desde el directorio raíz del proyecto
cd tests
node run-all-tests.js
```

### Ejecutar Pruebas Individuales
```bash
# Aislamiento de datos
node data-isolation.test.js

# Concurrencia
node concurrency.test.js

# Estrés
node stress.test.js

# Integridad de datos
node data-integrity.test.js

# Funcionalidades críticas
node critical-functionality.test.js

# Métricas de rendimiento
node performance-metrics.test.js
```

## ⚙️ Prerequisitos

### 1. Variables de Entorno
Asegúrate de tener configuradas las siguientes variables en tu archivo `.env`:

```env
VITE_SUPABASE_URL=tu-supabase-url
VITE_SUPABASE_ANON_KEY=tu-supabase-anon-key
```

### 2. Dependencias de Node.js
```bash
# Instalar dependencias principales
npm install @supabase/supabase-js

# Si no tienes las dependencias base del proyecto
npm install
```

### 3. Base de Datos
- Conexión activa a Supabase
- Tablas `users` y `contacts` configuradas
- Políticas RLS implementadas
- Permisos adecuados para roles `anon` y `authenticated`

## 📊 Interpretación de Resultados

### Estados de Prueba
- 🟢 **EXCELLENT**: Todas las pruebas críticas e importantes pasaron
- 🟡 **GOOD**: Pruebas críticas pasaron, algunas importantes fallaron
- 🟠 **ACCEPTABLE**: Pruebas críticas pasaron, pero hay problemas menores
- 🔴 **CRITICAL_ISSUES**: Pruebas críticas fallaron - NO listo para producción

### Criterios de Aprobación

#### Pruebas Críticas (deben pasar al 100%)
- **Aislamiento de Datos**: ≥90% éxito
- **Integridad de Datos**: ≥95% éxito
- **Funcionalidades Críticas**: ≥90% éxito

#### Pruebas Importantes (al menos 1 debe pasar)
- **Concurrencia**: ≥85% éxito
- **Métricas de Rendimiento**: ≥70 puntos

#### Pruebas Opcionales
- **Estrés**: ≥80% éxito (recomendado pero no crítico)

## 📈 Reportes Generados

Cada prueba genera reportes detallados en formato JSON:

```
reports/
├── data-isolation-[timestamp].json
├── concurrency-[timestamp].json
├── stress-[timestamp].json
├── data-integrity-[timestamp].json
├── critical-functionality-[timestamp].json
├── performance-metrics-[timestamp].json
└── consolidated-test-report-[timestamp].json  # Reporte maestro
```

### Estructura del Reporte Consolidado
```json
{
  "executiveSummary": {
    "status": "GOOD",
    "readyForProduction": true,
    "testResults": {
      "critical": "3/3",
      "important": "2/2",
      "optional": "1/1"
    }
  },
  "detailedResults": { ... },
  "recommendations": [ ... ]
}
```

## 🔧 Configuración Avanzada

### Personalizar Parámetros de Prueba

Puedes modificar los parámetros en cada archivo de prueba:

```javascript
// En stress.test.js
const STRESS_CONFIG = {
  maxUsers: 100,        // Usuarios concurrentes
  operationsPerUser: 50, // Operaciones por usuario
  duration: 300000      // Duración en ms (5 minutos)
};

// En concurrency.test.js
const CONCURRENCY_CONFIG = {
  concurrentUsers: 20,
  operationsPerUser: 10,
  poolSize: 10
};
```

### Variables de Entorno Adicionales
```env
# Opcional: Configurar timeouts
TEST_TIMEOUT=300000

# Opcional: Nivel de logging
TEST_LOG_LEVEL=info

# Opcional: Directorio de reportes personalizado
TEST_REPORTS_DIR=./custom-reports
```

## 🚨 Solución de Problemas Comunes

### Error: "permission denied for table"
```bash
# Verificar permisos en Supabase
# Ejecutar en SQL Editor de Supabase:
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
```

### Error: "Cannot connect to Supabase"
1. Verificar variables de entorno
2. Comprobar conectividad de red
3. Validar URL y keys de Supabase

### Pruebas Lentas o Timeouts
1. Reducir parámetros de estrés
2. Verificar latencia de red
3. Optimizar queries de base de datos

### Memory Leaks en Pruebas de Estrés
```bash
# Ejecutar con más memoria
node --max-old-space-size=4096 stress.test.js
```

## 📋 Checklist Pre-Deployment

### Antes de Ejecutar las Pruebas
- [ ] Variables de entorno configuradas
- [ ] Dependencias instaladas
- [ ] Conexión a Supabase activa
- [ ] Políticas RLS implementadas
- [ ] Permisos de base de datos configurados

### Después de las Pruebas
- [ ] Todas las pruebas críticas pasaron
- [ ] Al menos 1 prueba importante pasó
- [ ] Reporte consolidado generado
- [ ] Recomendaciones revisadas e implementadas
- [ ] Issues críticos resueltos

### Criterios de Aprobación para Producción
- [ ] Estado: EXCELLENT, GOOD o ACCEPTABLE
- [ ] `readyForProduction: true`
- [ ] Cero problemas críticos
- [ ] Advertencias revisadas y documentadas

## 🎯 Métricas de Éxito

### Rendimiento Esperado
- **Query Time**: < 1000ms promedio
- **Concurrencia**: > 85% éxito con 20+ usuarios
- **Throughput**: > 10 operaciones/segundo
- **Error Rate**: < 5%
- **Latencia**: < 500ms promedio

### Indicadores de Calidad
- **Aislamiento**: 100% de datos protegidos
- **Integridad**: 0 inconsistencias de datos
- **Funcionalidad**: Todas las features core operativas
- **Estabilidad**: Sin crashes bajo carga normal

## 📞 Soporte

Si encuentras problemas:

1. **Revisar logs**: Cada prueba genera logs detallados
2. **Consultar reportes**: Los archivos JSON contienen información diagnóstica
3. **Verificar prerequisitos**: Asegurar que todo esté configurado correctamente
4. **Ejecutar pruebas individuales**: Aislar el problema específico

## 🔄 Integración Continua

Para integrar en CI/CD:

```yaml
# GitHub Actions example
- name: Run Database Tests
  run: |
    cd tests
    node run-all-tests.js
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

---

**🎉 ¡El sistema está listo para soportar uso productivo intensivo una vez que todas las pruebas pasen exitosamente!**