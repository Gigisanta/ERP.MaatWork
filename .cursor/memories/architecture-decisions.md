# Memoria: Decisiones Arquitectónicas

## Propósito
Documentación de decisiones arquitectónicas clave del proyecto CACTUS CRM en formato ADR (Architecture Decision Record) para proporcionar contexto histórico y justificar elecciones técnicas.

## Contexto
Usar esta memoria cuando:
- Entender por qué se eligió una solución arquitectónica
- Evaluar cambios arquitectónicos
- Onboarding de nuevos desarrolladores
- Necesitar contexto histórico de decisiones

## ADR 1: Server Components por Defecto en Next.js

### Contexto
Next.js App Router soporta Server Components y Client Components. Necesitamos decidir cuándo usar cada uno.

### Decisión
**Usar Server Components por defecto**, solo usar `"use client"` cuando sea necesario para interactividad.

### Justificación
- **Mejor performance**: Menos JavaScript enviado al cliente
- **SEO mejorado**: Contenido renderizado en servidor
- **Menor bundle size**: Código del servidor no se incluye en el bundle del cliente
- **Mejor seguridad**: Lógica sensible no expuesta al cliente

### Consecuencias
- ✅ Mejor performance inicial de carga
- ✅ Menor tamaño de bundle JavaScript
- ✅ Mejor SEO
- ⚠️ Necesidad de extraer secciones interactivas a Client Islands

### Referencias
- Regla: `.cursor/rules/domains/web.mdc` - Server Component Architecture
- Código: `apps/web/app/**/*.tsx` (Server Components por defecto)

---

## ADR 2: Patrón Client Islands

### Contexto
Con Server Components por defecto, necesitamos un patrón para manejar interactividad sin convertir toda la página en Client Component.

### Decisión
**Usar patrón Client Islands**: Extraer secciones interactivas en componentes pequeños (< 100 líneas) con `"use client"`, pasando datos del servidor como props.

### Justificación
- **Modularidad**: Componentes pequeños y enfocados
- **Performance**: Solo el código interactivo se envía al cliente
- **Mantenibilidad**: Separación clara entre lógica de servidor y cliente

### Estructura
```typescript
// app/route/page.tsx (Server Component)
export default async function Page() {
  const data = await fetchData(); // Server-side
  
  return (
    <div>
      <ServerContent data={data} />
      <InteractiveSection data={data} /> {/* Client Island */}
    </div>
  );
}

// app/route/InteractiveSection.tsx (Client Island)
"use client";
export function InteractiveSection({ data }: { data: Data }) {
  const [state, setState] = useState();
  // Interactividad aquí
}
```

### Consecuencias
- ✅ Mejor separación de concerns
- ✅ Componentes más pequeños y testeables
- ⚠️ Necesidad de pasar datos explícitamente como props

### Referencias
- Regla: `.cursor/rules/domains/web.mdc` - Client Islands pattern
- Código: `apps/web/app/**/*.tsx` (ejemplos de Client Islands)

---

## ADR 3: Cliente API Centralizado

### Contexto
Necesitamos decidir cómo hacer requests HTTP desde el frontend: fetch directo vs cliente centralizado.

### Decisión
**NUNCA usar `fetch` directamente**. Siempre usar cliente API centralizado en `apps/web/lib/api/[domain].ts`.

### Justificación
- **Consistencia**: Mismo formato de requests/responses
- **Retry automático**: Manejo de errores 5xx con retry
- **Refresh token automático**: Manejo de 401 con refresh automático
- **Type safety**: Tipos TypeScript compartidos
- **Logging centralizado**: Todos los requests logueados en un lugar

### Estructura
```typescript
// apps/web/lib/api/[domain].ts
export async function createContact(data: CreateContactRequest): Promise<Contact> {
  const response = await apiClient.post('/v1/contacts', data);
  return response.data;
}

// ❌ NUNCA hacer esto:
const response = await fetch('/api/v1/contacts', { ... });
```

### Consecuencias
- ✅ Manejo consistente de errores
- ✅ Retry y refresh token automáticos
- ✅ Type safety end-to-end
- ⚠️ Necesidad de crear funciones wrapper para cada endpoint

### Referencias
- Regla: `.cursor/rules/domains/api.mdc` - Cliente API centralizado
- Código: `apps/web/lib/api/**/*.ts`

---

## ADR 4: Validación Siempre en Backend (Zod)

### Contexto
Necesitamos decidir dónde validar datos: solo frontend, solo backend, o ambos.

### Decisión
**Validación siempre en backend con Zod**. Frontend puede tener validación UX pero nunca confiar en ella.

### Justificación
- **Seguridad**: Frontend puede ser manipulado
- **Consistencia**: Misma validación en todos los clientes
- **Type safety**: Tipos inferidos de schemas Zod
- **Error handling**: Errores de validación consistentes

