'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Header, type NavItem, type User, Drawer, Sidebar, type SidebarSection } from '@maatwork/ui';
import { useSidebar } from './SidebarContext';
import CareerProgressBar from './CareerProgressBar';
import { Feather } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface NavigationNewProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

// AI_DECISION: Optimize prefetching for less frequently visited routes
// Justificación: Disabling prefetch for admin and secondary routes reduces unnecessary network requests and improves performance
// Impacto: Reduces bandwidth usage, faster initial page load, better performance for main routes
const routesWithoutPrefetch = [
  '/admin',
  '/capacitaciones',
  '/automations',
  '/career-plan',
  '/profile',
  '/resources',
  '/contacts/metrics/history',
  '/contacts/[id]/tags',
  '/tasks',
];

// AI_DECISION: Extraer enlaces externos a constantes reutilizables
// Justificación: Facilita mantenimiento y consistencia de URLs externas
// Impacto: Cambios en URLs externas solo requieren actualizar un lugar
const EXTERNAL_LINKS = {
  FINVIZ: 'https://finviz.com',
  BALANZ: 'https://productores.balanz.com?forward=/home',
  ZURICH: 'https://agentes.zurich.com.ar/AgentLoginOkta?ec=302&startURL=%2Fs%2F',
} as const;

// Custom Link component that handles both internal and external links
const CustomLink = React.forwardRef<
  HTMLAnchorElement,
  {
    href: string;
    className?: string;
    'aria-current'?: 'page' | undefined;
    title?: string;
    children: React.ReactNode;
  }
>(({ href, className, 'aria-current': ariaCurrent, title, children }, ref) => {
  const isExternal = href.startsWith('http');

  if (isExternal) {
    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={title}
      >
        {children}
      </a>
    );
  }

  // Disable prefetch for admin and less frequently visited routes
  const shouldPrefetch = !routesWithoutPrefetch.some(
    (route) =>
      href.startsWith(route) ||
      (route.includes('[') && href.match(route.replace(/\[.*?\]/g, '[^/]+')))
  );

  // For internal links, wrap Link in a span to handle ref properly
  // Next.js Link doesn't always forward ref correctly in all versions
  return (
    <Link
      href={href}
      className={className}
      aria-current={ariaCurrent}
      title={title}
      prefetch={shouldPrefetch}
    >
      {children}
    </Link>
  );
});

CustomLink.displayName = 'CustomLink';

// AI_DECISION: Funciones helper por rol para construir sidebar sections
// Justificación: Organiza código por rol, facilita mantenimiento y mejora legibilidad
// Impacto: Código más modular, fácil de modificar y testear por separado

/**
 * Construye secciones de sidebar para Advisor (Asesor)
 * Flujo: Trabajo diario → Inversiones → Equipos → Herramientas
 */
function getAdvisorSections(): SidebarSection[] {
  return [
    {
      title: 'Principal',
      items: [
        { label: 'Contactos', href: '/contacts', icon: 'Contact' as const },
      ],
    },
    {
      title: 'Inversiones',
      items: [{ label: 'Carteras', href: '/portfolios', icon: 'BarChart3' as const }],
    },
    {
      title: 'Equipos',
      items: [{ label: 'Equipos', href: '/teams', icon: 'Team' as const }],
    },
    {
      title: 'Herramientas',
      items: [
        { label: 'Capacitaciones', href: '/capacitaciones', icon: 'GraduationCap' as const },
        { label: 'Recursos', href: '/resources', icon: 'FileText' as const },
        { label: 'Finviz', href: EXTERNAL_LINKS.FINVIZ, icon: 'TrendingUp' as const },
        { label: 'Productores Balanz', href: EXTERNAL_LINKS.BALANZ, icon: 'Briefcase' as const },
        { label: 'Zurich Point', href: EXTERNAL_LINKS.ZURICH, icon: 'Shield' as const },
      ],
    },
  ];
}

/**
 * Construye secciones de sidebar para Manager (Gerente)
 * Flujo: Trabajo diario → Inversiones → Equipos → Métricas → Herramientas → Admin básico
 */
