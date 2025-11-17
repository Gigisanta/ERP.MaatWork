# CACTUS CRM - Web App

Aplicación web frontend del CRM construida con Next.js 15 y el Design System @cactus/ui.

## Características

- **Next.js 15**: App Router con React Server Components
- **Design System**: Componentes reutilizables de @cactus/ui
- **Theming**: Soporte para modo claro/oscuro
- **Accesibilidad**: WCAG 2.2 AA compliant
- **Responsive**: Diseño adaptativo para móviles y desktop

## Páginas Implementadas

### Autenticación
- `/login` - Inicio de sesión
- `/register` - Registro de usuarios

### Dashboard
- `/` - Panel principal
- `/profile` - Perfil de usuario
- `/analytics` - Análisis y métricas

### CRM
- `/contacts` - Gestión de contactos
- `/contacts/new` - Crear nuevo contacto
- `/contacts/[id]` - Detalle de contacto
- `/pipeline` - Pipeline de ventas (Kanban)
- `/teams` - Gestión de equipos

### Administración
- `/admin/users` - Administración de usuarios

### Portfolios
- `/portfolios` - Gestión de carteras
- `/portfolios/[id]` - Detalle de cartera

## Componentes Personalizados

- `AssetSearcher` - Búsqueda de activos financieros
- `PerformanceChart` - Gráficos de rendimiento
- `PortfolioComparator` - Comparación de carteras

## Variables de Entorno

Configurar en archivo `.env.local` en la raíz de `apps/web/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
JWT_SECRET=dev-insecure-secret-change-me
NEXT_PUBLIC_DEBUG=true
```

**Nota:** El archivo `.env.local` debe crearse manualmente ya que está en `.gitignore` para proteger secretos.

## Autenticación

El sistema usa **cookies httpOnly exclusivamente** para autenticación:

- **Más seguro**: Inmune a ataques XSS (JavaScript no puede leer cookies httpOnly)
- **Simplificado**: Sin dual storage (localStorage + cookies)
- **Persistente**: La sesión se mantiene entre refrescos de página
- **Automático**: Las cookies se envían en todas las requests con `credentials: 'include'`

**Flujo:**
1. Usuario hace login → Backend establece cookie httpOnly
2. Frontend recibe datos del usuario en respuesta
3. Cookie se envía automáticamente en todas las requests subsecuentes
4. Backend valida cookie en cada request con middleware `requireAuth`
5. Si el token expira (401), el cliente API intenta refresh automáticamente
6. Si el refresh es exitoso, se retry la request original sin interrumpir al usuario
7. Logout limpia la cookie mediante endpoint `/v1/auth/logout`

**Refresh Token Automático:**
- El cliente API (`api-client.ts`) detecta errores 401 automáticamente
- Intenta renovar el token llamando a `/v1/auth/refresh`
- Si el refresh es exitoso, reintenta la request original
- Si el refresh falla, se lanza error de sesión expirada

## Desarrollo

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev

# Build
pnpm build

# Análisis de bundle size
pnpm analyze

# Lint
pnpm lint

# Typecheck
pnpm typecheck

# Tests
pnpm test
```

## Estructura

```
apps/web/
├── app/                    # Next.js App Router
│   ├── auth/              # Context de autenticación
│   ├── components/        # Componentes específicos de la app
│   ├── contacts/          # Páginas de contactos
│   ├── admin/             # Páginas de administración
│   ├── portfolios/        # Páginas de carteras
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout raíz
│   └── page.tsx           # Página principal
├── public/                # Archivos estáticos
└── tailwind.config.js     # Configuración de Tailwind
```

## Integración con Design System

La aplicación utiliza componentes del design system @cactus/ui:

```tsx
import { 
  Button, 
  Card, 
  Input, 
  DataTable,
  useTheme 
} from '@cactus/ui';

// Los componentes automáticamente respetan el tema activo
// y incluyen todas las optimizaciones de accesibilidad
```

## Theming

El sistema de temas se maneja a través del ThemeProvider:

```tsx
import { ThemeProvider } from '@cactus/ui';

