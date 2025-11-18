# Memoria: Preferencias de Código y Estilo

## Propósito
Convenciones de código y estilo específicas del proyecto CACTUS CRM para mantener consistencia y legibilidad.

## Contexto
Usar esta memoria cuando:
- Escribir nuevo código
- Revisar código existente
- Decidir sobre estilo de funciones, comentarios, imports
- Necesitar guía de formato y convenciones

## Convenciones de Nombrado

### Variables y Funciones
- **camelCase** para variables, funciones y propiedades
- **PascalCase** para componentes React, clases, tipos/interfaces
- **UPPER_SNAKE_CASE** solo para constantes con valores mágicos
- **kebab-case** para nombres de archivos de componentes
- **camelCase** para nombres de archivos de utilidades

**Ejemplos:**
```typescript
// Variables y funciones
const userName = 'John';
const handleCreatePortfolio = async () => { ... };

// Componentes y tipos
export function PortfolioCard() { ... }
export interface PortfolioData { ... }

// Constantes mágicas
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 5000;

// Archivos
PortfolioCard.tsx  // Componente
portfolioUtils.ts  // Utilidad
```

### Prefijos para Funciones Locales
Cuando una función local tiene el mismo nombre que una importada, usar prefijos:
- `handle*` para handlers de eventos (ej: `handleCreatePortfolio`)
- `do*` para acciones (ej: `doDeleteContact`)
- `perform*` para operaciones complejas (ej: `performSearch`)

**Ejemplo:**
```typescript
import { createPortfolio } from '@/lib/api';

// ✅ BIEN
const handleCreatePortfolio = async () => {
  await createPortfolio({ ... });
};

// ❌ MAL - Shadowing
const createPortfolio = async () => { ... };
```

## Estilo de Funciones

### Async/Await vs Promises
**Preferir async/await** para legibilidad:

```typescript
// ✅ PREFERIR - async/await
async function fetchData() {
  const response = await apiClient.get('/endpoint');
  return response.data;
}

// ⚠️ Evitar - Promises chains (solo si mejora legibilidad)
function fetchData() {
  return apiClient.get('/endpoint')
    .then(response => response.data)
    .catch(error => {
      logger.error({ error }, 'Failed to fetch');
      throw error;
    });
}
```

### Funciones Nombradas vs Arrow Functions
- **Funciones nombradas** para exports y funciones públicas
- **Arrow functions** para callbacks y funciones inline

```typescript
// ✅ Export con función nombrada
export async function createContact(data: CreateContactRequest) {
  // ...
}

// ✅ Arrow function para callback
const items = data.map(item => ({ ... }));

// ✅ Arrow function para handler inline
<Button onClick={() => router.push('/path')} />
```

### Early Returns
**Preferir early returns** para reducir nesting:

```typescript
// ✅ BIEN - Early returns
function processData(data: Data | null) {
  if (!data) return null;
  if (data.invalid) return null;
  
  // Lógica principal
  return transform(data);
}

// ❌ MAL - Nesting profundo
function processData(data: Data | null) {
  if (data) {
    if (!data.invalid) {
      return transform(data);
    }
  }
  return null;
}
```

## Estilo de Comentarios

### Principio General
**Documentar "por qué" más que "cómo"** - El código debe ser auto-explicativo.

### JSDoc para Funciones Públicas
```typescript
/**
 * Crea un nuevo contacto en el sistema
 * 
 * @param data - Datos del contacto a crear
 * @returns Contacto creado con ID asignado
 * @throws {ApiError} Si el email ya existe
 */
export async function createContact(data: CreateContactRequest): Promise<Contact> {
  // ...
}
```

### Comentarios Inline para Decisiones No Obvias
```typescript
// AI_DECISION: Usar batch insert en lugar de loop
// Justificación: Reduce de N queries a 1 query
// Impacto: Mejora performance del seed
await db.insert(table).values(items);
```

### Evitar Comentarios Obvios
```typescript
// ❌ MAL - Obvio
const name = user.name; // Asignar nombre del usuario

// ✅ BIEN - Sin comentario innecesario
const name = user.name;
```

