# 🏗️ Arquitectura Técnica - Cactus Dashboard

Documentación técnica completa del sistema CRM Cactus Dashboard.

## 📊 Visión General del Sistema

### Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                    (React + TypeScript)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Dashboard │  │  CRM Page  │  │  Manager   │           │
│  │            │  │            │  │  Panel     │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│           │              │               │                  │
│           └──────────────┴───────────────┘                  │
│                         │                                    │
│                    Zustand Store                             │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
                    HTTP / WS
                          │
┌─────────────────────────┼────────────────────────────────────┐
│                    API LAYER                                 │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Express    │  │  Auth       │  │  Notion     │        │
│  │  Routes     │  │  Middleware │  │  Service    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────┼────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
┌─────────────▼──────────┐  ┌────────▼─────────┐
│     SUPABASE           │  │   NOTION API     │
│  (PostgreSQL + Auth)   │  │   (External)     │
│                        │  │                  │
│  • RLS Policies        │  │  • Workspaces    │
│  • Real-time Subs      │  │  • Databases     │
│  • 101 Migrations      │  │  • OAuth 2.0     │
└────────────────────────┘  └──────────────────┘
```

## 🎯 Componentes Principales

### 1. Frontend (React + TypeScript)

#### Estructura de Carpetas
```
src/
├── components/          # Componentes React
│   ├── manager/         # Componentes de manager
│   ├── team/            # Componentes de equipo
│   └── notes/           # Sistema de notas
│
├── pages/               # Páginas principales
│   ├── Dashboard.tsx    # Dashboard principal
│   ├── CRMPage.tsx      # Sistema CRM
│   ├── NotionCRM.tsx    # Integración Notion
│   ├── AdminPanel.tsx   # Panel administrador
│   └── team/            # Páginas de equipo
│
├── store/               # Zustand stores
│   ├── authStore.ts     # Estado de autenticación
│   ├── crmStore.ts      # Estado del CRM
│   ├── notesStore.ts    # Estado de notas
│   └── uiStore.ts       # Estado de UI
│
├── types/               # TypeScript types
│   ├── crm.ts           # Tipos CRM
│   ├── auth.ts          # Tipos autenticación
│   ├── notion.ts        # Tipos Notion
│   ├── team.ts          # Tipos equipo
│   └── metrics.ts       # Tipos métricas
│
├── services/            # Servicios API
│   ├── crmService.ts    # Servicio CRM
│   ├── notionService.ts # Servicio Notion
│   └── metricsService.ts# Servicio métricas
│
└── utils/               # Utilidades
    ├── dateUtils.ts     # Utilidades de fechas
    ├── formatters.ts    # Formateadores
    └── validators.ts    # Validadores
```

#### State Management (Zustand)

**authStore.ts** - Gestión de autenticación
```typescript
interface AuthState {
  user: User | null;
  role: 'admin' | 'manager' | 'advisor' | null;
  isLoading: boolean;
  isApproved: boolean;
  pendingApproval: boolean;
}
```

**crmStore.ts** - Gestión del CRM
```typescript
interface CRMState {
  contacts: Contact[];
  deals: Deal[];
  tasks: Task[];
  tags: Tag[];
  notes: Note[];
  // Acciones
  addContact: (contact: Contact) => Promise<void>;
  updateContact: (id: string, data: Partial<Contact>) => Promise<void>;
  // ...
}
```

### 2. Backend (Express + TypeScript)

#### Estructura
```
api/
├── routes/
│   ├── auth.ts          # Autenticación
│   ├── crm.ts           # Endpoints CRM
│   ├── notion.ts        # Endpoints Notion
│   └── auth-notion.ts   # OAuth Notion
│
├── services/
│   └── notionService.ts # Lógica de Notion
│
├── middleware/
│   └── auth.ts          # Middleware autenticación
│
├── config/
│   └── supabase.ts      # Config Supabase
│
├── app.ts               # Configuración Express
├── server.ts            # Servidor principal
└── index.ts             # Entry point
```

#### Endpoints Principales

**Auth Routes** (`/api/auth`)
```
POST   /api/auth/login          - Login de usuario
POST   /api/auth/register       - Registro de usuario
POST   /api/auth/logout         - Logout
GET    /api/auth/me             - Usuario actual
```

**CRM Routes** (`/api/crm`)
```
GET    /api/crm/contacts        - Listar contactos
POST   /api/crm/contacts        - Crear contacto
PUT    /api/crm/contacts/:id    - Actualizar contacto
DELETE /api/crm/contacts/:id    - Eliminar contacto

GET    /api/crm/deals           - Listar deals
POST   /api/crm/deals           - Crear deal
PUT    /api/crm/deals/:id       - Actualizar deal

