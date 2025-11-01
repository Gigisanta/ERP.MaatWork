# 🧪 Plan Completo de Testing - Cactus Dashboard

## 📊 Análisis de la Base de Código Actual

### **Componentes y Módulos Identificados**

#### **Apps/Web (Frontend React)**
- **19 Páginas** (Dashboard, CRM, Login, Register, Profile, Team, Admin, etc.)
- **43+ Componentes** (KanbanBoard, ContactsManager, DealsManager, TasksManager, etc.)
- **5 Hooks personalizados** (usePermissions, useTheme, useKeyboardShortcut, etc.)
- **13 Stores Zustand** (authStore, crmStore, metricsStore, etc.)
- **6 Servicios** (crmService, notionService, metricsService, etc.)
- **8 Utilidades** (logger, formatters, exportUtils, etc.)

#### **Apps/API (Backend Express)**
- **4 Rutas principales** (auth, crm, notion, auth-notion)
- **1 Servicio** (notionService)
- **1 Middleware** (auth.ts para JWT)
- **Health endpoint** para monitoreo

### **Funcionalidades Críticas**
1. **Autenticación y Autorización** (JWT, roles, permisos)
2. **CRM** (Gestión de contactos, deals, tasks)
3. **Kanban Board** (Drag & drop de tareas)
4. **Team Management** (Gestión de equipo, aprobaciones)
5. **Métricas y Analytics** (Dashboard, conversiones, performance)
6. **Notion Integration** (Sincronización con Notion)
7. **Exportación de datos** (Excel, PDF)

---

## 🎯 Plan de Testing por Prioridades

### **FASE 1: Testing de Infraestructura (Alta Prioridad) ⚠️**

#### 1.1 Autenticación y Autorización
**Tests Unitarios (Vitest):**
```typescript
apps/api/tests/auth.test.ts
apps/web/src/__tests__/components/ProtectedRoute.test.tsx
apps/web/src/__tests__/hooks/usePermissions.test.ts
```

**Tests a Implementar:**
- ✅ Login con credenciales válidas
- ✅ Login con credenciales inválidas
- ✅ Registro de usuario nuevo
- ✅ Validación de roles (admin, manager, advisor)
- ✅ Protected routes funcionan correctamente
- ✅ Permisos por ruta según rol
- ✅ Logout funciona correctamente
- ✅ Token refresh

**Tests E2E (Playwright):**
```typescript
packages/testing/e2e/auth-flow.spec.ts
```
- Flujo completo de registro
- Flujo de login y logout
- Verificar redirecciones según permisos

---

#### 1.2 Middleware y Configuración
**Tests Unitarios:**
```typescript
apps/api/tests/middleware/auth.test.ts
```
- Verificar JWT validation
- Manejo de tokens expirados
- Verificar user context en requests
- CORS headers correctos

---

### **FASE 2: Testing de Servicios Core (Alta Prioridad) 🔥**

#### 2.1 CRM Service
**Tests Unitarios:**
```typescript
apps/web/src/services/__tests__/crmService.test.ts
```
- ✅ Crear contacto válido
- ✅ Validar campos requeridos
- ✅ Verificar duplicados (email)
- ✅ Obtener lista de contactos
- ✅ Actualizar contacto
- ✅ Eliminar contacto
- ✅ Filtrado y búsqueda

**Tests de Integración:**
```typescript
apps/api/tests/integration/crm-integration.test.ts
```
- CRUD completo de contactos
- Sincronización con Notion
- Métricas automáticas

**Tests E2E:**
```typescript
packages/testing/e2e/crm-flow.spec.ts
```
- Usuario crea contacto
- Usuario actualiza status
- Usuario filtra y busca contactos

---

#### 2.2 Notion Service
**Tests Unitarios:**
```typescript
apps/web/src/services/__tests__/notionService.test.ts
apps/api/tests/integration/notion-integration.test.ts
```
- ✅ Conexión OAuth
- ✅ Sincronización de datos
- ✅ Manejo de errores de API
- ✅ Cache de respuestas
- ✅ Sincronización incremental

**Tests E2E:**
```typescript
packages/testing/e2e/notion-sync.spec.ts
```
- Conectar cuenta Notion
- Sincronizar datos
- Verificar datos en dashboard

---

### **FASE 3: Testing de Componentes React (Media Prioridad) 📦**

