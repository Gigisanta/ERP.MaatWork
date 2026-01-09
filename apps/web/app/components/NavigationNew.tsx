'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Header,
  type NavItem,
  type User,
  Drawer,
  Sidebar,
  type SidebarSection,
} from '@maatwork/ui';
import { useSidebar } from './SidebarContext';
import CareerProgressBar from './CareerProgressBar';
import { Feather } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { FeedbackButton } from './FeedbackButton';
import { MobileBottomBar } from './MobileBottomBar';

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

// Helper functions for localized roles
const LABELS = {
  // Section Titles
  MAIN: 'Principal',
  PLATFORMS: 'Plataformas',
  RESOURCES: 'Recursos',
  MANAGEMENT: 'Gestión',
  ANALYTICS: 'Analíticas',
  DASHBOARD: 'Dashboard',
  // Items
  CONTACTS: 'Contactos',
  PORTFOLIOS: 'Carteras',
  TEAMS: 'Equipos',
  TRAINING: 'Capacitaciones',
  METRICS_CONTACTS: 'Métricas de Contactos',
  ANALYTICS_APP: 'Analytics',
  USERS: 'Usuarios',
  GLOBAL_CONFIG: 'Configuración Global',
  AUTOMATIONS: 'Automatizaciones',
  CAREER_PLAN: 'Plan de Carrera',
  NOTIFICATIONS: 'Notificaciones',
  BENCHMARKS: 'Benchmarks',
  AUM: 'AUM',
  PERFORMANCE: 'Performance',
  PROFILE: 'Mi Perfil',
};

/**
 * Construye secciones de sidebar para Advisor (Asesor)
 * Estructura: Principal, Plataformas, Recursos
 */
function getAdvisorSections(): SidebarSection[] {
  return [
    {
      title: LABELS.MAIN,
      items: [
        { label: LABELS.CONTACTS, href: '/contacts', icon: 'Contact' as const },
        { label: LABELS.PORTFOLIOS, href: '/portfolios', icon: 'Briefcase' as const },
        { label: LABELS.TEAMS, href: '/teams', icon: 'Team' as const },
      ],
    },
    {
      title: LABELS.PLATFORMS,
      items: [
        { label: 'Finviz', href: EXTERNAL_LINKS.FINVIZ, icon: 'BarChart3' as const },
        { label: 'Productores Balanz', href: EXTERNAL_LINKS.BALANZ, icon: 'Layout' as const },
        { label: 'Zurich Point', href: EXTERNAL_LINKS.ZURICH, icon: 'Shield' as const },
      ],
    },
    {
      title: LABELS.RESOURCES,
      items: [
        { label: LABELS.TRAINING, href: '/capacitaciones', icon: 'GraduationCap' as const },
        { label: 'Recursos', href: '/resources', icon: 'FileText' as const },
      ],
    },
  ];
}

/**
 * Construye secciones de sidebar para Manager (Gerente)
 * Estructura: Principal, Plataformas, Recursos, Gestión, Analíticas
 */
function getManagerSections(): SidebarSection[] {
  return [
    {
      title: LABELS.MAIN,
      items: [
        { label: LABELS.CONTACTS, href: '/contacts', icon: 'Contact' as const },
        { label: LABELS.PORTFOLIOS, href: '/portfolios', icon: 'Briefcase' as const },
        { label: LABELS.TEAMS, href: '/teams', icon: 'Team' as const },
      ],
    },
    {
      title: LABELS.PLATFORMS,
      items: [
        { label: 'Finviz', href: EXTERNAL_LINKS.FINVIZ, icon: 'BarChart3' as const },
        { label: 'Productores Balanz', href: EXTERNAL_LINKS.BALANZ, icon: 'Layout' as const },
        { label: 'Zurich Point', href: EXTERNAL_LINKS.ZURICH, icon: 'Shield' as const },
      ],
    },
    {
      title: LABELS.RESOURCES,
      items: [
        { label: LABELS.TRAINING, href: '/capacitaciones', icon: 'GraduationCap' as const },
        { label: 'Recursos', href: '/resources', icon: 'FileText' as const },
      ],
    },
    {
      title: LABELS.MANAGEMENT,
      items: [{ label: LABELS.GLOBAL_CONFIG, href: '/admin', icon: 'Settings' as const }],
    },
    {
      title: LABELS.ANALYTICS,
      items: [
        { label: LABELS.ANALYTICS_APP, href: '/analytics', icon: 'TrendingUp' as const },
        { label: LABELS.METRICS_CONTACTS, href: '/contacts/metrics', icon: 'BarChart2' as const },
      ],
    },
  ];
}

/**
 * Construye secciones de sidebar para Admin (Administrador)
 * Estructura: Principal, Plataformas, Recursos, Gestión, Analíticas
 */
