# 🏢 Arquitectura de Monorepo - Cactus Dashboard

## Estructura de Monorepo

### Estado Actual → Estado Objetivo

**ACTUAL (Estructura Mixta):**
```
CactusDashboard/
├── src/              # Frontend mezclado
├── api/              # Backend mezclado
├── package.json      # Dependencias mezcladas
└── ...
```

**OBJETIVO (Monorepo Profesional):**
```
CactusDashboard/
├── apps/
│   ├── web/              # Frontend App
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── api/              # Backend App
│       ├── routes/
│       ├── services/
│       ├── middleware/
│       ├── package.json
│       ├── tsconfig.json
│       └── server.ts
│
├── packages/
│   ├── shared/           # Código compartido
│   │   ├── types/        # TypeScript types compartidos
│   │   ├── constants/    # Constantes compartidas
│   │   └── utils/        # Utils compartidos
│   │
│   ├── database/         # Cliente DB compartido
│   │   ├── client.ts     # Supabase client
│   │   ├── types.ts      # Database types
│   │   └── migrations/   # SQL migrations
│   │
│   └── config/           # Configuraciones compartidas
│       ├── eslint/
│       └── typescript/
│
├── package.json          # Root workspace
├── pnpm-workspace.yaml   # Workspace config
└── turbo.json            # Build orchestration (opcional)
```

## Reglas de Separación Frontend/Backend

### ❌ PROHIBIDO: Imports Cruzados Directos

```typescript
// ❌ NUNCA: Backend importando frontend
// apps/api/routes/auth.ts
import { LoginForm } from '../../web/src/components/LoginForm';  // ❌ PROHIBIDO

// ❌ NUNCA: Frontend importando backend directamente
// apps/web/src/pages/Login.tsx
import { validateUser } from '../../api/services/authService';   // ❌ PROHIBIDO
```

### ✅ PERMITIDO: Usar Packages Compartidos

```typescript
// ✅ BIEN: Backend usando tipos compartidos
// apps/api/routes/auth.ts
import { User, LoginRequest } from '@cactus/shared/types';

// ✅ BIEN: Frontend usando tipos compartidos
// apps/web/src/pages/Login.tsx
import { User, LoginRequest } from '@cactus/shared/types';

// ✅ BIEN: Ambos usando cliente DB compartido
// apps/api/services/userService.ts
import { supabase } from '@cactus/database';

// apps/web/src/services/crmService.ts
import { supabase } from '@cactus/database';
```

## Configuración de Workspace

### `package.json` (Root)

```json
{
  "name": "cactus-dashboard-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev -w @cactus/web\" \"npm run dev -w @cactus/api\"",
    "dev:web": "npm run dev -w @cactus/web",
    "dev:api": "npm run dev -w @cactus/api",
    "build": "npm run build --workspaces",
    "build:web": "npm run build -w @cactus/web",
    "build:api": "npm run build -w @cactus/api",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces"
  }
}
```

### `pnpm-workspace.yaml` (para pnpm)

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## Boundaries de Responsabilidad

### Frontend (`apps/web/`) - SOLO:

```typescript
// ✅ Responsabilidades del Frontend
- UI Components (React)
- Client-side routing (React Router)
- Client-side state (Zustand)
- Form validation (client-side)
- User interactions
- Client-side caching
- Optimistic updates
- Llamadas a API (fetch/axios)

// ❌ NO debe hacer
- OAuth flows (excepto iniciar)
- Llamadas directas a APIs de terceros con secrets
- Operaciones con service role keys
- Lógica de negocio que requiera secrets
```

**Ejemplo Frontend:**
```typescript
// apps/web/src/services/crmService.ts
export const crmService = {
  // ✅ BIEN: Llamar al backend
  async getContacts() {
    const response = await fetch('/api/crm/contacts', {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },
  
  // ✅ BIEN: Llamar directamente a Supabase con anon key
  async getMyContacts() {
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id);  // RLS maneja la seguridad
    return data;
  }
};
```

### Backend (`apps/api/`) - SOLO:

```typescript
// ✅ Responsabilidades del Backend
- OAuth flows (Notion, Google, etc.)
- Proxy de APIs externas
- Operaciones con service role keys
- Rate limiting
- Webhooks de servicios externos
- Server-side validation
- Logging centralizado

// ❌ NO debe hacer
- Renderizar UI
- Tener lógica de componentes
- Manejar estado de UI
- Formateo de datos para display (eso es del frontend)
```

**Ejemplo Backend:**
```typescript
// apps/api/routes/notion.ts
import express from 'express';
import { Client } from '@notionhq/client';
import { NotionOAuthConfig } from '@cactus/shared/types';

const router = express.Router();

// ✅ BIEN: OAuth flow (requiere client_secret)
router.post('/oauth/callback', async (req, res) => {
  const { code } = req.body;
  
  // Client secret NO puede estar en frontend
  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: process.env.NOTION_CLIENT_ID,
      client_secret: process.env.NOTION_CLIENT_SECRET,  // ← Solo en backend
      redirect_uri: process.env.NOTION_REDIRECT_URI
    })
  });
  
  const data = await response.json();
  res.json(data);
});

export default router;
```

### Shared Packages (`packages/`) - SOLO:

```typescript
// ✅ Responsabilidades de Shared
- Types e interfaces compartidas
- Constantes compartidas
- Funciones utilitarias puras (sin side effects)
- Validadores (Zod schemas)
- Cliente de DB configurado
- Configuraciones compartidas

// ❌ NO debe tener
- Lógica de negocio específica de frontend
- Lógica de negocio específica de backend
- Componentes React
- Middlewares Express
- Dependencias pesadas específicas
```