export default function RootLayout({ children }) {
  return (
    <ThemeProvider defaultTheme="light">
      {children}
    </ThemeProvider>
  );
}
```

## Accesibilidad

Todos los componentes incluyen:
- Navegación por teclado completa
- Etiquetas ARIA apropiadas
- Soporte para lectores de pantalla
- Contraste de colores WCAG 2.2 AA
- Focus management

## Responsive Design

El diseño se adapta automáticamente a diferentes tamaños de pantalla:
- Mobile: < 768px
- Tablet: 768px - 1024px  
- Desktop: > 1024px

## Optimizaciones de Performance

### Server Components
La aplicación utiliza React Server Components para reducir el JavaScript inicial:
- **Layout raíz**: Server Component (mejora FCP/LCP ~200-500ms)
- **Página principal**: Server Component con Client Islands
- **Patrón**: Extraer data fetching a Server Components, mantener interactividad en Client Islands pequeños

### Optimización de Imágenes
- **next/image**: Configurado para optimización automática de imágenes
- **Componente OptimizedImage**: Wrapper para uso consistente de `next/image`
- **Formats**: WebP y AVIF automáticos cuando están soportados
- **Lazy loading**: Automático para imágenes fuera del viewport

### Optimización de Fuentes
- **next/font**: Fuente Inter optimizada con `next/font/google`
- **Display swap**: Reduce FOUT (Flash of Unstyled Text)
- **Self-hosting**: Fuentes servidas desde el mismo dominio

### Code Splitting y Lazy Loading
- **Dynamic imports**: Componentes pesados cargados bajo demanda
  - `PerformanceChart` (~50-100KB)
  - `AumTrendChart` (~200KB con Recharts)
- **Tree-shaking**: Exports específicos en `@cactus/ui` (reducción ~30-50KB)

### Streaming SSR
- **loading.tsx**: Estados de carga para rutas críticas (`/contacts`, `/portfolios`, `/analytics`)
- **Suspense boundaries**: Implementados en páginas grandes
- **Skeleton loaders**: Consistentes en toda la aplicación

### Caching y Data Fetching
- **SWR**: Configurado con cache agresivo y deduplicación
- **Server-side fetching**: Data fetching en Server Components cuando es posible
- **Optimistic updates**: En operaciones críticas para mejor UX

### Bundle Analysis y Monitoreo

#### Análisis de Bundle Size
```bash
# Build y verificación de bundle size
pnpm -F @cactus/web build
pnpm -F @cactus/web check:bundle

# Análisis visual detallado
pnpm -F @cactus/web analyze
```

El script `check:bundle` verifica que los bundles estén dentro de los límites establecidos:
- **First Load JS**: < 300KB
- **Chunks individuales**: < 200KB
- **Total Bundle**: < 1MB

#### Generar Reporte de Performance
```bash
# Genera reporte completo con métricas y recomendaciones
node apps/web/scripts/generate-performance-report.js
```

El reporte incluye:
- Métricas actuales de bundle size
- Chunks más grandes y oportunidades de optimización
- Recomendaciones específicas basadas en métricas
- Comparación con límites establecidos

El reporte se guarda en `PERFORMANCE_REPORT.md` y puede ejecutarse en CI/CD.

#### Monitoreo Continuo
```bash
# Script de monitoreo de performance
node apps/web/scripts/performance-check.js
```

#### Métricas Objetivo (Lighthouse CI)
- **FCP**: < 1800ms
- **LCP**: < 2500ms
- **TTI**: < 3800ms
- **Speed Index**: < 3400ms
- **Total Byte Weight**: < 300KB

#### CI/CD Integration
El bundle size check está integrado en GitHub Actions:
- Se ejecuta automáticamente en cada PR
- Genera reporte JSON en `.next/bundle-report.json`
- Upload de artifacts para análisis posterior

Ver `.github/workflows/ci.yml` para más detalles.

## Arquitectura
Ver `ARCHITECTURE.md` en la raíz del monorepo para lineamientos actualizados.
