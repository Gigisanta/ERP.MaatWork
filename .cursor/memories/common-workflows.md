# Memoria: Flujos de Trabajo Comunes

## Propósito
Guía paso a paso para tareas comunes de desarrollo en el proyecto MAATWORK: crear endpoints, componentes, migraciones y hacer refactors.

## Contexto
Usar esta memoria cuando:
- Agregar nuevo endpoint API
- Crear nuevo componente UI
- Agregar migración de base de datos
- Hacer refactor grande
- Necesitar checklist pre-commit

## Flujo 1: Agregar Nuevo Endpoint API

### Prerrequisitos
- [ ] Entender el dominio del endpoint (contacts, portfolios, etc.)
- [ ] Verificar si existe ruta en `apps/api/src/routes/[domain].ts`
- [ ] Revisar tipos existentes en `apps/web/types/[domain].ts`

### Pasos

1. **Definir Schema Zod de Validación**
   ```typescript
   // En apps/api/src/routes/[domain].ts
   // Zod Validation Schemas
   const createSchema = z.object({
     name: z.string().min(1),
     email: z.string().email().optional(),
   });
   ```

2. **Crear Endpoint con Middleware validate()**
   ```typescript
   router.post(
     '/endpoint',
     requireAuth,
     validate(createSchema),
     async (req, res) => {
       // req.body ya está validado y tipado
       const data = req.body; // Tipo inferido del schema
       // ... lógica del handler
     }
   );
   ```

3. **Definir Tipos Request/Response**
   ```typescript
   // En apps/web/types/[domain].ts
   export interface CreateDomainRequest {
     name: string;
     email?: string;
   }
   
   export interface Domain extends TimestampedEntity {
     name: string;
     email: string | null;
   }
   ```

4. **Crear Cliente API**
   ```typescript
   // En apps/web/lib/api/[domain].ts
   export async function createDomain(
     data: CreateDomainRequest
   ): Promise<Domain> {
     const response = await apiClient.post('/v1/domain', data);
     return response.data;
   }
   ```

5. **Agregar Tests de Validación**
   ```typescript
   // En apps/api/src/routes/[domain].test.ts
   describe('POST /domain', () => {
     it('should return 400 for invalid email', async () => {
       const res = await request(app)
         .post('/v1/domain')
         .send({ name: 'Test', email: 'invalid' });
       expect(res.status).toBe(400);
     });
   });
   ```

### Verificaciones
- [ ] Schema Zod definido bajo `// Zod Validation Schemas`
- [ ] Middleware `validate()` aplicado en la definición del endpoint
- [ ] Tipos Request/Response definidos en `types/[domain].ts`
- [ ] Cliente API creado en `lib/api/[domain].ts`
- [ ] Tests de validación (casos de error 400)
- [ ] Typecheck pasa: `pnpm typecheck`

### Referencias
- Regla: `.cursor/rules/domains/api.mdc`
- Regla: `.cursor/rules/patterns/api-design.mdc`
- Regla: `.cursor/rules/patterns/error-handling.mdc`

---

## Flujo 2: Crear Nuevo Componente UI

### Prerrequisitos
- [ ] Verificar si existe componente similar en `packages/ui/src/components/`
- [ ] Decidir categoría: `forms/`, `feedback/`, `nav/`
- [ ] Revisar design tokens en `packages/ui/src/tokens/`

### Pasos

1. **Crear Componente en Categoría Apropiada**
   ```typescript
   // packages/ui/src/components/[category]/ComponentName.tsx
   import { Box, Text } from '../primitives';
   
   export interface ComponentNameProps {
     title: string;
     onClick?: () => void;
   }
   
   export function ComponentName({ title, onClick }: ComponentNameProps) {
     return (
       <Box>
         <Text>{title}</Text>
       </Box>
     );
   }
   ```

2. **Exportar en index.ts (Export Específico)**
   ```typescript
   // packages/ui/src/components/[category]/index.ts
   export { ComponentName } from './ComponentName';
   export type { ComponentNameProps } from './ComponentName';
   // ❌ NO usar: export * from './ComponentName'
   ```

3. **Crear Test Co-ubicado**
   ```typescript
   // packages/ui/src/components/[category]/ComponentName.test.tsx
   import { render, screen } from '@testing-library/react';
   import { ComponentName } from './ComponentName';
   
   describe('ComponentName', () => {
     it('renders correctly', () => {
       render(<ComponentName title="Test" />);
       expect(screen.getByText('Test')).toBeInTheDocument();
     });
   });
   ```

4. **Build del Paquete**
   ```bash
   pnpm -F @maatwork/ui build
   ```

5. **Verificar Tipos Antes de Usar en Web**
   ```bash
   pnpm -F @maatwork/web typecheck
   ```

