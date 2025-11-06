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

  return (
    <Header
      logo={logo}
      navItems={navItems}
      user={headerUser}
      onLogout={handleLogout}
    />
  );
}