#### 3.1 Componentes de Gestión
**Tests Unitarios:**
```typescript
apps/web/src/components/__tests__/
  ├── ContactsManager.test.tsx
  ├── DealsManager.test.tsx
  ├── TasksManager.test.tsx
  ├── KanbanBoard.test.tsx
  └── MetricCard.test.tsx
```

**Tests a Implementar:**
- ✅ Renderizado correcto
- ✅ Estado inicial
- ✅ Interacciones del usuario
- ✅ Formularios y validación
- ✅ Drag & drop (Kanban)
- ✅ Filtrado y búsqueda
- ✅ Exportación de datos

#### 3.2 Componentes de UI
```typescript
apps/web/src/components/__tests__/
  ├── Header.test.tsx
  ├── Sidebar.test.tsx
  ├── NotificationToast.test.tsx
  └── Breadcrumbs.test.tsx
```

#### 3.3 Componentes de Manager
```typescript
apps/web/src/components/manager/__tests__/
  ├── ManagerDashboard.test.tsx
  ├── TeamOverview.test.tsx
  └── AdvisorMetrics.test.tsx
```

---

### **FASE 4: Testing de Páginas (Media Prioridad) 📄**

#### 4.1 Páginas Principales
**Tests de Integración:**
```typescript
apps/web/src/pages/__tests__/
  ├── Dashboard.test.tsx
  ├── CRM.test.tsx
  ├── Profile.test.tsx
  └── Team.test.tsx
```

#### 4.2 Páginas de Manager
```typescript
apps/web/src/pages/team/__tests__/
  ├── Approvals.test.tsx
  ├── Metrics.test.tsx
  └── Tasks.test.tsx
```

**Tests E2E:**
```typescript
packages/testing/e2e/
  ├── dashboard-flow.spec.ts
  ├── crm-management.spec.ts
  ├── team-management.spec.ts
  └── manager-workflow.spec.ts
```

---

### **FASE 5: Testing de Hooks (Baja Prioridad) 🪝**

```typescript
apps/web/src/hooks/__tests__/
  ├── usePermissions.test.ts
  ├── useTheme.test.ts
  ├── useKeyboardShortcut.test.ts
  ├── useRoutePermissions.test.ts
  └── useUserValidation.test.ts
```

---

### **FASE 6: Testing de Stores Zustand (Baja Prioridad) 💾**

```typescript
apps/web/src/store/__tests__/
  ├── authStore.test.ts
  ├── crmStore.test.ts
  ├── metricsStore.test.ts
  └── teamStore.test.ts
```

---

### **FASE 7: Testing E2E de Flujos Completos (Alta Prioridad) 🚀**

```typescript
packages/testing/e2e/
  ├── 1-user-onboarding.spec.ts     # Registro → Dashboard
  ├── 2-crm-workflow.spec.ts        # Crear → Contactar → Convertir
  ├── 3-kanban-flow.spec.ts         # Crear → Mover → Completar
  ├── 4-notion-sync.spec.ts         # Conectar → Sincronizar
  ├── 5-team-management.spec.ts      # Invitar → Aprobar → Verificar
  ├── 6-metrics-tracking.spec.ts    # Entrada → Conversión
  └── 7-export-data.spec.ts         # Exportar Excel/PDF
```

---

## 📁 Estructura de Carpetas Escalable

