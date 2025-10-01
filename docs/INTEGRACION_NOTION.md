# 🔗 Integración con Notion - Guía Completa

Guía para configurar e utilizar la integración de Cactus Dashboard con Notion.

## 📋 Descripción General

El sistema permite conectar workspaces de Notion y utilizar bases de datos de Notion como fuente de datos para el CRM, con sincronización bidireccional y migración desde Supabase.

## 🎯 Funcionalidades

- ✅ OAuth 2.0 con Notion
- ✅ Conectar múltiples workspaces
- ✅ Sincronización automática de contactos, deals y tareas
- ✅ Migración de datos desde Supabase a Notion
- ✅ Logging detallado de operaciones
- ✅ Manejo de errores y retry automático

## 🔧 Configuración Inicial

### 1. Crear Integración en Notion

1. Ve a [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click en "+ New integration"
3. Completa:
   - **Name**: Cactus Dashboard
   - **Logo**: (opcional)
   - **Associated workspace**: Selecciona tu workspace
4. En **Capabilities**, habilita:
   - ✅ Read content
   - ✅ Update content
   - ✅ Insert content
5. En **User Information**, habilita:
   - ✅ Read user information including email addresses
6. Click "Submit"
7. Guarda el **Internal Integration Token** (lo necesitarás después)

### 2. Configurar OAuth 2.0

1. En la página de tu integración, ve a la pestaña **OAuth**
2. Click en "Enable Public Integration"
3. Configura:
   - **Redirect URIs**: 
     - Desarrollo: `http://localhost:5173/notion-callback`
     - Producción: `https://tu-dominio.com/notion-callback`
4. Guarda el **Client ID** y **Client Secret**

### 3. Configurar Variables de Entorno

Agrega a tu archivo `.env`:

```env
# Notion OAuth
VITE_NOTION_CLIENT_ID=tu_client_id_aqui
VITE_NOTION_CLIENT_SECRET=tu_client_secret_aqui
VITE_NOTION_REDIRECT_URI=http://localhost:5173/notion-callback
VITE_NOTION_CRM_FALLBACK_URL=https://notion.so/tu-pagina-fallback

# Para desarrollo con Internal Integration
NOTION_INTERNAL_TOKEN=tu_internal_token_aqui
```

## 🚀 Uso del Sistema

### Conectar Workspace

1. **Navegar a la página de Notion CRM**
   ```
   http://localhost:5173/notion-crm
   ```

2. **Iniciar autenticación**
   - Click en botón "Conectar con Notion"
   - Serás redirigido a Notion para autorizar

3. **Autorizar en Notion**
   - Selecciona el workspace que quieres conectar
   - Click en "Select pages" (o "Select all pages")
   - Click en "Allow access"

4. **Confirmación**
   - Serás redirigido de vuelta a la aplicación
   - Verás un mensaje de éxito
   - El workspace estará disponible en el selector

### Sincronizar Datos

#### Sincronización Manual

```typescript
// Desde el componente NotionCRM
const handleSync = async () => {
  try {
    await notionService.syncContacts(workspaceId);
    toast.success('Sincronización completada');
  } catch (error) {
    toast.error('Error en sincronización');
  }
};
```

#### Sincronización Automática

La sincronización automática se ejecuta:
- Cada 5 minutos (configurable)
- Al crear/actualizar contactos
- Al detectar cambios en Notion (webhooks - futuro)

### Migrar Datos desde Supabase

```typescript
// Migrar todos los contactos
const migrateContacts = async () => {
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user.id);

  for (const contact of contacts) {
    await notionService.createContact(workspaceId, {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      status: contact.status,
      tags: contact.tags
    });
  }
};
```

## 📊 Estructura de Datos en Notion

### Database de Contactos

```json
{
  "title": "CRM Contacts",
  "properties": {
    "Name": { "type": "title" },
    "Email": { "type": "email" },
    "Phone": { "type": "phone_number" },
    "Status": { 
      "type": "select",
      "options": [
        { "name": "Prospecto", "color": "gray" },
        { "name": "Cliente", "color": "green" },
        { "name": "Inactivo", "color": "red" }
      ]
    },
    "Tags": { "type": "multi_select" },
    "Created": { "type": "created_time" },
    "Last Updated": { "type": "last_edited_time" }
  }
}
```

### Database de Deals

```json
{
  "title": "CRM Deals",
  "properties": {
    "Title": { "type": "title" },
    "Contact": { "type": "relation", "relation": { "database_id": "contacts_db_id" } },
    "Value": { "type": "number", "format": "dollar" },
    "Status": { 
      "type": "select",
      "options": [
        { "name": "Prospecto", "color": "gray" },
        { "name": "Negociación", "color": "yellow" },
        { "name": "Cerrado Ganado", "color": "green" },
        { "name": "Cerrado Perdido", "color": "red" }
      ]
    },
    "Expected Close": { "type": "date" },
    "Created": { "type": "created_time" }
  }
}
```

### Database de Tareas

```json
{
  "title": "CRM Tasks",
  "properties": {
    "Title": { "type": "title" },
    "Description": { "type": "rich_text" },
    "Contact": { "type": "relation" },
    "Deal": { "type": "relation" },
    "Status": { 
      "type": "select",
      "options": [
        { "name": "Por hacer", "color": "gray" },
        { "name": "En progreso", "color": "blue" },
        { "name": "Completada", "color": "green" },
        { "name": "Cancelada", "color": "red" }
      ]
    },
    "Priority": { 
      "type": "select",
      "options": [
        { "name": "Baja", "color": "green" },
        { "name": "Media", "color": "yellow" },
        { "name": "Alta", "color": "orange" },
        { "name": "Urgente", "color": "red" }
      ]
    },
    "Due Date": { "type": "date" },
    "Assigned To": { "type": "people" }
  }
}
```

## 🔄 API de Notion Service

### Métodos Principales

```typescript
class NotionService {
  /**
   * Autenticar con OAuth
   */
  async authenticateOAuth(code: string): Promise<{
    access_token: string;
    workspace_id: string;
    workspace_name: string;
  }>;

  /**
   * Crear database en Notion
   */
  async createDatabase(
    workspaceId: string,
    config: DatabaseConfig
  ): Promise<Database>;

  /**
   * Crear página (contacto/deal/task)
   */
  async createPage(
    databaseId: string,
    properties: PageProperties
  ): Promise<Page>;

  /**
   * Actualizar página
   */
  async updatePage(
    pageId: string,
    properties: PageProperties
  ): Promise<Page>;

  /**
   * Query database
   */
  async queryDatabase(
    databaseId: string,
    filter?: Filter
  ): Promise<Page[]>;

  /**
   * Sincronizar contactos
   */
  async syncContacts(workspaceId: string): Promise<{
    created: number;
    updated: number;
    failed: number;
  }>;
}
```

### Ejemplos de Uso

**Crear contacto en Notion**
```typescript
const contact = await notionService.createPage(contactsDbId, {
  Name: {
    title: [{ text: { content: 'John Doe' } }]
  },
  Email: {
    email: 'john@example.com'
  },
  Phone: {
    phone_number: '+1234567890'
  },
  Status: {
    select: { name: 'Prospecto' }
  },
  Tags: {
    multi_select: [
      { name: 'VIP' },
      { name: 'Nuevo' }
    ]
  }
});
```

**Buscar contactos**
```typescript
const contacts = await notionService.queryDatabase(contactsDbId, {
  filter: {
    property: 'Status',
    select: {
      equals: 'Cliente'
    }
  },
  sorts: [
    {
      property: 'Created',
      direction: 'descending'
    }
  ]
});
```

## 🔒 Seguridad

### Almacenamiento de Tokens

Los access tokens de Notion se almacenan cifrados en Supabase:

```sql
CREATE TABLE notion_workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id VARCHAR(255) NOT NULL,
  workspace_name VARCHAR(255),
  access_token TEXT NOT NULL, -- Cifrado
  bot_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS: Solo el dueño puede ver sus tokens
CREATE POLICY "Users can only see own workspaces"
  ON notion_workspaces FOR SELECT
  USING (user_id = auth.uid());
```

### Rate Limiting

Notion API tiene límites:
- **3 requests/segundo** por integración
- **1000 requests/día** para aplicaciones públicas

Implementamos:
```typescript
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerSecond = 3;
  
  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }
  
  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const batch = this.queue.splice(0, this.requestsPerSecond);
    
    await Promise.all(batch.map(fn => fn()));
    
    setTimeout(() => {
      this.processing = false;
      this.process();
    }, 1000);
  }
}
```

## 🐛 Debugging

### Logs de Migración

```sql
CREATE TABLE migration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  workspace_id VARCHAR(255),
  entity_type VARCHAR(50), -- 'contact', 'deal', 'task'
  entity_id UUID,
  status VARCHAR(50), -- 'success', 'failed'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Ver logs en consola

```typescript
// Habilitar debug mode
localStorage.setItem('notion_debug', 'true');

// Los logs aparecerán en consola
notionService.setDebugMode(true);
```

## ❗ Troubleshooting

### Error: "Invalid grant"
**Causa**: El código de autorización ya fue usado o expiró  
**Solución**: Reiniciar el flujo OAuth

### Error: "Unauthorized"
**Causa**: Token inválido o expirado  
**Solución**: Reconectar workspace

### Error: "Rate limited"
**Causa**: Demasiadas requests  
**Solución**: Esperar 1 minuto y reintentar

### Error: "Database not found"
**Causa**: La database fue eliminada en Notion  
**Solución**: Crear nueva database o reconectar

## 📚 Recursos

- [Notion API Documentation](https://developers.notion.com/)
- [Notion OAuth Guide](https://developers.notion.com/docs/authorization)
- [Notion SDK for JavaScript](https://github.com/makenotion/notion-sdk-js)

---

**Última actualización:** Octubre 2025  
**Versión:** 1.0.0


