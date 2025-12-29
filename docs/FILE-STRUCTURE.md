# Estructura de Archivos

Guia de estructura estandar para diferentes tipos de codigo en el proyecto MAATWORK.

---

## Estructura General del Monorepo

```
maatwork/
├── apps/
│   ├── api/                    # Backend Express + TypeScript
│   ├── web/                    # Frontend Next.js
│   └── analytics-service/      # Microservicio Python
├── packages/
│   ├── db/                     # Drizzle ORM + PostgreSQL
│   ├── ui/                     # Design System React
│   └── types/                  # Tipos compartidos
├── tests/
│   └── e2e/                    # Tests E2E Playwright
├── docs/                       # Documentacion
├── infrastructure/             # AWS CDK
└── scripts/                    # Scripts de utilidad
```

---

## Backend API (`apps/api/src/`)

### Estructura General

```
apps/api/src/
├── routes/                     # Rutas API organizadas por dominio
│   ├── [domain]/               # Modulos grandes (subdirectorios)
│   │   ├── index.ts            # Barrel export, registra router
│   │   ├── handlers/           # Handlers separados por accion
│   │   │   ├── crud.ts         # CRUD basico
│   │   │   ├── list.ts         # Listado con paginacion
│   │   │   └── [feature].ts    # Features especificas
│   │   ├── schemas.ts          # Schemas Zod (opcional)
│   │   └── types.ts            # Tipos (opcional)
│   └── [domain].ts             # Rutas pequenas (archivo unico)
├── services/                   # Logica de negocio reutilizable
├── utils/                      # Utilidades compartidas
├── config/                     # Configuracion centralizada
├── types/                      # Tipos TypeScript
├── auth/                       # Autenticacion y autorizacion
├── middleware/                 # Middlewares Express
└── index.ts                    # Entry point
```

### Ejemplo: Dominio `contacts`

```
routes/contacts/
├── index.ts                    # Router principal, barrel export
├── handlers/
│   ├── create.ts               # POST /contacts
│   ├── get.ts                  # GET /contacts/:id
│   ├── list.ts                 # GET /contacts
│   ├── update.ts               # PATCH /contacts/:id
│   ├── delete.ts               # DELETE /contacts/:id
│   └── batch.ts                # POST /contacts/batch
├── schemas.ts                  # createContactSchema, updateContactSchema
└── types.ts                    # ContactFilters, ContactListOptions
```

### Estructura de Archivo Route Handler

```typescript
// routes/[domain]/handlers/[action].ts

/**
 * [Domain] [Action] Route
 *
 * [METHOD] /[endpoint] - [Description]
 */
import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { createRouteHandler } from '../../utils/route-handler';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

// ==========================================================
// Routes
// ==========================================================

/**
 * POST /[endpoint] - [Description]
 */
router.post('/',
  requireAuth,
  validate({ body: createSchema }),
  createRouteHandler(async (req) => {
    const result = await doAction(req.body);
    return result;
  })
);

export default router;
```

---

## Frontend Web (`apps/web/`)

### Estructura General

```
apps/web/
├── app/                        # Next.js App Router
│   ├── [route]/                # Paginas
│   │   ├── page.tsx            # Server Component
│   │   ├── loading.tsx         # Loading state
│   │   ├── error.tsx           # Error boundary
│   │   └── components/         # Componentes de la ruta
│   ├── components/             # Componentes globales
│   ├── auth/                   # Auth context y providers
│   └── layout.tsx              # Layout raiz
├── lib/                        # Utilidades y clientes
│   ├── api/                    # Clientes API por dominio
│   ├── hooks/                  # Hooks compartidos
│   └── utils/                  # Utilidades
├── types/                      # Tipos TypeScript
└── styles/                     # Estilos globales
```

### Ejemplo: Ruta `contacts`