```
project/
├── apps/
│   ├── api/
│   │   ├── tests/
│   │   │   ├── auth.test.ts ✅
│   │   │   ├── crm.test.ts ✅
│   │   │   ├── middleware/
│   │   │   │   └── auth.test.ts
│   │   │   └── integration/
│   │   │       ├── crm-integration.test.ts
│   │   │       └── notion-integration.test.ts
│   │   └── vitest.config.ts ✅
│   │
│   └── web/
│       └── src/
│           ├── components/
│           │   └── __tests__/       # ← Crear
│           │       ├── ContactsManager.test.tsx
│           │       ├── DealsManager.test.tsx
│           │       ├── KanbanBoard.test.tsx
│           │       └── ...
│           ├── services/
│           │   └── __tests__/       # ← Crear
│           │       ├── crmService.test.ts
│           │       ├── notionService.test.ts
│           │       └── ...
│           ├── hooks/
│           │   └── __tests__/       # ← Crear
│           │       ├── usePermissions.test.ts
│           │       └── ...
│           ├── store/
│           │   └── __tests__/       # ← Crear
│           │       ├── authStore.test.ts
│           │       └── ...
│           ├── pages/
│           │   └── __tests__/       # ← Crear
│           │       ├── Dashboard.test.tsx
│           │       └── ...
│           └── tests/
│               └── setup.ts ✅
│
├── packages/
│   └── testing/
│       ├── e2e/                     # E2E tests
│       │   ├── auth-flow.spec.ts
│       │   ├── crm-flow.spec.ts
│       │   └── ...
│       ├── fixtures/                # ✅
│       ├── utils/                   # ✅
│       └── config/                  # ✅
│
└── tests/                           # Ya existente
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 📈 Métricas de Cobertura Objetivo

| Módulo | Cobertura Objetivo | Prioridad |
|--------|-------------------|-----------|
| Auth & Middleware | 90% | 🔥 Crítica |
| CRM Service | 85% | 🔥 Crítica |
| Notion Service | 80% | 🔥 Crítica |
| API Endpoints | 75% | ⚠️ Alta |
| Core Components | 70% | ⚠️ Alta |
| Manager Features | 60% | 📦 Media |
| UI Components | 50% | 📄 Media |
| Hooks | 60% | 🪝 Baja |
| Stores | 50% | 💾 Baja |

---

## 🎬 Plan de Implementación por Sprints

### **Sprint 1 (Semana 1-2): Fundaciones**
- ✅ Configurar framework de testing
- ✅ Crear fixtures y helpers
- Tests de autenticación (unit + E2E)
- Tests de middleware

### **Sprint 2 (Semana 3-4): CRM Core**
- Tests de crmService (unit + integration)
- Tests de componentes CRM (ContactsManager, DealsManager)
- Tests E2E de flujos CRM básicos

### **Sprint 3 (Semana 5-6): Servicios**
- Tests de Notion Service
- Tests de métricas y analytics
- Tests E2E de integración Notion

### **Sprint 4 (Semana 7-8): Componentes**
- Tests de KanbanBoard (drag & drop)
- Tests de componentes de manager
- Tests de páginas principales

### **Sprint 5 (Semana 9-10): E2E Completo**
- Flujos completos de usuario
- Testing cross-browser
- Performance testing

### **Sprint 6 (Semana 11-12): Refinamiento**
- Coverage gaps
- Edge cases
- CI/CD integration

---

## 🛠️ Comandos Útiles

```bash
# Ejecutar tests específicos
pnpm run test:api              # Solo API tests
pnpm run test:web              # Solo React tests
pnpm run test:e2e             # Solo E2E tests

# Con cobertura
pnpm run test:coverage

# Modo watch
pnpm --filter @cactus/web test:watch
pnpm --filter @cactus/api test:watch

# E2E UI interactivo
pnpm run test:e2e:ui

# Filtrar por archivo
pnpm --filter @cactus/api test auth.test.ts
```

---

## ✅ Checklist de Implementación

### Infraestructura
- [x] Package @cactus/testing creado
- [x] Configuración de Vitest para API
- [x] Configuración de Playwright
- [x] Fixtures y helpers
- [ ] Setup de CI/CD para tests

### Testing de API
- [x] Setup de tests
- [ ] Tests de auth
- [ ] Tests de CRM
- [ ] Tests de Notion
- [ ] Tests de middleware

### Testing de Web
- [ ] Tests de servicios
- [ ] Tests de componentes
- [ ] Tests de hooks
- [ ] Tests de stores
- [ ] Tests de páginas

### Testing E2E
- [ ] Auth flow
- [ ] CRM workflow
- [ ] Kanban flow
- [ ] Notion sync
- [ ] Team management

### Documentación
- [x] README del package testing
- [ ] Guía de contribución para tests
- [ ] CI/CD documentation

---

## 📝 Notas Finales

1. **Enfoque Incremental**: Implementar tests progresivamente, priorizando funcionalidades críticas
2. **Mocking**: Usar fixtures centralizados para mantener consistencia
3. **E2E Selective**: Solo flujos críticos para E2E (más lentos)
4. **Fast Feedback**: Unit tests deben ejecutarse rápidamente
5. **CI Integration**: Todos los tests deben pasar en CI antes de merge