**Ejemplo Shared:**
```typescript
// packages/shared/types/index.ts
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'advisor';
  is_approved: boolean;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  status: ContactStatus;
  tags: string[];
}

export type ContactStatus = 
  | 'Prospecto' 
  | 'Cliente' 
  | 'Inactivo' 
  | 'En Negociación';

// packages/shared/constants/index.ts
export const CONTACT_STATUSES: ContactStatus[] = [
  'Prospecto',
  'Cliente', 
  'Inactivo',
  'En Negociación'
];

export const MAX_TAGS_PER_CONTACT = 10;
export const MAX_FILE_SIZE_MB = 5;

// packages/shared/utils/index.ts
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(value);
};

// ✅ Puras, sin side effects
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

## Gestión de Dependencias

### Regla de Oro

**REGLA:** Instalar dependencias en el workspace específico que las usa:

```bash
# ❌ MAL: Instalar React en root
npm install react

# ✅ BIEN: Instalar React solo en web
npm install react --workspace=@cactus/web

# ✅ BIEN: Instalar Express solo en api
npm install express --workspace=@cactus/api

# ✅ BIEN: TypeScript en root (usado por todos)
npm install -D typescript
```

### Dependencias por Workspace

**`apps/web/package.json`:**
```json
{
  "name": "@cactus/web",
  "dependencies": {
    "@cactus/shared": "workspace:*",
    "@cactus/database": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.3.0",
    "zustand": "^5.0.8",
    "lucide-react": "^0.511.0"
  },
  "devDependencies": {
    "vite": "^6.3.5",
    "@vitejs/plugin-react": "^4.4.1"
  }
}
```

**`apps/api/package.json`:**
```json
{
  "name": "@cactus/api",
  "dependencies": {
    "@cactus/shared": "workspace:*",
    "@cactus/database": "workspace:*",
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "@notionhq/client": "^4.0.2",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "nodemon": "^3.1.10",
    "tsx": "^4.20.3"
  }
}
```

**`packages/shared/package.json`:**
```json
{
  "name": "@cactus/shared",
  "dependencies": {
    "zod": "^4.1.8"  // Solo para validación
  },
  "peerDependencies": {
    "typescript": "^5.8.3"
  }
}
```

**`packages/database/package.json`:**
```json
{
  "name": "@cactus/database",
  "dependencies": {
    "@supabase/supabase-js": "^2.57.4"
  }
}
```

## TypeScript Configs

### Root `tsconfig.json` (Base)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "strict": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### `apps/web/tsconfig.json` (Extiende base)

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### `apps/api/tsconfig.json` (Extiende base)

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "./dist",
    "rootDir": "./",
    "types": ["node", "express"]
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## Build y Development

### Comandos de Workspace

```bash
# Desarrollo
npm run dev              # Inicia ambos (web + api)
npm run dev:web         # Solo frontend
npm run dev:api         # Solo backend

# Build
npm run build           # Build de todo
npm run build:web       # Solo frontend
npm run build:api       # Solo backend

# Testing
npm test                # Tests de todo
npm test -w @cactus/web # Solo frontend tests

# Linting
npm run lint            # Lint todo
npm run lint:fix        # Fix automático

# Limpieza
npm run clean           # Limpia node_modules y dist
```

## Migración Gradual

### Fase 1: Preparación (Actual)
```
✅ Organizar scripts/ en subcarpetas
✅ Consolidar docs/
✅ Definir reglas del proyecto
```

### Fase 2: Crear Estructura (Próximo)
```
1. Crear carpetas apps/, packages/
2. Crear package.json en cada workspace
3. Configurar workspace manager (npm/pnpm)
```

### Fase 3: Mover Código
```
1. Mover src/ → apps/web/src/
2. Mover api/ → apps/api/
3. Extraer tipos comunes → packages/shared/types/
4. Extraer Supabase client → packages/database/
```

### Fase 4: Actualizar Imports
```
1. Buscar y reemplazar imports
2. Actualizar path aliases
3. Verificar que todo compila
```

### Fase 5: Testing y Deploy
```
1. Verificar que todo funciona
2. Actualizar CI/CD
3. Actualizar vercel.json
4. Deploy a preview
```

## Reglas de Comunicación Frontend ↔ Backend

### Frontend llama Backend vía HTTP

```typescript
// apps/web/src/services/notionService.ts
export const notionService = {
  async initiateOAuth() {
    // Frontend solo inicia, backend maneja el flow
    const response = await fetch('/api/notion/oauth/initiate');
    return response.json();
  }
};
```

### Backend responde con datos tipados

```typescript
// apps/api/routes/notion.ts
import { NotionWorkspace } from '@cactus/shared/types';

router.get('/workspaces', async (req, res) => {
  const workspaces: NotionWorkspace[] = await getWorkspaces();
  res.json(workspaces);
});
```

### Shared Types garantizan contrato

```typescript
// packages/shared/types/notion.ts
export interface NotionWorkspace {
  id: string;
  name: string;
  icon: string | null;
  owner: {
    type: 'user';
    user: {
      id: string;
      name: string;
    };
  };
}
```

---

**REGLA CRÍTICA:** Frontend y Backend son apps INDEPENDIENTES que se comunican vía HTTP/WebSocket. NO deben importarse directamente entre sí. Todo lo compartido va en `packages/`.

**Última actualización:** Octubre 2025

