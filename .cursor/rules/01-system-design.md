# 🏗️ Reglas de Diseño del Sistema - Cactus Dashboard

## Arquitectura General

### Stack Tecnológico Oficial
```
Frontend:  React 18 + TypeScript + Vite + Tailwind CSS
Backend:   Node.js + Express + TypeScript
Database:  Supabase (PostgreSQL)
Auth:      Supabase Auth + JWT
State:     Zustand
Routing:   React Router v7
```

**REGLA:** NO introducir nuevas tecnologías sin documentar la razón y actualizar esta regla.

## Estructura de Carpetas

### Frontend (`src/`)
```
src/
├── components/      # Componentes React reutilizables
├── pages/          # Páginas/rutas principales
├── store/          # Zustand stores (state management)
├── types/          # TypeScript types e interfaces
├── services/       # Servicios de API y lógica de negocio
├── utils/          # Funciones utilitarias
├── styles/         # Estilos globales y configuración
├── hooks/          # Custom React hooks
└── lib/            # Configuraciones de librerías
```

**REGLA:** Toda nueva funcionalidad debe seguir esta estructura. No crear carpetas adicionales sin justificación.

### Backend (`api/`)
```
api/
├── routes/         # Definición de rutas Express
├── services/       # Lógica de negocio
├── middleware/     # Middlewares (auth, validation, etc.)
├── config/         # Configuraciones
└── types/          # TypeScript types para backend
```

**REGLA:** Backend solo contiene lógica que NO puede estar en el cliente (OAuth, service-to-service, API proxies).

### Otros Directorios Importantes
```
supabase/migrations/   # Migraciones SQL (101 archivos, NO modificar existentes)
scripts/              # Scripts de utilidad organizados en subcarpetas
docs/                 # Documentación consolidada
tests/                # Tests E2E e integración
```

## Principios de Diseño

### 1. Backend Minimalista
**REGLA:** El backend debe ser lo más ligero posible. La mayoría de la lógica está en:
- Frontend (UI logic, validaciones, formateo)
- Supabase (queries, RLS, triggers, functions)

**Backend solo para:**
- OAuth flows (Notion)
- Proxy de APIs externas
- Operaciones que requieren service keys
- Lógica que no puede exponerse al cliente

### 2. Seguridad en Capas
**REGLA:** Toda tabla de Supabase DEBE tener:
1. Row Level Security (RLS) habilitado
2. Políticas que validen `auth.uid()`
3. Políticas separadas para SELECT, INSERT, UPDATE, DELETE

**Ejemplo:**
```sql
-- ✅ CORRECTO
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own contacts"
  ON contacts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ❌ INCORRECTO
CREATE POLICY "Allow all"
  ON contacts FOR ALL
  USING (true);  -- ¡NUNCA HACER ESTO!
```

### 3. Separación de Responsabilidades

**REGLA:** Seguir este patrón:

```typescript
// ❌ MAL: Todo en el componente
const ContactPage = () => {
  const [contacts, setContacts] = useState([]);
  
  useEffect(() => {
    supabase.from('contacts').select('*').then(setContacts);
  }, []);
  
  return <div>...</div>
};

// ✅ BIEN: Separado en capas
// store/crmStore.ts
export const useCRMStore = create((set) => ({
  contacts: [],
  loadContacts: async () => {
    const data = await crmService.getContacts();
    set({ contacts: data });
  }
}));

// services/crmService.ts
export const crmService = {
  getContacts: async () => {
    const { data } = await supabase.from('contacts').select('*');
    return data;
  }
};

// components/ContactPage.tsx
const ContactPage = () => {
  const { contacts, loadContacts } = useCRMStore();
  useEffect(() => { loadContacts(); }, []);
  return <div>...</div>
};
```

**Estructura:**
1. **Componente** → UI y interacción
2. **Store** → Estado y orquestación
3. **Service** → Llamadas a API/DB
4. **Utils** → Funciones puras reutilizables

### 4. TypeScript Estricto

**REGLA:** NO usar `any`. Si es necesario, usar `unknown` y hacer type guards.

```typescript
// ❌ MAL
const data: any = await fetch(...);

// ✅ BIEN
interface Contact {
  id: string;
  name: string;
  email: string;
}

const data: Contact = await fetch(...);

// ✅ MEJOR: Con validación
const data: unknown = await fetch(...);
if (isContact(data)) {
  // ahora TypeScript sabe que data es Contact
}
```

### 5. Estado Global vs Local

