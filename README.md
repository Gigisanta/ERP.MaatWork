# Cactus Dashboard V4 - Sistema CRM Integrado con Notion

Aplicación web moderna que integra un sistema CRM nativo con Notion, permitiendo gestionar datos de CRM directamente desde workspaces de Notion con capacidades de migración desde Supabase.

## 🚀 Características Principales

- **Integración Nativa con Notion:** Conecta directamente con workspaces de Notion
- **OAuth 2.0:** Autenticación segura con Notion
- **Migración de Datos:** Migra datos existentes desde Supabase a Notion
- **Sincronización Automática:** Mantiene datos actualizados en tiempo real
- **Interfaz Moderna:** Built with React + TypeScript + Vite
- **Base de Datos:** Supabase para configuración y logs
- **Testing Completo:** Suite de pruebas unitarias con Vitest

## 📋 Documentación

- **[Guía de Implementación](./NOTION_CRM_IMPLEMENTATION.md)** - Documentación técnica completa
- **[Guía de Usuario](./NOTION_CRM_USER_GUIDE.md)** - Manual de uso del sistema
- **[Documentos de Arquitectura](./.trae/documents/)** - Especificaciones técnicas detalladas

## 🛠️ Tecnologías Utilizadas

### Frontend
- React 18 + TypeScript
- Vite para build y desarrollo
- Tailwind CSS para estilos
- Zustand para gestión de estado
- React Router para navegación

### Backend
- Node.js + Express + TypeScript
- Notion API para integración
- Supabase para base de datos
- OAuth 2.0 para autenticación

### Testing
- Vitest para pruebas unitarias
- Testing Library para componentes React
- Mocks para APIs externas

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- npm o pnpm
- Cuenta de Notion con permisos de desarrollador
- Proyecto de Supabase configurado

### 1. Clonar e Instalar
```bash
git clone <repository-url>
cd CactusDashboardV4
npm install
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env` basado en `.env.example`:

```env
# Notion Configuration
VITE_NOTION_CLIENT_ID=your_notion_client_id
VITE_NOTION_CLIENT_SECRET=your_notion_client_secret
VITE_NOTION_REDIRECT_URI=http://localhost:5173/notion-crm
VITE_NOTION_CRM_FALLBACK_URL=https://notion.so/your-fallback-page

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Configurar Base de Datos
```bash
# Aplicar migraciones de Supabase
npm run db:migrate
```

### 4. Iniciar Desarrollo
```bash
# Frontend y Backend
npm run dev

# Solo Frontend
npm run dev:client

# Solo Backend
npm run dev:server
```

## 🧪 Testing

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas específicas
npm test src/tests/notionService.test.ts

# Ejecutar con cobertura
npm run test:coverage

# Modo watch
npm run test:watch
```

## 📦 Build y Deploy

```bash
# Build para producción
npm run build

# Preview del build
npm run preview

# Deploy a Vercel
npm run deploy
```

## 🎯 Uso Rápido

1. **Acceder al CRM:** Navega a `/notion-crm`
2. **Conectar Notion:** Haz clic en "Conectar con Notion"
3. **Autorizar:** Permite el acceso en la ventana de Notion
4. **¡Listo!** Ya puedes gestionar tus datos de CRM desde Notion

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Notion API    │
│   (React)       │◄──►│   (Express)     │◄──►│                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   OAuth 2.0     │    │   Workspaces    │
│   (Database)    │    │   (Auth)        │    │   (Data)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Estructura del Proyecto

```
CactusDashboardV4/
├── src/
│   ├── components/          # Componentes React reutilizables
│   ├── pages/              # Páginas principales
│   │   └── NotionCRM.tsx   # Página principal del CRM
│   ├── services/           # Servicios y APIs
│   │   └── notionService.ts # Servicio de Notion
│   ├── types/              # Definiciones de tipos TypeScript
│   │   └── notion.ts       # Tipos de Notion
│   ├── tests/              # Pruebas unitarias
│   └── lib/                # Configuraciones y utilidades
├── api/                    # Backend Express
│   └── crm/               # Rutas del CRM
├── supabase/              # Configuración de Supabase
│   └── migrations/        # Migraciones SQL
├── .trae/documents/       # Documentación técnica
└── docs/                  # Documentación adicional
```

## 🤝 Contribución

1. **Fork** el repositorio
2. **Crea** una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Crea** un Pull Request

### Estándares de Código
- Usar TypeScript para todo el código
- Seguir las convenciones de ESLint configuradas
- Escribir pruebas para nuevas funcionalidades
- Documentar cambios importantes

## 📝 Changelog

### v1.0.0 (Actual)
- ✅ Integración completa con Notion API
- ✅ Sistema OAuth 2.0 funcional
- ✅ Migración de datos desde Supabase
- ✅ Suite de pruebas completa
- ✅ Documentación técnica y de usuario

### Próximas Versiones
- 🔄 Cache Redis para optimización
- 📊 Dashboard de analytics
- 🔔 Notificaciones en tiempo real
- 📱 PWA y soporte móvil

## 🆘 Soporte

- **Documentación:** Revisa las guías en `/docs`
- **Issues:** Reporta problemas en GitHub Issues
- **Discusiones:** Únete a las discusiones del proyecto

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

**Desarrollado con ❤️ para la comunidad de desarrolladores**