GET    /api/crm/tasks           - Listar tareas
POST   /api/crm/tasks           - Crear tarea
PUT    /api/crm/tasks/:id       - Actualizar tarea
```

**Notion Routes** (`/api/notion`)
```
POST   /api/notion/oauth        - Iniciar OAuth
GET    /api/notion/callback     - Callback OAuth
GET    /api/notion/workspaces   - Listar workspaces
POST   /api/notion/sync         - Sincronizar datos
```

### 3. Base de Datos (Supabase + PostgreSQL)

#### Esquema Principal

**Tabla: users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'advisor')),
  is_approved BOOLEAN DEFAULT false,
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Tabla: contacts**
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Prospecto',
  tags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Tabla: deals**
```sql
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  title VARCHAR(255) NOT NULL,
  value DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'Prospecto',
  expected_close_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Tabla: tasks**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  deal_id UUID REFERENCES deals(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'medium',
  due_date TIMESTAMP,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Tabla: teams**
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  manager_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Tabla: notes**
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  deal_id UUID REFERENCES deals(id),
  task_id UUID REFERENCES tasks(id),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Row Level Security (RLS)

**Políticas de Seguridad**

```sql
-- Users: Solo pueden ver usuarios de su equipo
CREATE POLICY "Users can view team members"
  ON users FOR SELECT
  USING (
    auth.uid() = id OR
    team_id IN (
      SELECT team_id FROM users WHERE id = auth.uid()
    )
  );

-- Contacts: Solo pueden ver sus propios contactos o de su equipo
CREATE POLICY "Users can view own or team contacts"
  ON contacts FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT id FROM users 
      WHERE team_id = (
        SELECT team_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Contacts: Solo pueden crear/actualizar sus propios contactos
CREATE POLICY "Users can manage own contacts"
  ON contacts FOR ALL
  USING (user_id = auth.uid());

-- Similar para deals, tasks, notes...
```

#### Triggers y Funciones

**Trigger: Actualizar updated_at**
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

**Función: Calcular métricas de advisor**
```sql
CREATE OR REPLACE FUNCTION calculate_advisor_metrics(advisor_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_contacts', COUNT(DISTINCT c.id),
    'total_deals', COUNT(DISTINCT d.id),
    'total_value', COALESCE(SUM(d.value), 0),
    'completed_tasks', COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed')
  ) INTO result
  FROM users u
  LEFT JOIN contacts c ON c.user_id = u.id
  LEFT JOIN deals d ON d.user_id = u.id
  LEFT JOIN tasks t ON t.assigned_to = u.id
  WHERE u.id = advisor_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## 🔐 Sistema de Autenticación y Autorización

### Flujo de Autenticación

```
1. Usuario ingresa email/password
   ↓
2. Frontend envía credenciales a Supabase
   ↓
3. Supabase valida y retorna JWT
   ↓
4. Frontend almacena JWT en localStorage
   ↓
5. Cada request incluye JWT en header Authorization
   ↓
6. Backend valida JWT con Supabase
   ↓
7. Backend verifica permisos según rol
   ↓
8. Retorna respuesta o error 403
```

### Middleware de Autenticación

```typescript
// api/middleware/auth.ts
export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  req.user = user;
  next();
};

export const requireRole = (...roles: string[]) => {
  return async (req, res, next) => {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();
      
    if (!roles.includes(userData.role)) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }
    
    next();
  };
};
```

## 📡 Real-time y WebSockets

### Suscripciones en Tiempo Real

```typescript
// Suscripción a cambios en contactos
const contactsSubscription = supabase
  .channel('contacts-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'contacts' },
    (payload) => {
      console.log('Contact changed:', payload);
      // Actualizar store
      updateContactsStore(payload.new);
    }
  )
  .subscribe();

// Suscripción a cambios en tasks del usuario
const tasksSubscription = supabase
  .channel('tasks-changes')
  .on('postgres_changes',
    { 
      event: '*', 
      schema: 'public', 
      table: 'tasks',
      filter: `assigned_to=eq.${user.id}`
    },
    (payload) => {
      updateTasksStore(payload.new);
    }
  )
  .subscribe();
```

## 🔄 Integración con Notion

### Flujo OAuth 2.0

```
1. Usuario click "Conectar con Notion"
   ↓
2. Redirect a Notion OAuth
   ↓
3. Usuario autoriza en Notion
   ↓
4. Notion redirect con code
   ↓
5. Backend intercambia code por access_token
   ↓
6. Almacenar token en Supabase
   ↓
