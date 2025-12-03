'use client';
import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Header, type NavItem, type User, Drawer, Sidebar, type SidebarSection } from '@cactus/ui';
import { useState, useEffect } from 'react';
import { useSidebar } from './SidebarContext';
import CareerProgressBar from './CareerProgressBar';

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
  '/plandecarrera',
  '/profile',
  '/contacts/metrics/history',
  '/contacts/[id]/tags',
];

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

export default function NavigationNew({ onToggleSidebar, sidebarOpen }: NavigationNewProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useSidebar();
  const open = sidebarOpen ?? internalOpen;
  const setOpen = onToggleSidebar ? () => onToggleSidebar() : () => setInternalOpen((v) => !v);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Close drawer on navigation (mobile)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && open) {
      // Close drawer when pathname changes (mobile only)
      setInternalOpen(false);
      onToggleSidebar?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // Only depend on pathname to close on navigation

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  const logo = (
    <div className="flex items-center gap-2 min-w-0 w-full">
      <span className="text-2xl shrink-0">🌵</span>
      <span className="text-xl font-bold text-primary whitespace-nowrap shrink-0">CACTUS CRM</span>
      {/* Career Progress Bar integrado directamente después del logo */}
      {user && (
        <div className="hidden sm:flex items-center min-w-0 flex-1">
          <CareerProgressBar />
        </div>
      )}
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

  // AI_DECISION: Sidebar sections diferenciadas por rol
  // Owner: solo métricas de negocio, sin contactos
  // Staff: acceso operativo amplio (contactos, carteras, equipos) pero sin admin de usuarios
  // Admin: acceso total incluyendo administración
  let sidebarSections: SidebarSection[];

  if (user.role === 'owner') {
    // Navegación específica para Owner - solo métricas y visión de negocio
    sidebarSections = [
      {
        title: 'Dashboard',
        items: [
          { label: 'Inicio', href: '/home', icon: 'Home' as const },
          { label: 'Equipos', href: '/teams', icon: 'Team' as const },
        ],
      },
      {
        title: 'Métricas',
        items: [
          { label: 'Analytics', href: '/analytics', icon: 'TrendingUp' as const },
          { label: 'Carteras', href: '/portfolios', icon: 'BarChart3' as const },
        ],
      },
    ];
  } else if (user.role === 'staff') {
    // Navegación para Staff (Administrativo) - acceso operativo sin admin de usuarios
    sidebarSections = [
      {
        title: 'Principal',
        items: [
          { label: 'Inicio', href: '/home', icon: 'Home' as const },
          { label: 'Contactos', href: '/contacts', icon: 'Contact' as const },
          { label: 'Carteras', href: '/portfolios', icon: 'BarChart3' as const },
          { label: 'Equipos', href: '/teams', icon: 'Team' as const },
        ],
      },
      {
        title: 'Herramientas',
        items: [
          { label: 'Capacitaciones', href: '/capacitaciones', icon: 'GraduationCap' as const },
          { label: 'Finviz', href: 'https://finviz.com', icon: 'TrendingUp' as const },
          {
            label: 'Productores Balanz',
            href: 'https://productores.balanz.com?forward=/home',
            icon: 'Briefcase' as const,
          },
          {
            label: 'Zurich Point',
            href: 'https://agentes.zurich.com.ar/AgentLoginOkta?ec=302&startURL=%2Fs%2F',
            icon: 'Shield' as const,
          },
        ],
      },
      {
        title: 'Gestión',
        items: [{ label: 'AUM', href: '/admin/aum', icon: 'BarChart2' as const }],
      },
    ];
  } else {
    // Navegación estándar para advisor/manager/admin
    sidebarSections = [
      {
        title: 'Principal',
        items: [
          { label: 'Inicio', href: '/home', icon: 'Home' as const },
          { label: 'Contactos', href: '/contacts', icon: 'Contact' as const },
          { label: 'Carteras', href: '/portfolios', icon: 'BarChart3' as const },
          { label: 'Equipos', href: '/teams', icon: 'Team' as const },
        ],
      },
      {
        title: 'Herramientas',
        items: [
          { label: 'Capacitaciones', href: '/capacitaciones', icon: 'GraduationCap' as const },
          { label: 'Finviz', href: 'https://finviz.com', icon: 'TrendingUp' as const },
          {
            label: 'Productores Balanz',
            href: 'https://productores.balanz.com?forward=/home',
            icon: 'Briefcase' as const,
          },
          {
            label: 'Zurich Point',
            href: 'https://agentes.zurich.com.ar/AgentLoginOkta?ec=302&startURL=%2Fs%2F',
            icon: 'Shield' as const,
          },
        ],
      },
    ];

    // Add Administration section only for admin/manager (NOT staff)
    if (user.role === 'admin' || user.role === 'manager') {
      // Expandir herramientas para admin con todas las funcionalidades
      if (user.role === 'admin') {
        sidebarSections[1].items.push(
          { label: 'Automations', href: '/automations', icon: 'Settings' as const },
          { label: 'Pipeline', href: '/pipeline', icon: 'list' as const },
          { label: 'Plan de Carrera', href: '/plandecarrera', icon: 'Book' as const },
          { label: 'Notificaciones', href: '/notifications', icon: 'Info' as const }
        );
      }

      // Agregar sección de Métricas para admin
      if (user.role === 'admin') {
        sidebarSections.splice(2, 0, {
          title: 'Métricas',
          items: [
            {
              label: 'Métricas de Contactos',
              href: '/contacts/metrics',
              icon: 'BarChart2' as const,
            },
            { label: 'Analytics', href: '/analytics', icon: 'TrendingUp' as const },
            { label: 'Benchmarks', href: '/benchmarks', icon: 'BarChart3' as const },
          ],
        });
      }

      // Expandir sección de Administración con todas las subsecciones
      if (user.role === 'admin') {
        sidebarSections.push({
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
        });
      } else {
        // Manager solo tiene acceso básico a administración
        sidebarSections.push({
          title: 'Administración',
          items: [{ label: 'Administración', href: '/admin', icon: 'Settings' as const }],
        });
      }

      // Agregar sección de Perfil para admin
      if (user.role === 'admin') {
        sidebarSections.push({
          title: 'Perfil',
          items: [{ label: 'Mi Perfil', href: '/profile', icon: 'User' as const }],
        });
      }
    }
  }

  return (
    <>
      <div className="sticky top-0 z-40 bg-surface border-b border-border">
        <Header
          logo={logo}
          navItems={navItems}
          user={headerUser}
          onLogout={handleLogout}
          onToggleSidebar={() => setOpen()}
          sidebarOpen={open}
        />
      </div>

      {/* Desktop Sidebar - Expandable */}
      {/* Altura ajustada solo para header (3rem) */}
      <aside className="hidden lg:flex fixed left-0 top-[3rem] h-[calc(100vh-3rem)] z-30">
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

      {/* Mobile Drawer */}
      <Drawer
        open={open}
        onOpenChange={(o) => (sidebarOpen === undefined ? setInternalOpen(o) : onToggleSidebar?.())}
        side="left"
      >
        <Sidebar
          sections={sidebarSections}
          logo={null}
          currentPath={pathname || ''}
          isOpen={open}
          onOpenChange={(o) =>
            sidebarOpen === undefined ? setInternalOpen(o) : onToggleSidebar?.()
          }
          LinkComponent={CustomLink}
          className="h-full"
        />
      </Drawer>
    </>
  );
}