### Verificaciones
- [ ] Componente creado en categoría apropiada
- [ ] Export específico en `index.ts` (NO `export *`)
- [ ] Tipos exportados explícitamente (`type ComponentNameProps`)
- [ ] Test co-ubicado creado
- [ ] Build exitoso: `pnpm -F @maatwork/ui build`
- [ ] Typecheck pasa en apps que lo usan

### Referencias
- Regla: `.cursor/rules/domains/ui-package.mdc`
- Regla: `.cursor/rules/02-testing.mdc`
- Memoria: `.cursor/memories/common-errors-solutions.md`

---

## Flujo 3: Agregar Migración de Base de Datos

### Prerrequisitos
- [ ] **NUNCA usar `drizzle-kit push`** - es destructivo
- [ ] Entender cambios necesarios en schema
- [ ] Verificar migraciones existentes en `packages/db/migrations/`

### Pasos

1. **Modificar Schema**
   ```typescript
   // packages/db/src/schema.ts
   export const newTable = pgTable('new_table', {
     id: uuid('id').defaultRandom().primaryKey(),
     name: text('name').notNull(),
     createdAt: timestamp('created_at').defaultNow(),
   });
   ```

2. **Generar Migración**
   ```bash
   pnpm -F @maatwork/db generate
   # Esto crea archivo en packages/db/migrations/
   ```

3. **Revisar Migración Generada**
   ```bash
   # Verificar SQL generado
   cat packages/db/migrations/[timestamp]_[name].sql
   ```

4. **Aplicar Migración**
   ```bash
   pnpm -F @maatwork/db migrate
   ```

5. **Verificar en Base de Datos** (opcional)
   ```bash
   # Conectar a PostgreSQL y verificar
   psql -U postgres -d cactus_crm
   \dt  # Listar tablas
   ```

### Verificaciones
- [ ] Schema modificado en `packages/db/src/schema.ts`
- [ ] Migración generada: `pnpm -F @maatwork/db generate`
- [ ] SQL revisado y correcto
- [ ] Migración aplicada: `pnpm -F @maatwork/db migrate`
- [ ] Sin errores en aplicación

### Referencias
- Regla: `.cursor/rules/domains/database.mdc`
- Documentación: `docs/DATABASE.md`
- **IMPORTANTE:** NUNCA usar `drizzle-kit push`

---

## Flujo 4: Hacer Refactor Grande

### Prerrequisitos
- [ ] Entender alcance del refactor
- [ ] Verificar tests existentes
- [ ] Crear branch separado

### Pasos

1. **Ejecutar Typecheck Inicial**
   ```bash
   pnpm typecheck
   # Verificar estado actual
   ```

2. **Construir Paquetes Compartidos**
   ```bash
   pnpm -F @maatwork/ui build
   pnpm -F @maatwork/db build
   ```

3. **Hacer Cambios Incrementales**
   - Cambiar un archivo/componente a la vez
   - Ejecutar typecheck después de cada cambio significativo
   - Mantener tests pasando

4. **Actualizar Tests si es Necesario**
   ```bash
   pnpm test
   ```

5. **Verificación Final**
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```

### Verificaciones
- [ ] Typecheck inicial ejecutado
- [ ] Paquetes compartidos construidos
- [ ] Cambios incrementales con typecheck después de cada uno
- [ ] Tests actualizados y pasando
- [ ] Linter limpio
- [ ] Build exitoso

---

## Checklist Pre-Commit

Antes de hacer commit:

- [ ] Ejecutar `pnpm typecheck` - todos los workspaces
- [ ] Construir paquetes compartidos si hay cambios en tipos
- [ ] Ejecutar `pnpm lint` - sin errores
- [ ] Ejecutar `pnpm test` - tests pasan
- [ ] Verificar que no hay `console.log` en producción (usar logger)
- [ ] Verificar que no hay tipos `any` sin justificación
- [ ] Verificar que no hay código comentado innecesario
- [ ] Commits atómicos (una cosa por commit)

### Comandos Pre-Commit

```bash
# Verificación completa
pnpm typecheck && pnpm lint && pnpm test

# Si hay cambios en paquetes compartidos
pnpm -F @maatwork/ui build && pnpm -F @maatwork/db build
pnpm typecheck
```

## Referencias

- Reglas relacionadas:
  - `.cursor/rules/project.mdc` (checklist pre-modificación)
  - `.cursor/rules/01-typescript.mdc` (reglas TypeScript)
  - `.cursor/rules/02-testing.mdc` (testing)
- Memorias relacionadas:
  - `.cursor/memories/common-errors-solutions.md` (errores comunes)
  - `.cursor/memories/code-style-preferences.md` (estilo de código)
- Documentación:
  - `docs/DEVELOPMENT.md`
  - `docs/TESTING.md`

## Última Actualización

2025-01-16 - Memoria inicial con flujos de trabajo comunes