7. Usuario puede sincronizar datos
```

### Sincronización de Datos

```typescript
// Migrar contactos a Notion
const migrateContactsToNotion = async (workspaceId: string) => {
  // 1. Obtener contactos de Supabase
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user.id);
  
  // 2. Crear database en Notion
  const database = await notion.databases.create({
    parent: { workspace: true },
    title: [{ text: { content: 'CRM Contacts' } }],
    properties: {
      Name: { title: {} },
      Email: { email: {} },
      Phone: { phone_number: {} },
      Status: { select: {} }
    }
  });
  
  // 3. Insertar contactos
  for (const contact of contacts) {
    await notion.pages.create({
      parent: { database_id: database.id },
      properties: {
        Name: { title: [{ text: { content: contact.name } }] },
        Email: { email: contact.email },
        Phone: { phone_number: contact.phone },
        Status: { select: { name: contact.status } }
      }
    });
  }
};
```

## 📊 Sistema de Métricas

### Métricas Calculadas

```typescript
interface Metrics {
  // Métricas de contactos
  totalContacts: number;
  newContactsThisMonth: number;
  contactsByStatus: Record<string, number>;
  
  // Métricas de deals
  totalDeals: number;
  totalValue: number;
  averageDealValue: number;
  dealsByStatus: Record<string, number>;
  conversionRate: number;
  
  // Métricas de tasks
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  
  // Métricas de equipo (managers/admins)
  teamPerformance: AdvisorMetrics[];
  topPerformers: User[];
}
```

### Cálculo en Real-time

```typescript
// Hook personalizado para métricas
const useMetrics = (userId?: string) => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  
  useEffect(() => {
    const calculateMetrics = async () => {
      // Paralelo: obtener todos los datos
      const [contacts, deals, tasks] = await Promise.all([
        supabase.from('contacts').select('*').eq('user_id', userId),
        supabase.from('deals').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('assigned_to', userId)
      ]);
      
      // Calcular métricas
      const metrics = {
        totalContacts: contacts.data.length,
        totalDeals: deals.data.length,
        totalValue: deals.data.reduce((sum, d) => sum + d.value, 0),
        // ...
      };
      
      setMetrics(metrics);
    };
    
    calculateMetrics();
    
    // Suscribirse a cambios
    const subscription = supabase
      .channel('metrics-updates')
      .on('postgres_changes', { event: '*', schema: 'public' }, 
        () => calculateMetrics()
      )
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, [userId]);
  
  return metrics;
};
```

## 🧪 Testing

### Estrategia de Testing

1. **Unit Tests**: Servicios, utilidades, stores
2. **Component Tests**: Componentes React
3. **Integration Tests**: Flujos completos
4. **E2E Tests**: Casos de uso críticos

### Ejemplos

**Unit Test - Service**
```typescript
describe('crmService', () => {
  it('should create contact', async () => {
    const contact = await crmService.createContact({
      name: 'Test User',
      email: 'test@example.com'
    });
    
    expect(contact.id).toBeDefined();
    expect(contact.name).toBe('Test User');
  });
});
```

**Component Test**
```typescript
describe('ContactCard', () => {
  it('should render contact info', () => {
    render(<ContactCard contact={mockContact} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

## 🚀 Performance y Optimización

### Frontend Optimizations

1. **Code Splitting**: Lazy loading de páginas
2. **Memoization**: React.memo, useMemo, useCallback
3. **Virtual Scrolling**: Para listas grandes
4. **Image Optimization**: WebP, lazy loading
5. **Bundle Size**: Tree shaking, minificación

### Backend Optimizations

1. **Database Indexing**: Índices en columnas frecuentes
2. **Query Optimization**: Select solo campos necesarios
3. **Caching**: Redis para datos frecuentes (futuro)
4. **Connection Pooling**: Pool de conexiones DB

### Database Indexes

```sql
-- Índices para búsquedas frecuentes
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_deals_user_id ON deals(user_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Índice para búsqueda por email
CREATE INDEX idx_contacts_email ON contacts(email);

-- Índice GIN para JSONB tags
CREATE INDEX idx_contacts_tags ON contacts USING GIN (tags);
```

## 📈 Escalabilidad

### Consideraciones de Escalabilidad

1. **Horizontal Scaling**: Serverless functions (Vercel)
2. **Database**: Supabase escala automáticamente
3. **CDN**: Assets servidos vía CDN de Vercel
4. **Rate Limiting**: Implementar en API (futuro)
5. **Caching Layer**: Redis para hot data (futuro)

### Límites Actuales

- **Supabase Free Tier**: 500 MB DB, 1 GB bandwidth/día
- **Vercel**: 100 GB bandwidth/mes
- **Notion API**: 3 requests/segundo

---

**Última actualización:** Octubre 2025  
**Versión:** 1.0.0