### Estructura
```typescript
// Backend: apps/api/src/routes/[domain].ts
const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

router.post(
  '/endpoint',
  validate(createSchema), // Validación obligatoria
  async (req, res) => {
    // req.body ya validado y tipado
  }
);
```

### Consecuencias
- ✅ Seguridad garantizada
- ✅ Type safety end-to-end
- ✅ Errores consistentes (400 Bad Request)
- ⚠️ Necesidad de mantener schemas sincronizados

### Referencias
- Regla: `.cursor/rules/domains/api.mdc` - Validaciones con Zod
- Regla: `.cursor/rules/patterns/error-handling.mdc` - Manejo de errores

---

## ADR 5: Migraciones con generate + migrate (NUNCA push)

### Contexto
Drizzle ORM ofrece `drizzle-kit push` para aplicar cambios directamente a la DB, pero también `generate` + `migrate` para migraciones versionadas.

### Decisión
**NUNCA usar `drizzle-kit push`**. Siempre usar `generate` + `migrate` para migraciones versionadas.

### Justificación
- **Versionado**: Migraciones versionadas permiten rollback
- **Historial**: Historial completo de cambios en la DB
- **Seguridad**: `push` es destructivo y puede eliminar datos
- **Producción**: Migraciones versionadas son esenciales para producción
- **Colaboración**: Migraciones versionadas se comparten en git

### Flujo Correcto
```bash
# 1. Modificar schema
# packages/db/src/schema.ts

# 2. Generar migración
pnpm -F @cactus/db generate

# 3. Revisar SQL generado
# packages/db/migrations/[timestamp]_[name].sql

# 4. Aplicar migración
pnpm -F @cactus/db migrate
```

### Consecuencias
- ✅ Migraciones versionadas y seguras
- ✅ Historial completo de cambios
- ✅ Posibilidad de rollback
- ⚠️ Necesidad de generar migración para cada cambio

### Referencias
- Regla: `.cursor/rules/domains/database.mdc` - Migraciones
- Documentación: `docs/DATABASE.md`
- **IMPORTANTE:** NUNCA usar `drizzle-kit push`

---

## ADR 6: Monorepo con pnpm Workspaces + Turborepo

### Contexto
Necesitamos decidir estructura del proyecto: monorepo vs múltiples repositorios.

### Decisión
**Monorepo con pnpm workspaces + Turborepo** para apps y packages compartidos.

### Justificación
- **Code sharing**: Compartir código entre apps fácilmente
- **Type safety**: Tipos compartidos entre frontend y backend
- **Build optimization**: Turborepo optimiza builds incrementales
- **Dependency management**: pnpm maneja dependencias eficientemente

### Estructura
```
apps/
  api/          # Backend Express
  web/          # Frontend Next.js
  analytics-service/  # Python service
packages/
  db/           # Drizzle ORM schema
  ui/           # React components
```

### Consecuencias
- ✅ Code sharing fácil
- ✅ Type safety end-to-end
- ✅ Builds optimizados con cache
- ⚠️ Necesidad de construir paquetes antes de typecheck

### Referencias
- Regla: `.cursor/rules/project.mdc` - Arquitectura General
- Documentación: `docs/ARCHITECTURE.md`

---

## ADR 7: TypeScript Strict Mode con exactOptionalPropertyTypes

### Contexto
TypeScript ofrece diferentes niveles de strictness. Necesitamos decidir configuración.

### Decisión
**TypeScript strict mode con `exactOptionalPropertyTypes: true`** para máxima type safety.

### Justificación
- **Type safety**: Detecta más errores en tiempo de compilación
- **Claridad**: Diferencia explícita entre `undefined` y propiedad omitida
- **Prevención de bugs**: Evita errores comunes con propiedades opcionales

### Consecuencias
- ✅ Mejor type safety
- ✅ Código más robusto
- ⚠️ Necesidad de manejar propiedades opcionales correctamente
- ⚠️ No se puede asignar `undefined` explícitamente a propiedades opcionales

### Referencias
- Regla: `.cursor/rules/01-typescript.mdc` - Manejo de propiedades opcionales
- Memoria: `.cursor/memories/common-errors-solutions.md` - Errores comunes

---

## Referencias

- Reglas relacionadas:
  - `.cursor/rules/project.mdc` (arquitectura general)
  - `.cursor/rules/domains/web.mdc` (Server Components, Client Islands)
  - `.cursor/rules/domains/api.mdc` (API centralizado, validaciones)
  - `.cursor/rules/domains/database.mdc` (migraciones)
- Memorias relacionadas:
  - `.cursor/memories/common-workflows.md` (flujos de trabajo)
- Documentación:
  - `docs/ARCHITECTURE.md`
  - `docs/DEVELOPMENT.md`

## Última Actualización

2025-01-16 - Memoria inicial con decisiones arquitectónicas clave

