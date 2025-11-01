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
    { label: '📈 Finviz', href: 'https://finviz.com', icon: undefined },
    { label: '🏦 Productores Balanz', href: 'https://productores.balanz.com?forward=/home', icon: undefined },
    { label: '🛡️ Zurich Point', href: 'https://agentes.zurich.com.ar/AgentLoginOkta?ec=302&startURL=%2Fs%2F', icon: undefined },
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





