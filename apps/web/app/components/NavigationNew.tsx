"use client";
import { useAuth } from '../auth/AuthContext';
import { useRouter } from 'next/navigation';
import { Header, type NavItem, type User } from '@cactus/ui';

export default function NavigationNew() {
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
    { label: 'Contactos', href: '/contacts', icon: 'Users' },
    { label: 'Pipeline', href: '/pipeline', icon: 'BarChart3' },
  ];

  // Add role-based navigation items
  if (user.role === 'admin') {
    navItems.push({ label: 'Administración', href: '/admin/users', icon: 'Settings' });
    navItems.push({ label: 'Equipos', href: '/teams', icon: 'Users' });
  } else if (user.role === 'manager') {
    navItems.push({ label: 'Mi Equipo', href: '/teams', icon: 'Users' });
  }

  const headerUser: User = {
    name: user.fullName || user.email,
    email: user.email,
    role: user.role === 'admin' ? '👑 Administrador' : 
          user.role === 'manager' ? '👨‍💼 Manager' : 
          '👤 Asesor',
  };

  return (
    <Header
      logo={logo}
      navItems={navItems}
      user={headerUser}
      onLogout={handleLogout}
    />
  );
}