function getManagerSections(): SidebarSection[] {
  return [
    {
      title: 'Principal',
      items: [
        { label: 'Contactos', href: '/contacts', icon: 'Contact' as const },
      ],
    },
    {
      title: 'Inversiones',
      items: [{ label: 'Carteras', href: '/portfolios', icon: 'BarChart3' as const }],
    },
    {
      title: 'Equipos',
      items: [{ label: 'Equipos', href: '/teams', icon: 'Team' as const }],
    },
    {
      title: 'Métricas',
      items: [
        { label: 'Métricas de Contactos', href: '/contacts/metrics', icon: 'BarChart2' as const },
        { label: 'Analytics', href: '/analytics', icon: 'TrendingUp' as const },
      ],
    },
    {
      title: 'Herramientas',
      items: [
        { label: 'Capacitaciones', href: '/capacitaciones', icon: 'GraduationCap' as const },
        { label: 'Recursos', href: '/resources', icon: 'FileText' as const },
        { label: 'Finviz', href: EXTERNAL_LINKS.FINVIZ, icon: 'TrendingUp' as const },
        { label: 'Productores Balanz', href: EXTERNAL_LINKS.BALANZ, icon: 'Briefcase' as const },
        { label: 'Zurich Point', href: EXTERNAL_LINKS.ZURICH, icon: 'Shield' as const },
      ],
    },
    {
      title: 'Administración',
      items: [{ label: 'Panel Principal', href: '/admin', icon: 'Settings' as const }],
    },
  ];
}

/**
 * Construye secciones de sidebar para Admin (Administrador)
 * Flujo: Trabajo diario → Inversiones → Equipos → Métricas → Automatización → Herramientas → Admin completo → Perfil
 */
function getAdminSections(): SidebarSection[] {
  return [
    {
      title: 'Principal',
      items: [
        { label: 'Contactos', href: '/contacts', icon: 'Contact' as const },
      ],
    },
    {
      title: 'Inversiones',
      items: [
        { label: 'Carteras', href: '/portfolios', icon: 'BarChart3' as const },
        { label: 'Benchmarks', href: '/benchmarks', icon: 'BarChart3' as const },
      ],
    },
    {
      title: 'Equipos',
      items: [{ label: 'Equipos', href: '/teams', icon: 'Team' as const }],
    },
    {
      title: 'Métricas',
      items: [
        { label: 'Métricas de Contactos', href: '/contacts/metrics', icon: 'BarChart2' as const },
        { label: 'Analytics', href: '/analytics', icon: 'TrendingUp' as const },
      ],
    },
    {
      title: 'Automatización',
      items: [
        { label: 'Pipeline', href: '/pipeline', icon: 'list' as const },
        { label: 'Automations', href: '/automations', icon: 'Settings' as const },
        { label: 'Plan de Carrera', href: '/career-plan', icon: 'Book' as const },
        { label: 'Notificaciones', href: '/notifications', icon: 'Info' as const },
      ],
    },
    {
      title: 'Herramientas',
      items: [
        { label: 'Capacitaciones', href: '/capacitaciones', icon: 'GraduationCap' as const },
        { label: 'Recursos', href: '/resources', icon: 'FileText' as const },
        { label: 'Finviz', href: EXTERNAL_LINKS.FINVIZ, icon: 'TrendingUp' as const },
        { label: 'Productores Balanz', href: EXTERNAL_LINKS.BALANZ, icon: 'Briefcase' as const },
        { label: 'Zurich Point', href: EXTERNAL_LINKS.ZURICH, icon: 'Shield' as const },
      ],
    },
    {
      title: 'Administración',
      items: [
        { label: 'Panel Principal', href: '/admin', icon: 'Settings' as const },
        { label: 'Usuarios y Cuentas', href: '/admin/users', icon: 'Users' as const },
        { label: 'AUM y Brokers', href: '/admin/aum', icon: 'BarChart2' as const },
        { label: 'Performance', href: '/admin/performance', icon: 'TrendingUp' as const },
        {
          label: 'Configuración AUM',
          href: '/admin/settings/aum-advisors',
          icon: 'Settings' as const,
        },
      ],
    },
    {
      title: 'Perfil',
      items: [{ label: 'Mi Perfil', href: '/profile', icon: 'User' as const }],
    },
  ];
}

/**
 * Construye secciones de sidebar para Owner (Dirección)
 * Flujo: Dashboard → Métricas (solo lectura)
 */
function getOwnerSections(): SidebarSection[] {
  return [
    {
      title: 'Dashboard',
      items: [{ label: 'Equipos', href: '/teams', icon: 'Team' as const }],
    },
    {
      title: 'Métricas',
      items: [
        { label: 'Analytics', href: '/analytics', icon: 'TrendingUp' as const },
        { label: 'Carteras', href: '/portfolios', icon: 'BarChart3' as const },
      ],
    },
  ];
}