```
app/contacts/
├── page.tsx                    # Listado de contactos (Server)
├── loading.tsx                 # Skeleton de carga
├── [id]/
│   ├── page.tsx                # Detalle de contacto (Server)
│   ├── edit/
│   │   └── page.tsx            # Editar contacto
│   └── components/
│       ├── ContactHeader.tsx   # Header con acciones
│       ├── ContactInfo.tsx     # Informacion del contacto
│       └── ContactTabs.tsx     # Tabs (notas, tareas, etc.)
├── new/
│   └── page.tsx                # Crear contacto
├── components/
│   ├── ContactList.tsx         # Lista de contactos (Client)
│   ├── ContactCard.tsx         # Card de contacto
│   ├── ContactFilters.tsx      # Filtros
│   └── ContactToolbar.tsx      # Toolbar con acciones
└── hooks/
    ├── useContacts.ts          # Hook de datos
    └── useContactFilters.ts    # Hook de filtros
```

### Estructura de Pagina

```typescript
// app/[route]/page.tsx (Server Component)
import { apiServer } from '@/lib/api-server';
import { ContactList } from './components/ContactList';

export default async function ContactsPage() {
  // Fetch en servidor
  const contacts = await apiServer.get('/v1/contacts');

  return (
    <div>
      <h1>Contacts</h1>
      <ContactList initialData={contacts} /> {/* Client Island */}
    </div>
  );
}
```

```typescript
// app/[route]/components/ContactList.tsx (Client Component)
"use client";

import { useContacts } from '../hooks/useContacts';

export function ContactList({ initialData }) {
  const { data, isLoading } = useContacts({ fallbackData: initialData });

  // Renderizado interactivo
  return (/* ... */);
}
```

---

## API Client (`apps/web/lib/api/`)

### Estructura

```
lib/api/
├── client.ts                   # Cliente HTTP base (ApiClient)
├── auth-manager.ts             # Manejo de refresh token
├── retry-handler.ts            # Logica de retry
├── request-builder.ts          # Construccion de requests
├── types.ts                    # Tipos compartidos
├── index.ts                    # Barrel export
├── [domain].ts                 # Funciones por dominio
└── [domain].test.ts            # Tests por dominio
```

### Estructura de Archivo Domain

```typescript
// lib/api/[domain].ts

/**
 * API methods para [domain]
 */
import { apiClient } from '../api-client';
import type { ApiResponse } from '../api-client';

// ==========================================================
// Types
// ==========================================================

export interface CreateRequest {
  name: string;
  email: string;
}

export interface UpdateRequest {
  name?: string;
  email?: string;
}

// ==========================================================
// API Functions
// ==========================================================

/**
 * Listar [items]
 */
export async function getItems(params?: ListParams): Promise<ApiResponse<Item[]>> {
  const queryParams = new URLSearchParams();
  // ... build params
  return apiClient.get<Item[]>(`/v1/items?${queryParams}`);
}

/**
 * Obtener [item] por ID
 */
export async function getItemById(id: string): Promise<ApiResponse<Item>> {
  return apiClient.get<Item>(`/v1/items/${id}`);
}

/**
 * Crear [item]
 */
export async function createItem(data: CreateRequest): Promise<ApiResponse<Item>> {
  return apiClient.post<Item>('/v1/items', data);
}

/**
 * Actualizar [item]
 */
export async function updateItem(
  id: string,
  data: UpdateRequest
): Promise<ApiResponse<Item>> {
  return apiClient.patch<Item>(`/v1/items/${id}`, data);
}

/**
 * Eliminar [item]
 */
export async function deleteItem(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete<void>(`/v1/items/${id}`);
}
```

---

## UI Components (`packages/ui/src/`)

### Estructura

```
packages/ui/src/
├── components/                 # Componentes por categoria
│   ├── forms/                  # Input, Select, Checkbox, Switch
│   ├── feedback/               # Alert, Modal, Toast, Card
│   ├── nav/                    # Header, Sidebar, Pagination
│   └── data-display/           # Table, List, Badge
├── primitives/                 # Building blocks
│   ├── Box/
│   ├── Text/
│   ├── Stack/
│   └── Grid/
├── hooks/                      # Hooks compartidos
├── styles/                     # CSS global
├── tokens/                     # Design tokens
├── utils/                      # Utilidades (cn, etc.)
└── index.ts                    # Barrel export
```

