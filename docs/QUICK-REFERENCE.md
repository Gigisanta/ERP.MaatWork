# Quick Reference

Cheatsheet de comandos y patrones más usados en MAATWORK.

---

## Comandos Esenciales

### Desarrollo

```bash
pnpm dev                    # Iniciar todo
pnpm mw dev --fast          # Sin validaciones
pnpm mw dev --only=api      # Solo API
pnpm dev:kill               # Matar procesos
```

### Base de Datos

```bash
pnpm mw db migrate          # Aplicar migraciones
pnpm mw db seed             # Ejecutar seeds
pnpm mw db studio           # Abrir Drizzle Studio
pnpm mw db generate         # Generar migración
```

### Testing

```bash
pnpm test                   # Tests unitarios
pnpm mw test e2e            # Tests E2E
pnpm mw test coverage       # Con cobertura
pnpm mw test watch          # Modo watch
```

### Verificación

```bash
pnpm typecheck              # Verificar tipos
pnpm lint                   # Ejecutar linter
pnpm mw health              # Health check
pnpm mw health --full       # Verificación completa
```

### Build

```bash
pnpm build                  # Build completo
pnpm -F @maatwork/ui build  # Solo UI
pnpm -F @maatwork/db build  # Solo DB
```

### Limpieza

```bash
pnpm mw clean cache         # Limpiar caches
pnpm mw clean all           # Limpieza completa
```

---

## Generadores

```bash
# Componente
pnpm mw gen component Button --package=ui

# Ruta API
pnpm mw gen route users/profile --methods=get,put

# Hook
pnpm mw gen hook useModal --package=web

# API Client
pnpm mw gen api-client portfolios
```

---

## Patrones de Código

### Componente React

```tsx
import { type FC } from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
}) => {
  return (
    <button className={`btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};
```

### Hook Personalizado

```tsx
import { useState, useCallback } from 'react';

export function useToggle(initial = false) {
  const [value, setValue] = useState(initial);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return { value, toggle, setTrue, setFalse };
}
```

### Ruta API

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '@/routes/auth/middlewares';
import { validate } from '@/utils/validation';
import { createRouteHandler } from '@/utils/route-handler';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

router.post('/',
  requireAuth,
  validate({ body: createSchema }),
  createRouteHandler(async (req) => {
    // Handler logic
    return { id: 'uuid', name: req.body.name };
  })
);

export default router;
```

### API Client (Frontend)

```typescript
import { apiClient } from './client';

export async function getUsers() {
  return apiClient.get<User[]>('/v1/users');
}

export async function createUser(data: CreateUserRequest) {
  return apiClient.post<User>('/v1/users', data);
}
```

---

## Estructura de Archivos

### Componente UI

```
packages/ui/src/components/Button/
├── Button.tsx        # Componente
├── Button.test.tsx   # Tests
└── index.ts          # Export
```

### Ruta API

```
apps/api/src/routes/users/
├── index.ts              # Router principal
├── handlers/
│   ├── list.ts           # GET /users
│   ├── create.ts         # POST /users
│   └── [id].ts           # GET/PUT/DELETE /users/:id
└── __tests__/
    └── users.test.ts
```

### Página Web

```
apps/web/app/contacts/
├── page.tsx              # Server Component
├── loading.tsx           # Loading state
├── error.tsx             # Error boundary
└── components/
    └── ContactList.tsx   # Client Island
```

---

## Convenciones de Nombrado

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Variables | camelCase | `userId`, `isActive` |
| Funciones | camelCase | `handleSubmit`, `fetchData` |
| Componentes | PascalCase | `UserCard`, `ContactList` |
| Tipos/Interfaces | PascalCase | `User`, `CreateUserRequest` |
| Constantes | UPPER_SNAKE | `MAX_LIMIT`, `DEFAULT_PAGE` |
| Archivos TSX | PascalCase | `UserCard.tsx` |
| Archivos TS | kebab-case | `api-client.ts` |
| Hooks | use + PascalCase | `useContacts.ts` |

---

## Conventional Commits

```bash
feat(api): add user profile endpoint
fix(web): resolve login redirect
docs: update CLI reference
chore(deps): update dependencies
refactor(ui): extract Button variants
test(api): add auth middleware tests
```

---

## URLs de Desarrollo

| Servicio | URL |
|----------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| Analytics | http://localhost:3002 |
| Drizzle Studio | http://localhost:4983 |
| N8N | http://localhost:5678 |

---

## Variables de Entorno

```bash
# apps/api/.env
DATABASE_URL=postgresql://...
JWT_SECRET=...
NODE_ENV=development
```

---

## Atajos de Teclado (VSCode)

| Atajo | Acción |
|-------|--------|
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+P` | Quick Open |
| `F12` | Go to Definition |
| `Ctrl+Shift+F` | Search in Files |
| `Ctrl+\`` | Toggle Terminal |

---

## Troubleshooting Rápido

### Puerto en uso

```bash
pnpm dev:kill
# o
lsof -ti :3000 | xargs kill -9
```

### Tipos no actualizados

```bash
pnpm -F @maatwork/ui build
pnpm -F @maatwork/db build
pnpm typecheck
```

### Cache corrupto

```bash
pnpm mw clean cache
```

### node_modules roto

```bash
pnpm mw clean deps --force
```

---

## Links Útiles

- [Documentación Completa](./README.md)
- [CLI Reference](./CLI.md)
- [Guía de Contribución](./CONTRIBUTING.md)
- [Arquitectura](./ARCHITECTURE.md)

