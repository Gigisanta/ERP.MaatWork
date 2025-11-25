"use client";
import { useAuth } from '../auth/AuthContext';
import { useRouter } from 'next/navigation';
import { Header, type NavItem, type User, Drawer, Sidebar } from '@cactus/ui';
import { useState } from 'react';

interface NavigationNewProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export default function NavigationNew({ onToggleSidebar, sidebarOpen }: NavigationNewProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = sidebarOpen ?? internalOpen;
  const setOpen = onToggleSidebar ? () => onToggleSidebar() : () => setInternalOpen((v) => !v);
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  const logo = (
    <div className="flex items-center gap-2">
      <span className="text-2xl">🌵</span>
      <span className="text-xl font-bold text-primary">CACTUS CRM</span>
    </div>
  );

  const navItems: NavItem[] = [
    { label: 'Inicio', href: '/', icon: 'Home' },
    { label: '📚 Capacitaciones', href: '/capacitaciones' },
    { label: '📈 Finviz', href: 'https://finviz.com' },
    { label: '🏦 Productores Balanz', href: 'https://productores.balanz.com?forward=/home' },
    { label: '🛡️ Zurich Point', href: 'https://agentes.zurich.com.ar/AgentLoginOkta?ec=302&startURL=%2Fs%2F' },
  ];

  const headerUser: User = {
    name: user.fullName || user.email,
    email: user.email,
    role: user.role === 'admin' ? '👑 Administrador' : 
          user.role === 'manager' ? '👨‍💼 Manager' : 
          '👤 Asesor',
  };

  const sections = [
    {
      title: 'General',
      items: [
        { label: 'Inicio', href: '/', icon: 'Home' as const },
        { label: 'Contactos', href: '/contacts', icon: 'Users' as const },
        { label: 'Métricas', href: '/contacts/metrics', icon: 'BarChart2' as const },
      ],
    },
  ];

  return (
    <>
      <Header
        logo={logo}
        navItems={navItems}
        user={headerUser}
        onLogout={handleLogout}
        onToggleSidebar={() => setOpen()}
        sidebarOpen={open}
      />
      <Drawer open={open} onOpenChange={(o) => (sidebarOpen === undefined ? setInternalOpen(o) : onToggleSidebar?.())} side="left">
        <Sidebar sections={sections} isOpen={open} onOpenChange={(o) => (sidebarOpen === undefined ? setInternalOpen(o) : onToggleSidebar?.())} />
      </Drawer>
    </>
  );
}