function getAdminSections(): SidebarSection[] {
  return [
    {
      title: LABELS.MAIN,
      items: [
        { label: LABELS.CONTACTS, href: '/contacts', icon: 'Contact' as const },
        { label: LABELS.PORTFOLIOS, href: '/portfolios', icon: 'Briefcase' as const },
        { label: LABELS.TEAMS, href: '/teams', icon: 'Team' as const },
      ],
    },
    {
      title: LABELS.PLATFORMS,
      items: [
        { label: 'Finviz', href: EXTERNAL_LINKS.FINVIZ, icon: 'BarChart3' as const },
        { label: 'Productores Balanz', href: EXTERNAL_LINKS.BALANZ, icon: 'Layout' as const },
        { label: 'Zurich Point', href: EXTERNAL_LINKS.ZURICH, icon: 'Shield' as const },
      ],
    },
    {
      title: LABELS.RESOURCES,
      items: [
        { label: LABELS.TRAINING, href: '/capacitaciones', icon: 'GraduationCap' as const },
        { label: 'Recursos', href: '/resources', icon: 'FileText' as const },
        { label: LABELS.CAREER_PLAN, href: '/career-plan', icon: 'Book' as const },
        { label: LABELS.NOTIFICATIONS, href: '/notifications', icon: 'Bell' as const },
      ],
    },
    {
      title: LABELS.MANAGEMENT,
      items: [
        { label: LABELS.USERS, href: '/admin/users', icon: 'Users' as const },
        { label: LABELS.GLOBAL_CONFIG, href: '/admin', icon: 'Settings' as const },
        { label: LABELS.AUTOMATIONS, href: '/automations', icon: 'Cpu' as const },
        { label: 'Config AUM', href: '/admin/settings/aum-advisors', icon: 'DollarSign' as const },
      ],
    },
    {
      title: LABELS.ANALYTICS,
      items: [
        { label: LABELS.ANALYTICS_APP, href: '/analytics', icon: 'TrendingUp' as const },
        { label: LABELS.PERFORMANCE, href: '/admin/performance', icon: 'Activity' as const },
        { label: LABELS.AUM, href: '/admin/aum', icon: 'PieChart' as const },
        { label: LABELS.BENCHMARKS, href: '/benchmarks', icon: 'Target' as const },
        { label: LABELS.METRICS_CONTACTS, href: '/contacts/metrics', icon: 'BarChart2' as const },
      ],
    },
  ];
}

/**
 * Construye secciones de sidebar para Owner (Dirección)
 * Estructura: Principal, Analíticas
 */
function getOwnerSections(): SidebarSection[] {
  return [
    {
      title: LABELS.MAIN,
      items: [{ label: 'Equipos', href: '/teams', icon: 'Team' as const }],
    },
    {
      title: LABELS.ANALYTICS,
      items: [
        { label: 'Analytics', href: '/analytics', icon: 'TrendingUp' as const },
        { label: 'Carteras', href: '/portfolios', icon: 'BarChart3' as const },
      ],
    },
  ];
}

/**
 * Construye secciones de sidebar para Staff (Administrativo)
 * Estructura: Principal, Plataformas, Recursos
 */