/**
 * Construye secciones de sidebar para Staff (Administrativo)
 * Flujo: Trabajo diario → Inversiones → Equipos → Herramientas → Gestión AUM
 */
function getStaffSections(): SidebarSection[] {
  return [
    {
      title: 'Principal',
      items: [
        { label: 'Contactos', href: '/contacts', icon: 'Contact' as const },
      ],
    },
    {
      title: 'Inversiones',
      items: [{ label: 'Carteras', href: '/portfolios', icon: 'BarChart3' as const }],
    },
    {
      title: 'Equipos',
      items: [{ label: 'Equipos', href: '/teams', icon: 'Team' as const }],
    },
    {
      title: 'Herramientas',
      items: [
        { label: 'Capacitaciones', href: '/capacitaciones', icon: 'GraduationCap' as const },
        { label: 'Recursos', href: '/resources', icon: 'FileText' as const },
        { label: 'Finviz', href: EXTERNAL_LINKS.FINVIZ, icon: 'TrendingUp' as const },
        { label: 'Productores Balanz', href: EXTERNAL_LINKS.BALANZ, icon: 'Briefcase' as const },
        { label: 'Zurich Point', href: EXTERNAL_LINKS.ZURICH, icon: 'Shield' as const },
      ],
    },
    {
      title: 'Gestión',
      items: [{ label: 'AUM', href: '/admin/aum', icon: 'BarChart2' as const }],
    },
  ];
}

