# Error de Build: ISR con Cookies

## Problema

Error durante el build de Next.js en páginas que intentan usar ISR (Incremental Static Regeneration) pero también requieren autenticación con cookies:

```
[Error]: Dynamic server usage: Route /teams couldn't be rendered statically 
because it used `cookies`. See more info here: 
https://nextjs.org/docs/messages/dynamic-server-error
```

## Causa

Las páginas estaban configuradas con:
```typescript
export const revalidate = 3600; // ISR
```

Pero también usaban:
- `getCurrentUser()` que internamente usa `cookies()` para obtener el token JWT
- `cookies()` directamente de `next/headers`

**Next.js no puede pre-renderizar páginas que requieren cookies** porque las cookies son específicas de cada usuario y cambian en cada request.

## Páginas Afectadas

Las siguientes páginas fueron corregidas:

1. `/teams` - usaba `getCurrentUser()`
2. `/benchmarks` - usaba `getCurrentUser()`
3. `/portfolios` - usaba `getCurrentUser()`
4. `/analytics` - usaba `cookies()` directamente

## Solución

Cambiar de ISR a renderizado dinámico forzado usando:

```typescript
// ❌ ANTES (causaba error)
export const revalidate = 3600; // Intenta ISR

export default async function Page() {
  const userResponse = await getCurrentUser(); // Usa cookies()
  // ...
}
```

```typescript
// ✅ DESPUÉS (correcto)
export const dynamic = 'force-dynamic'; // Renderizado dinámico

export default async function Page() {
  const userResponse = await getCurrentUser(); // Usa cookies()
  // ...
}
```

## Cuándo Usar Cada Opción

### ISR (`export const revalidate = N`)

**Usar cuando:**
- La página NO requiere autenticación
- Los datos son públicos o iguales para todos los usuarios
- Los datos cambian poco (cada hora, cada día)
- Quieres reducir carga del servidor

**Ejemplos válidos:**
```typescript
// Página pública de blog
export const revalidate = 3600; // OK - no usa cookies

export default async function BlogPage() {
  const posts = await getPublicPosts(); // No requiere autenticación
  return <PostList posts={posts} />;
}
```

### Dynamic Rendering (`export const dynamic = 'force-dynamic'`)

**Usar cuando:**
- La página requiere autenticación (usa `cookies()`)
- Los datos son específicos por usuario
- Los datos cambian frecuentemente
- La página usa `getCurrentUser()` o similar

**Ejemplos:**
```typescript
// Página privada con datos de usuario
export const dynamic = 'force-dynamic'; // Requerido

export default async function DashboardPage() {
  const user = await getCurrentUser(); // Usa cookies()
  const userTeams = await getTeamsForUser(user.id);
  return <Dashboard teams={userTeams} />;
}
```

## Trade-offs

### ISR
- ✅ Mejor performance (páginas cacheadas)
- ✅ Menor carga del servidor
- ✅ Mejor TTFB (Time to First Byte)
- ❌ No funciona con autenticación
- ❌ Datos pueden estar desactualizados hasta el próximo revalidate

### Dynamic Rendering
- ✅ Funciona con autenticación
- ✅ Datos siempre actualizados
- ✅ Puede personalizar por usuario
- ❌ Mayor carga del servidor (render en cada request)
- ❌ TTFB más lento que ISR

## Verificación

Para verificar que no hay más errores de ISR+cookies:

```bash
# Build de producción
pnpm -F @maatwork/web build

# Si hay errores, buscar en el output:
grep "couldn't be rendered statically" build.log
```

## Prevención

Al crear nuevas páginas Server Components:

1. **¿La página usa autenticación?**
   - SÍ → `export const dynamic = 'force-dynamic'`
   - NO → Puedes usar `export const revalidate = N`

2. **¿La página llama a `getCurrentUser()` o `cookies()`?**
   - SÍ → `export const dynamic = 'force-dynamic'`
   - NO → Puedes usar ISR si tiene sentido

3. **¿Los datos son iguales para todos los usuarios?**
   - SÍ → Considera ISR
   - NO → Usa `dynamic = 'force-dynamic'`

## Alternativa: Hybrid Approach

Si quieres cachear partes de una página autenticada, usa Client Islands:

```typescript
// page.tsx - Server Component (dynamic)
export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getCurrentUser(); // Usa cookies - OK
  
  return (
    <div>
      <UserHeader user={user} /> {/* Server Component */}
      <PublicContent /> {/* Client Island - puede usar SWR con stale-while-revalidate */}
    </div>
  );
}
```

## Referencias

- [Next.js: Dynamic Functions](https://nextjs.org/docs/app/building-your-application/rendering/server-components#dynamic-functions)
- [Next.js: ISR](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating#revalidating-data)
- Error fix commit: Cambio de ISR a dynamic rendering en páginas autenticadas

