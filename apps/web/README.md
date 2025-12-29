# MAATWORK - Web App

Aplicación web frontend del CRM construida con Next.js 15 y el Design System @maatwork/ui.

## Características

- **Next.js 15**: App Router con React Server Components
- **Design System**: Componentes reutilizables de @maatwork/ui
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

La aplicación utiliza componentes del design system @maatwork/ui:

```tsx
import { 
  Button, 
  Card, 
  Input, 
  DataTable,
  useTheme 
} from '@maatwork/ui';

// Los componentes automáticamente respetan el tema activo
// y incluyen todas las optimizaciones de accesibilidad
```

## Theming

El sistema de temas se maneja a través del ThemeProvider:

```tsx
import { ThemeProvider } from '@maatwork/ui';

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

## Optimizaciones

Para información detallada sobre optimizaciones de performance, bundle size y métricas, ver [Guía de Optimización](../../docs/OPTIMIZATION.md).
