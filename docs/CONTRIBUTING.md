# Guía de Contribución

Gracias por tu interés en contribuir a MAATWORK. Esta guía te ayudará a entender el proceso de contribución.

## Tabla de Contenidos

1. [Código de Conducta](#código-de-conducta)
2. [Cómo Contribuir](#cómo-contribuir)
3. [Setup de Desarrollo](#setup-de-desarrollo)
4. [Estándares de Código](#estándares-de-código)
5. [Proceso de Pull Request](#proceso-de-pull-request)
6. [Conventional Commits](#conventional-commits)
7. [Testing](#testing)
8. [Documentación](#documentación)

---

## Código de Conducta

- Sé respetuoso y profesional
- Acepta críticas constructivas
- Enfócate en lo mejor para el proyecto
- Muestra empatía hacia otros contribuidores

---

## Cómo Contribuir

### Reportar Bugs

1. Verifica que el bug no haya sido reportado antes
2. Crea un issue con:
   - Descripción clara del problema
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots si aplica
   - Entorno (OS, Node.js, navegador)

### Sugerir Features

1. Crea un issue describiendo:
   - El problema que resuelve
   - La solución propuesta
   - Alternativas consideradas

### Enviar Código

1. Fork el repositorio
2. Crea una rama desde `develop`
3. Implementa los cambios
4. Agrega tests
5. Asegura que pasa todas las verificaciones
6. Crea un Pull Request

---

## Setup de Desarrollo

### Requisitos

- Node.js >=22.0.0 <25.0.0
- pnpm >=9.0.0
- Docker Desktop
- Git

### Instalación

```bash
# Clonar repositorio
git clone <repository-url>
cd maatwork

# Instalar dependencias
pnpm install

# Setup automático
pnpm setup

# Iniciar desarrollo
pnpm dev
```

### Verificar Setup

```bash
pnpm mw health --full
```

---

## Estándares de Código

### TypeScript

- **Strict mode** habilitado
- **No `any`** sin justificación documentada
- **exactOptionalPropertyTypes** activado

```typescript
// ❌ MAL
const data: any = fetchData();

// ✅ BIEN
interface UserData { name: string; email: string; }
const data: UserData = fetchData();
```

### Nombrado

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Variables/funciones | camelCase | `handleSubmit`, `userId` |
| Componentes/tipos | PascalCase | `UserCard`, `CreateUserRequest` |
| Constantes | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Archivos componentes | PascalCase.tsx | `UserCard.tsx` |
| Archivos utils | kebab-case.ts | `api-client.ts` |

### Evitar Shadowing

```typescript
import { createUser } from '@/lib/api';

// ❌ MAL - shadowing
const createUser = async () => { ... };

// ✅ BIEN - prefijo handle
const handleCreateUser = async () => {
  await createUser({ ... });
};
```

### Imports

```typescript
// 1. Externos (React, librerías)
import { useState } from 'react';
import { z } from 'zod';

// 2. Internos absolutos
import { Button } from '@maatwork/ui';
import { db } from '@maatwork/db';

// 3. Relativos
import { UserCard } from './UserCard';
import type { User } from '../types';
```

### Documentación de Código

```typescript
/**
 * Calcula el total de AUM para un cliente
 *
 * @param clientId - ID del cliente
 * @param options - Opciones de cálculo
 * @returns Total AUM en la moneda base
 *
 * @example
 * const total = await calculateClientAUM('uuid', { includePending: true });
 */
export async function calculateClientAUM(
  clientId: string,
  options?: CalculateOptions
): Promise<number> {
  // ...
}
```

---

## Proceso de Pull Request

### 1. Crear Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feat/nueva-funcionalidad
```

### 2. Desarrollar

- Escribe código siguiendo los estándares
- Agrega tests para nuevo código
- Actualiza documentación si es necesario

### 3. Verificar

```bash
# Verificación completa
pnpm mw health --full

# Auditoría de código
pnpm mw audit code

# Tests específicos
pnpm mw test unit
```

### 4. Commit

```bash
# Crear changeset
pnpm mw release changelog --add

# Commit con conventional commits
git add .
git commit -m "feat(api): add user profile endpoint"
```

### 5. Push y PR

```bash
git push origin feat/nueva-funcionalidad
```

Luego crea un PR en GitHub hacia `develop`.

### Checklist del PR

- [ ] Branch creada desde `develop`
- [ ] Código sigue estándares del proyecto
- [ ] Tests agregados/actualizados
- [ ] Documentación actualizada si aplica
- [ ] `pnpm mw health --full` pasa
- [ ] Changeset creado si hay cambios visibles
- [ ] PR tiene descripción clara

---

## Conventional Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/) para mensajes de commit estructurados.

### Formato

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Tipos

| Tipo | Descripción |
|------|-------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Cambios en documentación |
| `style` | Formateo, sin cambio de lógica |
| `refactor` | Refactorización |
| `perf` | Mejoras de rendimiento |
| `test` | Agregar o corregir tests |
| `build` | Cambios en build o deps |
| `ci` | Cambios en CI/CD |
| `chore` | Tareas de mantenimiento |
| `revert` | Revertir commit anterior |

### Scopes Comunes

- `api`, `web`, `analytics` (apps)
- `ui`, `db`, `types` (packages)
- `deps`, `config`, `scripts`

### Ejemplos

```bash
feat(api): add user profile endpoint
fix(web): resolve login redirect loop
docs: update CLI reference
chore(deps): update dependencies
refactor(ui): extract Button variants
test(api): add tests for auth middleware
```

---

## Testing

### Tipos de Tests

1. **Unit Tests** - Vitest
2. **Integration Tests** - Vitest + Supertest
3. **E2E Tests** - Playwright

### Ejecutar Tests

```bash
# Tests unitarios
pnpm mw test unit

# Tests con cobertura
pnpm mw test coverage

# Tests E2E
pnpm mw test e2e

# Tests afectados (solo cambios)
pnpm mw test affected
```

### Escribir Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  const mockUser = { id: '1', name: 'Test User' };

  it('renders user name', () => {
    render(<UserCard user={mockUser} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('handles click event', async () => {
    const onClick = vi.fn();
    render(<UserCard user={mockUser} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(mockUser);
  });
});
```

### Cobertura Mínima

- Líneas: 70%
- Funciones: 70%
- Branches: 60%

---

## Documentación

### Actualizar Docs

Cuando tus cambios afecten:

- **API endpoints** → Actualiza `docs/api/` o JSDoc
- **Componentes UI** → Actualiza `packages/ui/README.md`
- **Comandos CLI** → Actualiza `docs/CLI.md`
- **Configuración** → Actualiza `docs/DEVELOPMENT.md`

### Estilo de Documentación

- Usa ejemplos de código
- Mantén secciones cortas
- Incluye casos de uso comunes
- Documenta errores conocidos

---

## Preguntas Frecuentes

### ¿Cómo agrego una nueva dependencia?

```bash
# Dependencia del root
pnpm add -D <package>

# Dependencia de un workspace
pnpm -F @maatwork/api add <package>
```

### ¿Cómo genero código nuevo?

```bash
# Nuevo componente
pnpm mw gen component MyComponent

# Nueva ruta API
pnpm mw gen route users/profile

# Nuevo hook
pnpm mw gen hook useMyHook
```

### ¿Cómo corro solo mi código?

```bash
# Solo tests de un paquete
pnpm mw test unit --filter=api

# Solo desarrollo de un app
pnpm mw dev --only=api
```

---

## Recursos

- [Documentación del Proyecto](./README.md)
- [Guía de Desarrollo](./DEVELOPMENT.md)
- [CLI Reference](./CLI.md)
- [Arquitectura](./ARCHITECTURE.md)

---

¡Gracias por contribuir!

