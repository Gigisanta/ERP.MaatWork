# Sistema CRM Integrado con Notion - Implementación

## Descripción General

Este sistema implementa un CRM nativo integrado con Notion que opera como "Notion-first" con capacidades de migración desde Supabase. El sistema permite a los usuarios conectar sus workspaces de Notion y utilizar bases de datos de Notion como fuente principal de datos para el CRM.

## Arquitectura del Sistema

### Componentes Principales

1. **Frontend (React + TypeScript)**
   - `src/pages/NotionCRM.tsx` - Página principal del CRM
   - `src/services/notionService.ts` - Servicio para interactuar con Notion API
   - `src/types/notion.ts` - Tipos y validadores para Notion

2. **Backend (Express + TypeScript)**
   - `api/crm/` - Rutas del CRM
   - `api/crm/oauth/` - Manejo de OAuth con Notion
   - `api/crm/migration/` - Funcionalidades de migración

3. **Base de Datos (Supabase)**
   - `notion_workspaces` - Configuraciones de workspaces
   - `migration_logs` - Registro de migraciones

## Funcionalidades Implementadas

### 1. Autenticación OAuth con Notion
- Flujo completo de OAuth 2.0
- Almacenamiento seguro de tokens de acceso
- Renovación automática de tokens

### 2. Gestión de Configuración
- Configuración por usuario de workspaces de Notion
- URLs de fallback configurables
- Validación de URLs de Notion

### 3. Integración con Notion API
- Conexión con bases de datos de Notion
- Sincronización de datos
- Manejo de errores y reconexión automática

### 4. Sistema de Migración
- Migración de datos desde Supabase a Notion
- Logs detallados de migración
- Rollback en caso de errores

## Configuración del Entorno

### Variables de Entorno Requeridas

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

### Instalación y Configuración

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   - Copiar `.env.example` a `.env`
   - Completar todas las variables requeridas

3. **Configurar base de datos:**
   ```bash
   # Aplicar migraciones
   npm run db:migrate
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

## Uso del Sistema

### 1. Configuración Inicial

1. Navegar a `/notion-crm`
2. Hacer clic en "Conectar con Notion"
3. Autorizar la aplicación en Notion
4. Seleccionar el workspace deseado

### 2. Gestión de Datos

- **Ver datos:** Los datos se muestran directamente desde Notion
- **Editar datos:** Las modificaciones se sincronizan automáticamente
- **Migrar datos:** Usar el panel de migración para transferir datos desde Supabase

### 3. Configuración Avanzada

- **URLs de fallback:** Configurar páginas de Notion como respaldo
- **Sincronización:** Ajustar frecuencia de sincronización
- **Permisos:** Gestionar permisos de acceso a bases de datos

## API Endpoints

### OAuth
- `POST /api/crm/oauth/start` - Iniciar flujo OAuth
- `POST /api/crm/oauth/callback` - Manejar callback de OAuth
- `DELETE /api/crm/oauth/disconnect` - Desconectar workspace

### Configuración
- `GET /api/crm/config` - Obtener configuración del usuario
- `PUT /api/crm/config` - Actualizar configuración
- `DELETE /api/crm/config` - Eliminar configuración

### Migración
- `POST /api/crm/migration/start` - Iniciar migración
- `GET /api/crm/migration/status` - Estado de migración
- `POST /api/crm/migration/rollback` - Revertir migración

## Estructura de Base de Datos

### Tabla: notion_workspaces
```sql
CREATE TABLE notion_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  bot_id TEXT,
  notion_url TEXT,
  fallback_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabla: migration_logs
```sql
CREATE TABLE migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES notion_workspaces(id) ON DELETE CASCADE,
  migration_type TEXT NOT NULL,
  status TEXT NOT NULL,
  source_table TEXT,
  target_database TEXT,
  records_migrated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

## Pruebas

El sistema incluye pruebas unitarias completas:

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas específicas del NotionService
npm test src/tests/notionService.test.ts

# Ejecutar pruebas con cobertura
npm run test:coverage
```

### Cobertura de Pruebas
- ✅ OAuth Flow
- ✅ Configuration Management
- ✅ URL Management
- ✅ URL Validation
- ✅ Error Handling

## Solución de Problemas

### Problemas Comunes

1. **Error de OAuth:**
   - Verificar que las URLs de redirect coincidan
   - Confirmar que el client_id y client_secret sean correctos

2. **Error de conexión con Notion:**
   - Verificar que el token de acceso sea válido
   - Confirmar permisos en el workspace de Notion

3. **Error de migración:**
   - Revisar logs en la tabla migration_logs
   - Verificar conectividad con ambas bases de datos

### Logs y Debugging

- Los logs del sistema se encuentran en la consola del navegador
- Los logs del servidor se muestran en la terminal
- Los logs de migración se almacenan en la base de datos

## Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crear una rama para la feature
3. Implementar cambios con pruebas
4. Enviar pull request

## Licencia

Este proyecto está bajo la licencia MIT.