## Patrones de Importación

### Orden de Imports
1. Imports de librerías externas
2. Imports de paquetes internos (`@cactus/*`)
3. Imports relativos del proyecto
4. Imports de tipos (con `type`)

```typescript
// 1. Librerías externas
import { useState } from 'react';
import { z } from 'zod';

// 2. Paquetes internos
import { db } from '@cactus/db';
import { Button } from '@cactus/ui';

// 3. Imports relativos
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// 4. Tipos (con type)
import type { Contact } from '@/types/contact';
import type { ComponentProps } from 'react';
```

### Imports Específicos
**Preferir imports específicos** sobre namespace imports:

```typescript
// ✅ BIEN - Import específico
import { Button, Text } from '@cactus/ui';

// ⚠️ Evitar - Namespace import (solo si necesario)
import * as UI from '@cactus/ui';
```

## Preferencias de Formato

### Quotes
- **Comillas simples** (`'`) para strings en TypeScript/JavaScript
- **Comillas dobles** (`"`) para JSON y atributos HTML/JSX

```typescript
// TypeScript
const message = 'Hello world';
const json = { "key": "value" }; // JSON

// JSX
<Button title="Click me" />
```

### Trailing Commas
**Siempre usar trailing commas** en objetos y arrays multi-línea:

```typescript
// ✅ BIEN - Trailing comma
const config = {
  timeout: 5000,
  retries: 3,
};

// ✅ BIEN - Trailing comma en arrays
const items = [
  'item1',
  'item2',
];
```

### Semicolons
**Siempre usar semicolons** para evitar problemas de ASI (Automatic Semicolon Insertion):

```typescript
// ✅ BIEN
const name = 'John';
const age = 30;

// ❌ MAL - Sin semicolons puede causar problemas
const name = 'John'
const age = 30
```

## Tamaño de Funciones y Clases

### Regla de Tamaño
- **Funciones**: Máximo ~40-50 líneas
- **Clases**: Máximo ~100 líneas
- Si excede, cuestionar si hace demasiado y refactorizar

### Modularidad
**Una función/clase debe hacer una sola cosa bien:**

```typescript
// ❌ MAL - Función hace demasiado
function processUser(user: User) {
  // Validar
  if (!user.email) throw new Error('...');
  // Transformar
  const transformed = { ... };
  // Guardar
  await db.insert(users).values(transformed);
  // Enviar email
  await sendEmail(user.email);
  // Log
  logger.info('User created');
}

// ✅ BIEN - Separado en funciones específicas
function validateUser(user: User) { ... }
function transformUser(user: User) { ... }
async function saveUser(user: User) { ... }
async function notifyUser(user: User) { ... }
```

## Principios de Código Limpio

### DRY (Don't Repeat Yourself)
**Evitar código duplicado** - Factorizar lógica común:

```typescript
// ❌ MAL - Duplicación
function createContact(data: CreateContactRequest) {
  if (!data.email) throw new Error('Email required');
  // ...
}

function updateContact(data: UpdateContactRequest) {
  if (!data.email) throw new Error('Email required');
  // ...
}

// ✅ BIEN - Factorizado
function validateEmail(email: string | undefined) {
  if (!email) throw new Error('Email required');
}
```

### Legibilidad sobre Clever Hacks
**Código simple y legible** gana sobre soluciones "inteligentes":

```typescript
// ✅ BIEN - Claro y legible
const isAdmin = user.role === 'admin';
if (isAdmin) {
  // ...
}

// ❌ MAL - Clever pero confuso
if (user.role === 'admin' ? true : false) {
  // ...
}
```

## Referencias

- Reglas relacionadas:
  - `.cursor/rules/01-typescript.mdc` (reglas TypeScript)
  - `.cursor/rules/project.mdc` (principios fundamentales)
- Memorias relacionadas:
  - `.cursor/memories/common-workflows.md` (flujos de trabajo)
  - `.cursor/memories/common-errors-solutions.md` (errores comunes)
- Documentación:
  - `docs/DEVELOPMENT.md`

## Última Actualización

2025-01-16 - Memoria inicial con preferencias de código y estilo




