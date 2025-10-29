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

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Desarrollo

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev

# Build
pnpm build

# Lint
pnpm lint
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
## Arquitectura
Ver `ARCHITECTURE.md` en la raíz del monorepo para lineamientos actualizados.
