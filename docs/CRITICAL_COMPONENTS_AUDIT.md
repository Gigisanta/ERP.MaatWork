# Auditoría de Componentes Críticos

## Fecha: Diciembre 2024

Este documento identifica componentes críticos sin tests y prioriza su implementación.

---

## Componentes Críticos Identificados

### Alta Prioridad (Críticos para el negocio)

1. **`apps/web/app/contacts/[id]/page.tsx`** - Página de detalle de contacto
   - **Criticidad**: ALTA
   - **Razón**: Página principal del CRM, maneja datos críticos de clientes
   - **Tests necesarios**: Carga de datos, errores 404, renderizado de secciones, navegación

2. **`apps/web/app/components/NavigationNew.tsx`** - Navegación principal
   - **Criticidad**: ALTA
   - **Razón**: Componente usado en toda la aplicación, maneja autenticación y rutas
   - **Tests necesarios**: Renderizado según rol, navegación, estado de sidebar

3. **`apps/web/app/components/ConfirmDialog.tsx`** - Diálogo de confirmación
   - **Criticidad**: ALTA
   - **Razón**: Usado para acciones destructivas, crítico para seguridad
   - **Tests necesarios**: Renderizado, callbacks, variantes

### Media Prioridad (Importantes pero no críticos)

4. **`apps/web/app/portfolios/[id]/page.tsx`** - Detalle de portfolio
   - **Criticidad**: MEDIA
   - **Razón**: Maneja CRUD de líneas de portfolio, importante pero menos crítico
   - **Tests necesarios**: CRUD de líneas, validación, manejo de errores

5. **`apps/web/app/admin/aum/page.tsx`** - Hub AUM
   - **Criticidad**: MEDIA
   - **Razón**: Página de navegación, menos lógica de negocio
   - **Tests necesarios**: Renderizado, navegación

6. **`apps/web/app/components/PortfolioComparator.tsx`** - Comparador de portfolios
   - **Criticidad**: MEDIA
   - **Razón**: Componente complejo pero no crítico para operación básica
   - **Tests necesarios**: Selección de portfolios, comparación, manejo de datos

### Baja Prioridad (Ya tienen tests o son menos críticos)

- `apps/web/app/components/PerformanceChart.tsx` - Ya tiene lazy loading optimizado
- `apps/web/app/components/AssetSearcher.tsx` - Componente auxiliar
- `apps/web/app/admin/aum/rows/page.tsx` - Ya tiene tests
- `apps/web/app/admin/aum/components/FileUploader.tsx` - Ya tiene tests

---

## Plan de Implementación

### Fase 1: Componentes de Alta Prioridad
1. Tests para `contacts/[id]/page.tsx`
2. Tests para `NavigationNew.tsx`
3. Tests para `ConfirmDialog.tsx`

### Fase 2: Componentes de Media Prioridad
4. Tests para `portfolios/[id]/page.tsx`
5. Tests para `admin/aum/page.tsx`

---

## Cobertura Objetivo

- **Alta Prioridad**: ≥70% (líneas, funciones, branches)
- **Media Prioridad**: ≥60% (líneas, funciones, branches)
- **Baja Prioridad**: ≥50% (líneas, funciones, branches)

---

## Estado Actual

- ✅ Tests existentes: 14 archivos de tests encontrados
- ⚠️ Tests faltantes: 5 componentes críticos identificados
- 📊 Cobertura estimada: ~40% (necesita verificación con `pnpm test:coverage`)


