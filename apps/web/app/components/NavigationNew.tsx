"use client";
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

// Custom Link component that handles both internal and external links
const CustomLink = React.forwardRef<HTMLAnchorElement, { 
  href: string; 
  className?: string; 
  'aria-current'?: 'page' | undefined; 
  title?: string;
  children: React.ReactNode;
}>(({ 
  href, 
  className, 
  'aria-current': ariaCurrent, 
  title,
  children 
}, ref) => {
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
  
  // For internal links, wrap Link in a span to handle ref properly
  // Next.js Link doesn't always forward ref correctly in all versions
  return (
    <Link
      href={href}
      className={className}
      aria-current={ariaCurrent}
      title={title}
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
    role: user.role === 'admin' ? '👑 Administrador' : 
          user.role === 'manager' ? '👨‍💼 Manager' : 
          '👤 Asesor',
  };

  // Sidebar sections organized as specified
  const sidebarSections: SidebarSection[] = [
    {
      title: 'Principal',
      items: [
        { label: 'Inicio', href: '/', icon: 'Home' as const },
        { label: 'Contactos', href: '/contacts', icon: 'Users' as const },
        { label: 'Carteras', href: '/portfolios', icon: 'BarChart3' as const },
        { label: 'Equipos', href: '/teams', icon: 'Users' as const },
      ],
    },
    {
      title: 'Herramientas',
      items: [
        { label: 'Capacitaciones', href: '/capacitaciones', icon: 'Book' as const },
        { label: 'Finviz', href: 'https://finviz.com', icon: 'ExternalLink' as const },
        { label: 'Productores Balanz', href: 'https://productores.balanz.com?forward=/home', icon: 'ExternalLink' as const },
        { label: 'Zurich Point', href: 'https://agentes.zurich.com.ar/AgentLoginOkta?ec=302&startURL=%2Fs%2F', icon: 'ExternalLink' as const },
      ],
    },
  ];

  // Add Administration section only for admin/manager
  if (user.role === 'admin' || user.role === 'manager') {
    sidebarSections.push({
      title: 'Administración',
      items: [
        { label: 'Administración', href: '/admin', icon: 'Settings' as const },
      ],
    });
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
          defaultCollapsed={true}
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
          onOpenChange={(o) => (sidebarOpen === undefined ? setInternalOpen(o) : onToggleSidebar?.())}
          LinkComponent={CustomLink}
          className="h-full"
        />
      </Drawer>
    </>
  );
}