function getStaffSections(): SidebarSection[] {
  return [
    {
      title: LABELS.MAIN,
      items: [
        { label: LABELS.CONTACTS, href: '/contacts', icon: 'Contact' as const },
        { label: LABELS.PORTFOLIOS, href: '/portfolios', icon: 'Briefcase' as const },
        { label: LABELS.TEAMS, href: '/teams', icon: 'Team' as const },
      ],
    },
    {
      title: LABELS.PLATFORMS,
      items: [
        { label: 'Finviz', href: EXTERNAL_LINKS.FINVIZ, icon: 'BarChart3' as const },
        { label: 'Productores Balanz', href: EXTERNAL_LINKS.BALANZ, icon: 'Layout' as const },
        { label: 'Zurich Point', href: EXTERNAL_LINKS.ZURICH, icon: 'Shield' as const },
      ],
    },
    {
      title: LABELS.RESOURCES,
      items: [
        { label: LABELS.AUM, href: '/admin/aum', icon: 'PieChart' as const },
        { label: LABELS.TRAINING, href: '/capacitaciones', icon: 'GraduationCap' as const },
        { label: 'Recursos', href: '/resources', icon: 'FileText' as const },
      ],
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
  // AI_DECISION: Agregar delay para evitar condición de carrera con AuthContext
  // Justificación: El middleware ya validó el token, pero AuthContext puede tardar en verificar la sesión
  // Impacto: Evita redirecciones prematuras cuando el usuario está autenticado pero AuthContext aún está verificando
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[NavigationNew] useEffect ejecutado', {
      initialized,
      user: !!user,
      pathname,
      hasRedirected: hasRedirectedRef.current,
      timestamp: new Date().toISOString(),
    });

    // Limpiar timeout anterior si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Solo procesar si ya se inicializó
    if (!initialized) {
      console.log('[NavigationNew] Aún no inicializado, esperando...');
      return;
    }

    // Si estamos en rutas públicas de autenticación (login/register), no redirigir
    const isAuthRoute = pathname === '/login' || pathname === '/register';
    const isPublicRoute = isAuthRoute || pathname === '/';

    // AI_DECISION: Eliminar redirect redundante de rutas públicas
    // Justificación: El middleware ya maneja la redirección de usuarios autenticados desde rutas públicas
    // Impacto: Evita race conditions y loops de redirección en producción
    if (user) {
      console.log('[NavigationNew] Usuario autenticado, middleware maneja redirects');
      hasRedirectedRef.current = false;
      return;
    }

    // Si no hay usuario y estamos en rutas públicas, no hacer nada
    if (isPublicRoute) {
      console.log('[NavigationNew] Ruta pública sin usuario, no redirigir:', pathname);
      return;
    }

    console.log(
      '[NavigationNew] No hay usuario en ruta protegida, iniciando timeout de 1 segundo...'
    );

    // Si no hay usuario en ruta protegida, esperar un poco para dar tiempo a que AuthContext termine de verificar
    // El middleware ya validó el token, así que si no hay usuario después de este delay,
    // realmente no hay sesión activa
    timeoutRef.current = setTimeout(() => {
      console.log('[NavigationNew] Timeout completado, verificando usuario nuevamente', {
        user: !!user,
        hasRedirected: hasRedirectedRef.current,
        pathname,
      });

      // Verificar nuevamente el estado actual
      if (!hasRedirectedRef.current) {
        console.error(
          '[NavigationNew] REDIRIGIENDO A /LOGIN - No hay usuario después del timeout',
          {
            pathname,
            initialized,
            timestamp: new Date().toISOString(),
          }
        );
        hasRedirectedRef.current = true;
        // Usar replace en lugar de push para evitar problemas de historial
        router.replace('/login');
      } else {
        console.log('[NavigationNew] Usuario encontrado después del timeout, no redirigir');
      }
    }, 1000); // Esperar 1 segundo para dar tiempo a que AuthContext termine de verificar

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
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

  // AI_DECISION: Logo optimizado para responsive - mejor estrategia de breakpoints
  // Justificación: En pantallas muy pequeñas (<475px), solo mostrar el icono evita truncamiento
  // Impacto: Logo siempre se ve bien, adaptándose al espacio disponible
  const logo = (
    <div className="flex items-center gap-2 min-w-0">
      <Link
        href="/home"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
      >
        {/* Logo icon - always visible */}
        <span className="text-primary shrink-0" aria-hidden="true">
          <Feather className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.5} />
        </span>
        {/* Logo text - only visible on xs (475px) and up */}
        <span className="text-base sm:text-lg font-bold whitespace-nowrap shrink-0 hidden xs:inline">
          <span className="text-primary">Maat</span>
          <span className="text-secondary">Work</span>
        </span>
      </Link>
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
  // AI_DECISION: Agregar logs de debugging para identificar problemas de renderizado
  const sidebarSections: SidebarSection[] = (() => {
    let sections: SidebarSection[];
    switch (user.role) {
      case 'admin':
        sections = getAdminSections();
        break;
      case 'manager':
        sections = getManagerSections();
        break;
      case 'owner':
        sections = getOwnerSections();
        break;
      case 'staff':
        sections = getStaffSections();
        break;
      case 'advisor':
      default:
        sections = getAdvisorSections();
        break;
    }

    // Runtime debugging to identify if the correct sections are being rendered
    if (process.env.NODE_ENV === 'development') {
      console.log('[NavigationNew] Sidebar sections generated', {
        role: user.role,
        sectionCount: sections.length,
        titles: sections.map((s) => s.title),
        timestamp: new Date().toISOString(),
      });
    }
    return sections;
  })();

  return (
    <>
      {/* Header fijo con soporte para safe areas */}
      <div className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border/50 safe-area-top transition-colors duration-300">
        <Header
          logo={logo}
          navItems={navItems}
          user={headerUser}
          notificationComponent={
            <div className="flex items-center gap-2">
              <FeedbackButton />
              <NotificationBell />
            </div>
          }
          onLogout={handleLogout}
          onToggleSidebar={handleToggle}
          sidebarOpen={open}
          leftContent={
            // Career Progress Bar - only on larger screens, right next to logo
            <div className="hidden md:flex items-center min-w-0">
              <CareerProgressBar />
            </div>
          }
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

      {/* Mobile Bottom Bar - Only visible on mobile screens */}
      <MobileBottomBar onMenuClick={handleToggle} />
    </>
  );
}
