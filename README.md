# 🌵 Cactus Dashboard - Sistema CRM Empresarial

Dashboard CRM completo con gestión de contactos, equipos, métricas en tiempo real e integración con Notion.

## 🚀 Características Principales

### 📊 CRM Completo
- **Gestión de Contactos**: CRUD completo con estados, tags y notas
- **Pipeline de Ventas**: Deals con seguimiento de estados y métricas
- **Gestión de Tareas**: Sistema de tareas con prioridades y asignaciones
- **Board Kanban**: Vista visual del pipeline de ventas

### 👥 Gestión de Equipos
- **Sistema de Roles**: Admin, Manager, Advisor
- **Permisos Granulares**: Control de acceso por rol
- **Métricas de Equipo**: Dashboard para managers
- **Aprobación de Usuarios**: Sistema de invitaciones y aprobaciones

### 📈 Analytics y Reportes
- **Dashboard en Tiempo Real**: Métricas actualizadas automáticamente
- **Datos Históricos**: Visualización de tendencias y performance
- **Comparación de Asesores**: Métricas individuales y de equipo
- **Exportación**: Generación de reportes en PDF y Excel

### 🔗 Integraciones
- **Notion CRM**: Integración completa con OAuth 2.0
- **Supabase**: Base de datos PostgreSQL con RLS
- **Real-time**: Actualizaciones en tiempo real vía websockets

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** + **TypeScript** - UI Library
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Navigation
- **Chart.js** + **Recharts** - Visualización de datos
- **React Beautiful DnD** - Drag and drop

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Notion API** - Integración CRM
- **JWT** - Autenticación de tokens

### Base de Datos
- **Supabase** (PostgreSQL)
- **Row Level Security (RLS)** - Seguridad a nivel de fila
- **Real-time subscriptions** - Updates en vivo

### Testing
- **Vitest** - Unit testing
- **Testing Library** - Component testing
- **Playwright** - E2E testing

## 📦 Instalación

### Prerrequisitos
- Node.js 18+ 
- npm o pnpm
- Cuenta de Supabase
- Cuenta de Notion (opcional, para integración)

### 1. Clonar e Instalar
```bash
git clone <repository-url>
cd CactusDashboard
npm install
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz:

```env
# Supabase
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Notion (opcional)
VITE_NOTION_CLIENT_ID=tu_notion_client_id
VITE_NOTION_CLIENT_SECRET=tu_notion_client_secret
VITE_NOTION_REDIRECT_URI=http://localhost:5173/notion-crm

# Entorno
NODE_ENV=development
```

### 3. Configurar Base de Datos
```bash
# Las migraciones están en /supabase/migrations
# Aplicarlas manualmente en el panel de Supabase o con CLI
```

### 4. Iniciar Desarrollo
```bash
# Frontend y Backend
npm run dev

# Solo Frontend (puerto 5173)
npm run client:dev

# Solo Backend (puerto 3001)
npm run server:dev
```

## 🎯 Scripts Disponibles

### Desarrollo
```bash
npm run dev          # Inicia cliente y servidor
npm run build        # Build de producción
npm run preview      # Preview del build
npm test             # Ejecuta tests
npm run lint         # Linter
npm run check        # Type checking
```

### Scripts de Base de Datos
```bash
npm run seed:advisors       # Crear advisors
npm run seed:test-user      # Crear usuario de prueba
npm run verify:db           # Verificar base de datos
npm run verify:roles        # Verificar sistema de roles
npm run health              # Health check del sistema
```

Ver todos los scripts disponibles en: [`SCRIPTS_GUIDE.md`](./SCRIPTS_GUIDE.md)

## 📁 Estructura del Proyecto

```
CactusDashboard/
├── src/                    # Frontend React
│   ├── components/         # Componentes reutilizables
│   ├── pages/             # Páginas principales
│   ├── store/             # Zustand stores
│   ├── types/             # TypeScript types
│   ├── services/          # API services
│   ├── utils/             # Utilidades
│   └── styles/            # Estilos globales
│
├── api/                   # Backend Express
│   ├── routes/            # Rutas API
│   ├── services/          # Servicios de negocio
│   ├── middleware/        # Middlewares
│   └── config/            # Configuraciones
│
├── supabase/              # Configuración DB
│   └── migrations/        # Migraciones SQL (101 archivos)
│
├── scripts/               # Scripts de utilidad
│   ├── tests/             # Scripts de testing
│   ├── checks/            # Scripts de verificación
│   ├── debug/             # Scripts de debugging
│   ├── setup/             # Scripts de configuración
│   ├── fixes/             # Scripts de reparación
│   └── utils/             # Utilidades
│
├── tests/                 # Tests E2E e integración
├── docs/                  # Documentación
└── public/                # Assets estáticos
```

## 🔐 Sistema de Roles y Permisos

### Roles Disponibles
- **Admin**: Acceso completo al sistema
- **Manager**: Gestión de equipo y visualización de métricas
- **Advisor**: Gestión de contactos y tareas propias

### Permisos por Rol

| Funcionalidad | Admin | Manager | Advisor |
|--------------|-------|---------|---------|
| Ver Dashboard | ✅ | ✅ | ✅ |
| Gestionar Contactos Propios | ✅ | ✅ | ✅ |
| Ver Contactos de Equipo | ✅ | ✅ | ❌ |
| Gestionar Equipo | ✅ | ✅ | ❌ |
| Aprobar Usuarios | ✅ | ✅ | ❌ |
| Ver Métricas de Equipo | ✅ | ✅ | ❌ |
| Configuración del Sistema | ✅ | ❌ | ❌ |
| Gestionar Roles | ✅ | ❌ | ❌ |

## 📚 Documentación

- **[Arquitectura Técnica](./ARQUITECTURA.md)** - Documentación técnica completa
- **[Integración Notion](./INTEGRACION_NOTION.md)** - Guía de integración con Notion
- **[Deployment](./DEPLOYMENT.md)** - Guía de deployment en Vercel
- **[Sistema de Diseño](./docs/DESIGN_SYSTEM.md)** - Colores y estilos
- **[Guía de Scripts](./SCRIPTS_GUIDE.md)** - Todos los scripts disponibles

## 🚀 Deployment

### Vercel (Recomendado)
```bash
# 1. Conecta tu repositorio a Vercel
# 2. Configura las variables de entorno
# 3. Deploy automático en cada push
```

Ver guía completa: [`DEPLOYMENT.md`](./DEPLOYMENT.md)

## 🧪 Testing

```bash
# Tests unitarios
npm test

# Tests en modo watch
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
cd tests && npm test
```

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -am 'feat: agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crea un Pull Request

### Convenciones
- TypeScript estricto para todo el código
- ESLint configurado y activo
- Tests para nuevas funcionalidades
- Commits semánticos (feat, fix, docs, etc.)

## 📝 Changelog

### v1.0.0 (Actual)
- ✅ Sistema CRM completo
- ✅ Gestión de equipos con roles
- ✅ Integración con Notion
- ✅ Dashboard de métricas en tiempo real
- ✅ Sistema de notas y comentarios
- ✅ Tags y categorización
- ✅ Exportación de reportes
- ✅ 101 migraciones de base de datos
- ✅ Suite completa de tests
- ✅ Sistema de roles robusto con RLS

## 🆘 Soporte

- **Documentación**: Revisa `/docs`
- **Issues**: GitHub Issues
- **Scripts**: `npm run` para ver comandos disponibles

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE) para más detalles.

---

**Desarrollado con ❤️ por el equipo de Cactus**