### Estructura de Componente

```
components/forms/Button/
├── Button.tsx                  # Componente principal
├── Button.test.tsx             # Tests
├── Button.stories.tsx          # Storybook (opcional)
└── index.ts                    # Export
```

```typescript
// components/forms/Button/Button.tsx
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center',
          // variant styles
          // size styles
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
```

---

## Database (`packages/db/src/`)

### Estructura

```
packages/db/src/
├── schema/                     # Schemas por dominio
│   ├── index.ts                # Barrel export
│   ├── users.ts                # users, teams, memberships
│   ├── contacts.ts             # contacts, tags, segments
│   ├── aum.ts                  # aumImportFiles, aumImportRows
│   ├── portfolios.ts           # templates, lines, assignments
│   └── ...
├── migrations/                 # Migraciones SQL
│   ├── 0001_initial.sql
│   └── ...
├── seeds/                      # Seeds de datos
│   ├── index.ts                # Orquestador de seeds
│   ├── users.ts                # Seed de usuarios
│   └── ...
├── index.ts                    # Export principal (db, schemas)
└── migrate.ts                  # Script de migracion
```

### Estructura de Schema

```typescript
// schema/[domain].ts
import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================================
// Tables
// ==========================================================

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================================
// Relations
// ==========================================================

export const contactsRelations = relations(contacts, ({ many }) => ({
  tasks: many(tasks),
  notes: many(notes),
}));

// ==========================================================
// Types (inferidos)
// ==========================================================

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
```

---

## Tests

### Ubicacion de Tests

| Tipo | Ubicacion | Convencion |
|------|-----------|------------|
| Unit tests | Co-ubicados | `[file].test.ts` |
| Integration tests | `__tests__/` o co-ubicados | `[file].integration.test.ts` |
| E2E tests | `tests/e2e/` | `[feature].spec.ts` |
| Visual tests | `tests/visual/` | `[page].spec.ts` |

### Ejemplo

```
apps/api/src/
├── utils/
│   ├── validation.ts
│   └── validation.test.ts      # Unit test co-ubicado
├── routes/
│   └── contacts/
│       ├── handlers/
│       │   └── create.ts
│       └── __tests__/
│           └── create.integration.test.ts

tests/e2e/
├── contacts.spec.ts            # E2E de contactos
└── auth.spec.ts                # E2E de auth
```

---

## Utils y Helpers

### Backend (`apps/api/src/utils/`)

```
utils/
├── error-response.ts           # Respuestas de error
├── route-handler.ts            # Wrapper de handlers
├── validation.ts               # Middleware Zod
├── common-schemas.ts           # Schemas reutilizables
├── pagination.ts               # Helpers de paginacion
├── logger.ts                   # Configuracion Pino
├── cache.ts                    # Cache helpers
└── [feature].ts                # Utilidades especificas
```

### Frontend (`apps/web/lib/`)

```
lib/
├── api/                        # Clientes API
├── api-client.ts               # Re-export cliente
├── api-server.ts               # Cliente para Server Components
├── api-hooks.ts                # Hooks SWR
├── api-error.ts                # Clase ApiError
├── utils/                      # Utilidades generales
└── hooks/                      # Hooks compartidos
```

---

## Nomenclatura de Archivos

| Tipo | Convencion | Ejemplo |
|------|------------|---------|
| Componentes React | `PascalCase.tsx` | `ContactCard.tsx` |
| Hooks | `use[Feature].ts` | `useContacts.ts` |
| Utils | `kebab-case.ts` | `error-response.ts` |
| Tests | `[file].test.ts` | `validation.test.ts` |
| Schemas DB | `[domain].ts` | `contacts.ts` |
| API clients | `[domain].ts` | `contacts.ts` |
| Types | `[domain].ts` | `contact.ts` |

---

## Referencias

- [00-core.mdc](../.cursor/rules/00-core.mdc) - Reglas base
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura
- [CODE-IMPROVEMENTS.md](./CODE-IMPROVEMENTS.md) - Mejoras de codigo
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Guia de desarrollo