export default function NavigationNew({ onToggleSidebar, sidebarOpen }: NavigationNewProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useSidebar();
  const open = sidebarOpen ?? internalOpen;
  const { user, logout, initialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);

  // Memoized toggle function
  const handleToggle = useCallback(() => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else {
      setInternalOpen((v) => !v);
    }
  }, [onToggleSidebar]);

  // Memoized close function for drawer
  const handleDrawerClose = useCallback(() => {
    if (sidebarOpen !== undefined) {
      onToggleSidebar?.();
    } else {
      setInternalOpen(false);
    }
  }, [sidebarOpen, onToggleSidebar]);

  // Close drawer on navigation (mobile)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && open) {
      handleDrawerClose();
    }
  }, [pathname]); // Only depend on pathname to close on navigation

  const handleLogout = useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  // AI_DECISION: Redirigir al login cuando no hay usuario después de inicialización
  // Justificación: Si la autenticación se inicializó y no hay usuario, significa que no hay sesión activa
  // Impacto: Mejor UX redirigiendo al login en lugar de mostrar mensaje de debug
  // IMPORTANTE: Este hook debe estar ANTES de cualquier return condicional para cumplir con las reglas de hooks
  useEffect(() => {
    // Solo procesar si ya se inicializó
    if (!initialized) return;

    // Si estamos en rutas públicas, no hacer nada
    const isPublicRoute = pathname === '/login' || pathname === '/register' || pathname === '/';
    if (isPublicRoute) {
      return;
    }

    // Si hay usuario, resetear el flag y no hacer nada más
    if (user) {
      hasRedirectedRef.current = false;
      return;
    }

    // Si no hay usuario y no hemos redirigido aún, redirigir al login
    if (!user && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      // Usar replace en lugar de push para evitar problemas de historial
      router.replace('/login');
    }
  }, [user, initialized, router, pathname]);

  // AI_DECISION: Mostrar skeleton mientras se inicializa autenticación en lugar de retornar null
  // Justificación: Retornar null hace que el componente desaparezca completamente, causando layout shift
  // Impacto: Mejor UX durante la carga inicial, evita parpadeos
  if (!initialized) {
    // Mostrar skeleton del header mientras se carga
    return (
      <div className="sticky top-0 z-40 bg-surface border-b border-border safe-area-top">
        <div className="flex h-12 sm:h-14 items-center justify-between px-2 xs:px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 bg-border rounded animate-pulse" />
            <div className="w-24 h-4 bg-border rounded animate-pulse hidden xs:block" />
          </div>
        </div>
      </div>
    );
  }

  // Si no hay usuario después de inicialización, no renderizar navegación
  // Si estamos en rutas públicas, retornar null inmediatamente
  if (!user && initialized) {
    const isPublicRoute = pathname === '/login' || pathname === '/register' || pathname === '/';
    if (isPublicRoute) {
      return null;
    }

    // En producción, retornar null inmediatamente
    if (process.env.NODE_ENV === 'production') {
      return null;
    }

    // En desarrollo, mostrar mensaje temporal solo si realmente estamos redirigiendo
    // (el useEffect ya se encargó de iniciar la redirección)
    return null;
  }

  // Si no hay usuario, no renderizar nada (aún no inicializado o en proceso de redirección)
  if (!user) {
    return null;
  }

  // AI_DECISION: Logo optimizado para responsive
  // Justificación: El logo debe adaptarse a diferentes tamaños de pantalla sin romper el layout
  // Impacto: Mejor experiencia en dispositivos móviles y tablets
  const logo = (
    <div className="flex items-center gap-2 min-w-0 w-full">
      <Link
        href="/home"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
      >
        {/* Logo icon - always visible */}
        <span className="text-primary shrink-0" aria-hidden="true">
          <Feather className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.5} />
        </span>
        {/* Logo text - hidden on very small screens */}
        <span className="text-lg sm:text-xl font-bold whitespace-nowrap shrink-0 hidden xs:inline">
          <span className="text-primary">Maat</span>
          <span className="text-secondary">Work</span>
        </span>
      </Link>
      {/* Career Progress Bar - only on larger screens */}
      {/* AI_DECISION: Renderizar siempre el contenedor, ocultarlo con CSS en lugar de condicionalmente */}
      {/* Justificación: Asegura que el componente siempre se monte, mejor debugging */}
      {/* Impacto: Componente siempre disponible, evita problemas de renderizado condicional */}
      <div className="hidden md:flex items-center min-w-0 flex-1 ml-2">
        <CareerProgressBar />
      </div>
    </div>
  );

  // Empty navItems - navigation moved to sidebar
  const navItems: NavItem[] = [];

  const headerUser: User = {
    name: user.fullName || user.email,
    email: user.email,
    role:
      user.role === 'admin'
        ? '👑 Administrador'
        : user.role === 'manager'
          ? '👨‍💼 Manager'
          : user.role === 'owner'
            ? '🏢 Dirección'
            : user.role === 'staff'
              ? '📋 Administrativo'
              : '👤 Asesor',
  };

  // AI_DECISION: Sidebar sections diferenciadas por rol usando funciones helper
  // Justificación: Código más limpio y mantenible, cada rol tiene su función dedicada
  // Impacto: Facilita modificar navegación por rol sin afectar otros roles
  const sidebarSections: SidebarSection[] = (() => {
    switch (user.role) {
      case 'admin':
        return getAdminSections();
      case 'manager':
        return getManagerSections();
      case 'owner':
        return getOwnerSections();
      case 'staff':
        return getStaffSections();
      case 'advisor':
      default:
        return getAdvisorSections();
    }
  })();

  return (
    <>
      {/* Header fijo con soporte para safe areas */}
      <div className="sticky top-0 z-40 bg-surface border-b border-border safe-area-top">
        <Header
          logo={logo}
          navItems={navItems}
          user={headerUser}
          notificationComponent={<NotificationBell />}
          onLogout={handleLogout}
          onToggleSidebar={handleToggle}
          sidebarOpen={open}
        />
      </div>

      {/* Desktop Sidebar - Expandable */}
      {/* AI_DECISION: Altura ajustada para header responsive (3rem mobile, 3.5rem desktop) */}
      {/* AI_DECISION: Renderizar sidebar siempre, ocultarlo con CSS en lugar de condicionalmente */}
      {/* Justificación: Asegura que el componente siempre se monte, evitando problemas de hidratación */}
      {/* Impacto: Sidebar siempre disponible, mejor debugging, evita problemas de renderizado */}
      <aside
        className="hidden lg:flex fixed left-0 top-[3rem] sm:top-[3.5rem] h-[calc(100vh-3rem)] sm:h-[calc(100vh-3.5rem)] z-30"
        aria-label="Navegación principal"
      >
        <Sidebar
          sections={sidebarSections}
          logo={null}
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          defaultCollapsed={false}
          currentPath={pathname || ''}
          LinkComponent={CustomLink}
          className="h-full"
        />
      </aside>

      {/* Mobile Drawer - Solo visible en pantallas < lg */}
      {/* AI_DECISION: Renderizar drawer siempre, controlado por estado open */}
      {/* Justificación: Asegura que el componente siempre se monte para mejor debugging */}
      {/* Impacto: Drawer siempre disponible, mejor manejo de estados */}
      <Drawer open={open} onOpenChange={handleDrawerClose} side="left">
        <Sidebar
          sections={sidebarSections}
          logo={null}
          currentPath={pathname || ''}
          isOpen={open}
          onOpenChange={handleDrawerClose}
          LinkComponent={CustomLink}
          className="h-full"
        />
      </Drawer>
    </>
  );
}