**REGLA:** 
- **Estado Local** (useState): UI temporal (modals, forms, loading)
- **Estado Global** (Zustand): Datos compartidos entre componentes

```typescript
// ❌ MAL: Estado global para un modal
const useUIStore = create((set) => ({
  isModalOpen: false  // ❌ Esto es local al componente
}));

// ✅ BIEN: Estado local
const ContactForm = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // ...
};

// ✅ BIEN: Estado global
const useCRMStore = create((set) => ({
  contacts: [],  // ✅ Compartido entre componentes
  tags: []       // ✅ Compartido entre componentes
}));
```

## Patrones de Código

### Naming Conventions

```typescript
// Componentes: PascalCase
ContactCard.tsx
UserProfile.tsx

// Funciones: camelCase
getUserById()
formatDate()

// Constantes: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = '...';

// Interfaces/Types: PascalCase
interface User {}
type ContactStatus = '...';

// Stores: use + Name + Store
const useAuthStore = create(...);
const useCRMStore = create(...);

// Services: name + Service
crmService.ts
notionService.ts

// Hooks personalizados: use + Name
const usePermissions = () => {};
const useMetrics = () => {};
```

### Imports

**REGLA:** Orden de imports:

```typescript
// 1. React y librerías externas
import React, { useState } from 'react';
import { toast } from 'sonner';

// 2. Componentes
import ContactCard from '@/components/ContactCard';

// 3. Stores
import { useAuthStore } from '@/store/authStore';

// 4. Services
import { crmService } from '@/services/crmService';

// 5. Types
import { Contact } from '@/types/crm';

// 6. Utils
import { formatDate } from '@/utils/dateUtils';

// 7. Estilos (si aplica)
import './styles.css';
```

### Manejo de Errores

**REGLA:** SIEMPRE manejar errores de APIs/DB:

```typescript
// ❌ MAL
const createContact = async (data) => {
  const contact = await supabase.from('contacts').insert(data);
  return contact;
};

// ✅ BIEN
const createContact = async (data: CreateContactInput) => {
  try {
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success('Contacto creado');
    return contact;
  } catch (error) {
    console.error('Error creating contact:', error);
    toast.error('Error al crear contacto');
    throw error;
  }
};
```

## Sistema de Colores

**REGLA:** Usar SOLO colores del sistema Cactus definido en `docs/DESIGN_SYSTEM.md`

```tsx
// ❌ MAL
<button className="bg-red-500">Delete</button>

// ✅ BIEN
<button className="bg-error-500">Delete</button>

// ❌ MAL
<span className="text-green-600">Success</span>

// ✅ BIEN
<span className="text-success-600">Success</span>
```

**Colores permitidos:**
- `cactus-*` → Colores principales
- `success-*` → Verde (estados exitosos)
- `warning-*` → Amarillo (advertencias)
- `error-*` → Rojo/Terracota (errores)
- `info-*` → Azul (información)
- `neutral-*` → Grises (neutros)

## Performance

### Optimizaciones Obligatorias

1. **Lazy Loading de Páginas**
```typescript
// ✅ SIEMPRE para páginas
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CRMPage = lazy(() => import('./pages/CRMPage'));
```

2. **Memoization**
```typescript
// ✅ Para cálculos pesados
const metrics = useMemo(() => calculateMetrics(data), [data]);

// ✅ Para callbacks en listas
const handleClick = useCallback(() => { ... }, [deps]);

// ✅ Para componentes en listas
export default React.memo(ContactCard);
```

3. **Virtual Scrolling**
```typescript
// ✅ Para listas >50 items
import { FixedSizeList } from 'react-window';
```

## Accesibilidad

**REGLA:** Todos los elementos interactivos deben:
1. Tener estados de hover y focus visibles
2. Ser navegables por teclado
3. Tener labels/aria-labels apropiados

```tsx
// ✅ BIEN
<button 
  className="... focus:ring-2 focus:ring-cactus-500"
  aria-label="Eliminar contacto"
>
  <Trash2 className="h-4 w-4" />
</button>
```

## Real-time Updates

**REGLA:** Para datos que cambian frecuentemente, usar subscripciones de Supabase:

```typescript
// ✅ BIEN
useEffect(() => {
  const subscription = supabase
    .channel('contacts-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'contacts' },
      (payload) => {
        // Actualizar store
        updateContacts(payload.new);
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

---

**Estas reglas son OBLIGATORIAS. Cualquier desviación debe ser justificada y documentada.**

**Última actualización:** Octubre 2025

