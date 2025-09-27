# CRM System con Integración Notion

## 🚀 Descripción

Sistema CRM completo con integración a Notion para gestión de contactos, oportunidades de venta y tareas. Incluye autenticación OAuth, migración de datos y dashboard analítico.

## 📋 Características Principales

- **Gestión de Contactos**: CRUD completo con sincronización a Notion
- **Oportunidades de Venta**: Pipeline de ventas con seguimiento de estados
- **Gestión de Tareas**: Sistema de tareas con prioridades y fechas límite
- **Integración Notion**: OAuth 2.0 y sincronización bidireccional
- **Dashboard Analítico**: Métricas y estadísticas en tiempo real
- **Migración de Datos**: Herramientas para migrar desde Supabase a Notion
- **Sistema de Logging**: Logging robusto para debugging en producción
- **Health Check**: Monitoreo de servicios y conectividad

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Base de Datos**: Supabase (PostgreSQL)
- **Integración**: Notion API
- **Testing**: Vitest, Testing Library
- **Autenticación**: OAuth 2.0 con Notion
- **Estado**: Zustand
- **Routing**: React Router

## 📦 Instalación

### Prerrequisitos

- Node.js 18+ 
- npm o pnpm
- Cuenta de Notion con API access
- Proyecto de Supabase configurado

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd CactusDashboardV4
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crear archivo `.env.local`:
   ```env
   # Notion API
   NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxx
   NOTION_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   NOTION_CLIENT_SECRET=secret_xxxxxxxxxxxxxxxxx
   NOTION_REDIRECT_URI=http://localhost:3000/api/auth/notion/callback
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   
   # App
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-nextauth-secret
   ```

4. **Configurar Supabase**
   
   Ejecutar las migraciones SQL en Supabase:
   ```sql
   -- Crear tablas principales
   CREATE TABLE contacts (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name VARCHAR NOT NULL,
     email VARCHAR UNIQUE,
     phone VARCHAR,
     company VARCHAR,
     position VARCHAR,
     notes TEXT,
     notion_page_id VARCHAR,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   CREATE TABLE deals (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     title VARCHAR NOT NULL,
     contact_id UUID REFERENCES contacts(id),
     amount DECIMAL(10,2),
     stage VARCHAR DEFAULT 'lead',
     probability INTEGER DEFAULT 0,
     expected_close_date DATE,
     notes TEXT,
     notion_page_id VARCHAR,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   CREATE TABLE tasks (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     title VARCHAR NOT NULL,
     description TEXT,
     contact_id UUID REFERENCES contacts(id),
     deal_id UUID REFERENCES deals(id),
     priority VARCHAR DEFAULT 'medium',
     status VARCHAR DEFAULT 'pending',
     due_date TIMESTAMP WITH TIME ZONE,
     notion_page_id VARCHAR,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

5. **Configurar Notion Integration**
   
   - Ir a [Notion Developers](https://developers.notion.com/)
   - Crear nueva integración
   - Obtener Internal Integration Token
   - Configurar OAuth (si se requiere)
   - Compartir páginas/databases con la integración

## 🚀 Uso

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Ejecutar tests
npm test

# Health check
node scripts/health-check.js

# Build para producción
npm run build
```

### Estructura del Proyecto

```
├── src/
│   ├── components/          # Componentes React
│   │   ├── crm/            # Componentes específicos del CRM
│   │   └── ui/             # Componentes UI reutilizables
│   ├── pages/              # Páginas de la aplicación
│   ├── hooks/              # Custom hooks
│   ├── utils/              # Utilidades y helpers
│   └── types/              # Definiciones de tipos TypeScript
├── api/
│   ├── routes/             # Rutas de la API
│   ├── services/           # Servicios (Notion, Supabase)
│   └── middleware/         # Middleware de Express
├── tests/
│   ├── unit/               # Tests unitarios
│   ├── integration/        # Tests de integración
│   └── e2e/                # Tests end-to-end
├── scripts/                # Scripts de utilidad
└── utils/                  # Utilidades compartidas
```

## 🧪 Testing

El proyecto incluye una suite completa de tests:

```bash
# Ejecutar todos los tests
npm test

# Tests específicos
npx vitest run tests/unit/crm-components.test.tsx
npx vitest run tests/integration/crm-api.test.ts
npx vitest run tests/e2e/notion-oauth.test.ts
npx vitest run tests/integration/data-migration.test.ts

# Tests con coverage
npm run test:coverage
```

### Tipos de Tests

- **Unitarios**: Componentes React, servicios, utilidades
- **Integración**: APIs, base de datos, servicios externos
- **E2E**: Flujos completos de usuario

## 🔧 Health Check

El sistema incluye un script de health check para verificar:

- Variables de entorno
- Conectividad de red
- Notion API
- Supabase
- Servidor local

```bash
node scripts/health-check.js
```

## 📊 Logging

Sistema de logging robusto con múltiples niveles:

```typescript
import { log } from './utils/logger';

// Diferentes niveles
log.info('Operación exitosa', { userId: '123' });
log.error('Error crítico', error, { context: 'api' });
log.debug('Información de debug', { data });

// Logs específicos
log.api('GET', '/api/contacts', 200, 150);
log.notion('create', 'contact', { contactId: '123' });
log.database('SELECT', 'contacts', 50);
```

## 🔄 Migración de Datos

Herramientas para migrar datos desde Supabase a Notion:

```bash
# Iniciar migración
curl -X POST http://localhost:3000/api/migration/start

# Verificar estado
curl http://localhost:3000/api/migration/status

# Ver datos migrados
curl http://localhost:3000/api/migration/data
```

## 🔐 Autenticación OAuth

Flujo de OAuth 2.0 con Notion:

1. Usuario hace clic en "Conectar con Notion"
2. Redirección a Notion para autorización
3. Callback con código de autorización
4. Intercambio por access token
5. Almacenamiento seguro del token

## 📈 Dashboard y Métricas

El dashboard incluye:

- Total de contactos, deals y tareas
- Conversión mensual
- Pipeline de ventas
- Tareas pendientes
- Gráficos interactivos

## 🚨 Troubleshooting

### Errores Comunes

1. **"supabaseUrl is required"**
   - Verificar variables de entorno de Supabase
   - Ejecutar health check

2. **"NOTION_TOKEN no está configurado"**
   - Configurar token de Notion en `.env.local`
   - Verificar permisos de la integración

3. **Tests fallando**
   - Verificar configuración de test setup
   - Revisar mocks en `tests/setup.ts`

4. **Error de importación dinámica**
   - Verificar sintaxis ES modules
   - Revisar configuración de Vite

### Logs de Debug

```bash
# Ver logs en tiempo real
tail -f logs/app-$(date +%Y-%m-%d).log

# Filtrar por nivel
grep "ERROR" logs/app-*.log
```

## 🤝 Contribución

1. Fork del proyecto
2. Crear branch para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico:

1. Revisar documentación
2. Ejecutar health check
3. Revisar logs de error
4. Crear issue en GitHub

---

**Estado del Sistema**: ✅ Funcional con 56/56 tests pasando

**Última actualización**: $(date)