<!-- 5baa274d-18ff-4756-892b-0495af9a9a02 83f2413a-ea63-449b-a943-02ace4cc2ed4 -->
# Plan: Sistema Unificado de Carteras con Datos Reales

## Fase 1: Arreglar Base de Datos y Backend

### 1.1 Aplicar Migraciones Pendientes

- Ejecutar migraciones existentes: `packages/db/migrations/0001_wandering_cerise.sql` ya crea las tablas necesarias (`price_snapshots`, `benchmark_definitions`, etc.)
- Comando: `cd packages/db && node run-migration.js`
- Esto resuelve los errores: "relation price_snapshots does not exist"

### 1.2 Crear Endpoint de Búsqueda Yahoo Finance

- Archivo: `apps/analytics-service/main.py`
- Nuevo endpoint: `POST /search/symbols` que use `yfinance.Ticker().info` para búsqueda fuzzy
- Parámetros: `{ "query": "Apple" }` → Retorna lista de símbolos sugeridos con nombre, exchange, tipo
- También endpoint: `GET /search/validate/{symbol}` para validar símbolo directo

### 1.3 Actualizar Endpoint de Instruments

- Archivo: `apps/api/src/routes/instruments.ts` (crear si no existe)
- `POST /instruments/search` - Proxy al microservicio Python para buscar símbolos
- `POST /instruments` - Crear instrumento desde Yahoo Finance (fetch info real y guardarlo)
- `GET /instruments` - Listar instrumentos con paginación y filtros

### 1.4 Simplificar Endpoint Analytics

- Archivo: `apps/api/src/routes/analytics.ts`
- Manejar caso cuando `price_snapshots` está vacío (return data con valores en 0, no error 500)
- Agregar endpoint: `GET /analytics/performance/:portfolioId?period={1M,3M,6M,1Y,YTD,ALL}`
- Retorna: serie temporal de rendimiento acumulado calculado desde `price_snapshots`

### 1.5 Endpoint de Comparación

- Archivo: `apps/api/src/routes/analytics.ts`
- Nuevo: `POST /analytics/compare` con body: `{ portfolioIds: [], benchmarkIds: [], period: "1Y" }`
- Calcula rendimiento de cada cartera/benchmark y retorna series normalizadas al 100% en fecha inicial

## Fase 2: Refactor Frontend - Panel Unificado "Carteras"

### 2.1 Crear Página Principal Unificada

- Archivo: `apps/web/app/portfolios/page.tsx` (reemplazar completamente)
- Layout: Vista con paneles expandibles (Accordion/Collapsible):

1. **Mis Carteras** - Lista de carteras con preview de composición
2. **Crear/Editar Cartera** - Form con buscador de activos
3. **Rendimiento y Comparación** - Selector de carteras + gráfico
4. **Benchmarks** - Gestión de benchmarks (solo admin/manager)

### 2.2 Componente: Buscador de Activos Real

- Archivo: `apps/web/app/components/AssetSearcher.tsx`
- Input de búsqueda con debounce (300ms)
- Llama a `/instruments/search` con query
- Muestra dropdown con sugerencias: símbolo, nombre, exchange
- Permite input directo de símbolo (ej: "AAPL") con validación
- Al seleccionar: guarda instrumento en BD y lo agrega a la cartera

### 2.3 Componente: Gráfico de Rendimiento

- Archivo: `apps/web/app/components/PerformanceChart.tsx`
- Usa Recharts LineChart con múltiples series
- Props: `portfolioIds[]`, `benchmarkIds[]`, `period`
- Fetch de `/analytics/compare` con los IDs seleccionados
- Muestra series normalizadas (base 100) con colores distintos
- Selector de período: botones 1M, 3M, 6M, 1Y, YTD, Todo

### 2.4 Componente: Comparador Flexible

- Archivo: `apps/web/app/components/PortfolioComparator.tsx`
- Multi-selector para carteras (propias + benchmarks)
- Tabla comparativa: rendimiento %, volatilidad, Sharpe (si disponible)
- Integra `PerformanceChart.tsx`
- Botón "Agregar al comparador" en cada cartera de la lista

### 2.5 Sección de Benchmarks Integrada

- Dentro de `apps/web/app/portfolios/page.tsx`
- Panel expandible "Benchmarks"
- Lista de benchmarks con tipo (individual/compuesto)
- Form para crear benchmark:
- **Individual**: Buscar ticker de índice (ej: ^MERV, ^GSPC) con `AssetSearcher`
- **Compuesto**: Agregar múltiples activos con pesos (validación suma=100%)
- Solo visible para admin/manager

## Fase 3: Integración Python - Datos Reales

### 3.1 Implementar Búsqueda en Yahoo Finance

- Archivo: `apps/analytics-service/yfinance_client.py`
- Función: `search_symbols(query: str)` - busca por nombre/ticker
- Usa `yfinance.Ticker(symbol).info` para obtener metadata
- Maneja errores (símbolo no encontrado, timeout)
- Retorna lista: `[{symbol, name, exchange, type, currency}]`

### 3.2 Backfill Automático al Agregar Instrumento

- Al crear instrumento desde frontend → backend llama a Python
- `POST /prices/backfill` con símbolo y período (default: 1 año)
- Guarda histórico en `price_snapshots`
- Retorna confirmación + número de registros insertados

### 3.3 Cálculo de Rendimiento de Carteras

- Archivo nuevo: `apps/analytics-service/portfolio_performance.py`
- Función: `calculate_portfolio_return(components, start_date, end_date)`
- Parámetros: lista de `{instrument_id, weight}`, rango de fechas
- Fetch precios de `price_snapshots` vía API backend o DB directa
- Calcula rendimiento ponderado diario → serie temporal acumulada
- Endpoint: `POST /portfolio/performance`

## Fase 4: Mejoras UX y Pulido

### 4.1 Eliminar Páginas Redundantes

- Eliminar: `apps/web/app/benchmarks/page.tsx` (ahora integrado)
- Eliminar: `apps/web/app/analytics/page.tsx` (ahora integrado)
- Actualizar: `apps/web/app/page.tsx` - cambiar links a nuevo panel unificado

### 4.2 Manejo de Estados Vacíos

- Cuando no hay carteras: mensaje + CTA "Crear tu primera cartera"
- Cuando no hay precios: mensaje "Cargando datos..." durante backfill
- Cuando búsqueda sin resultados: sugerencia "Intenta con el símbolo exacto (ej: AAPL)"

### 4.3 Validaciones y Feedback

- Validar suma de pesos = 100% en tiempo real
- Loading states durante búsqueda de símbolos
- Confirmación al crear cartera: "Obteniendo precios históricos..."
- Toast notifications para éxito/error

### 4.4 Seed de Benchmarks Comunes

- Script: `packages/db/src/seed-benchmarks.ts` (actualizar)
- Agregar benchmarks individuales reales:
- `^MERV` (Merval), `^GSPC` (S&P 500), `^IXIC` (Nasdaq)
- `EEM` (MSCI Emerging Markets), `AGG` (US Bonds)
- Ejecutar seed después de migraciones

## Archivos Clave a Modificar

**Backend:**

- `apps/api/src/routes/analytics.ts` - Agregar endpoints de performance y comparación
- `apps/api/src/routes/instruments.ts` - CREAR nuevo con búsqueda y CRUD
- `apps/api/src/index.ts` - Registrar ruta `/instruments`

**Python:**

- `apps/analytics-service/main.py` - Agregar endpoints de búsqueda
- `apps/analytics-service/yfinance_client.py` - Implementar búsqueda
- `apps/analytics-service/portfolio_performance.py` - CREAR nuevo

**Frontend:**

- `apps/web/app/portfolios/page.tsx` - REESCRIBIR completamente
- `apps/web/app/components/AssetSearcher.tsx` - CREAR
- `apps/web/app/components/PerformanceChart.tsx` - CREAR
- `apps/web/app/components/PortfolioComparator.tsx` - CREAR
- `apps/web/app/page.tsx` - Actualizar navegación

**Database:**

- `packages/db/run-migration.js` - Ejecutar migraciones existentes
- `packages/db/src/seed-benchmarks.ts` - Actualizar con benchmarks reales

### To-dos

- [ ] Aplicar migraciones pendientes para crear tablas price_snapshots, benchmark_definitions, etc.
- [ ] Implementar búsqueda de símbolos en Yahoo Finance en analytics-service
- [ ] Crear routes/instruments.ts con búsqueda y CRUD de instrumentos reales
- [ ] Crear endpoint GET /analytics/performance/:portfolioId con parámetro period
- [ ] Crear endpoint POST /analytics/compare para comparar múltiples carteras/benchmarks
- [ ] Crear componente AssetSearcher.tsx con búsqueda real en Yahoo Finance
- [ ] Crear componente PerformanceChart.tsx con Recharts y selector de período
- [ ] Crear componente PortfolioComparator.tsx con multi-selector y tabla comparativa
- [ ] Reescribir portfolios/page.tsx como panel unificado con secciones expandibles
- [ ] Implementar cálculo de rendimiento de carteras en portfolio_performance.py
- [ ] Eliminar páginas redundantes (benchmarks, analytics) y actualizar navegación
- [ ] Actualizar seed con benchmarks reales (^MERV, ^GSPC, etc.) y ejecutar
- [ ] Agregar estados vacíos, loading states, validaciones y toast notifications