import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  BarChart3, 
  UserCheck, 
  User, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  Phone,
  TrendingUp,
  Settings,
  Bell,
  HelpCircle,
  Menu,
  X,
  Activity,
  Shield,
  PieChart,
  Target,
  FileText,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { usePermissions } from '../store/authStore';

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ expanded, onToggle }) => {
  const location = useLocation();
  const { isAdmin, canManageTeam } = usePermissions();

  const navigationItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'CRM', path: '/crm' },
    { icon: LinkIcon, label: 'Notion CRM', path: '/notion-crm' },
    { icon: UserCheck, label: 'Mi Equipo', path: '/team', requiresPermission: 'canManageTeam' },
    { icon: Shield, label: 'Panel Manager', path: '/manager/dashboard', requiresPermission: 'canManageTeam' },
    { icon: PieChart, label: 'Vista Equipo', path: '/manager/team-overview', requiresPermission: 'canManageTeam' },
    { icon: Target, label: 'Métricas Asesores', path: '/manager/advisor-metrics', requiresPermission: 'canManageTeam' },
    { icon: BarChart3, label: 'Comparación', path: '/manager/performance-comparison', requiresPermission: 'canManageTeam' },
    { icon: FileText, label: 'Contactos Equipo', path: '/manager/team-contacts', requiresPermission: 'canManageTeam' },
    { icon: Settings, label: 'Admin Panel', path: '/admin', requiresPermission: 'isAdmin' },
    { icon: User, label: 'Perfil', path: '/profile' },
  ];

  const externalLinks = [
    {
      icon: Phone,
      label: 'Zurich Point',
      url: 'https://agentes.zurich.com.ar',
      color: 'text-cactus-600 hover:text-cactus-700'
    },
    {
      icon: TrendingUp,
      label: 'Balanz Productores',
      url: 'https://productores.balanz.com',
      color: 'text-cactus-700 hover:text-cactus-800'
    }
  ];

  const handleExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={cn(
      "bg-primary border-r border-border-primary transition-all duration-300 ease-in-out flex flex-col shadow-lg backdrop-blur-sm",
      expanded ? "w-60" : "w-16"
    )}>
      {/* Header minimalista */}
      <div className="p-6 border-b border-border-primary">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center space-x-3", !expanded && "justify-center")}>
            <div className="flex items-center justify-center w-10 h-10 bg-cactus-500 rounded-xl shadow-md animate-bounce-gentle">
              <Activity className="w-6 h-6 text-white" />
            </div>
            {expanded && (
              <div className="animate-fade-in-up">
                <h1 className="text-lg font-bold text-primary font-cactus">CRM Cactus</h1>
                <p className="text-xs text-secondary">Dashboard</p>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="p-2 rounded-xl hover:bg-soft transition-all duration-200 text-secondary hover:text-primary"
          >
            {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 p-6 space-y-3">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          // Verificar permisos
          if (item.requiresPermission) {
            if (item.requiresPermission === 'canManageTeam' && !canManageTeam) return null;
            if (item.requiresPermission === 'isAdmin' && !isAdmin) return null;
          }
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center space-x-4 p-3 rounded-xl transition-all duration-300 group hover:scale-[1.02]",
                isActive 
                  ? "bg-cactus-100 text-cactus-700 shadow-md border border-cactus-200" 
                  : "hover:bg-soft text-secondary hover:text-primary",
                !expanded && "justify-center"
              )}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cactus-50 shadow-sm">
                <Icon size={18} className="flex-shrink-0 text-cactus-600" />
              </div>
              {expanded && (
                <span className="font-medium font-cactus">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Enlaces externos */}
      <div className="p-6 border-t border-border-primary space-y-3">
        {expanded && (
          <h3 className="text-sm font-semibold text-secondary mb-4 font-cactus">Enlaces Externos</h3>
        )}
        {externalLinks.map((link) => {
          const Icon = link.icon;
          
          return (
            <button
              key={link.label}
              onClick={() => handleExternalLink(link.url)}
              className={cn(
                "w-full flex items-center space-x-4 p-3 rounded-xl transition-all duration-300 group hover:scale-[1.02]",
                "bg-soft border border-border-primary hover:shadow-md text-secondary hover:text-primary",
                !expanded && "justify-center"
              )}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cactus-50 shadow-sm">
                <Icon size={16} className="flex-shrink-0 text-cactus-600" />
              </div>
              {expanded && (
                <>
                  <span className="font-medium flex-1 text-left font-cactus">{link.label}</span>
                  <ExternalLink size={14} className="text-disabled" />
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer minimalista */}
      <div className="p-6 border-t border-border-primary">
        <div className={cn("flex items-center justify-center space-x-2", expanded && "justify-start")}>
          <div className="flex items-center justify-center w-6 h-6 bg-cactus-500 rounded-full animate-pulse">
            <Activity className="w-3 h-3 text-white" />
          </div>
          {expanded && (
            <>
              <div className="flex items-center justify-center w-5 h-5 bg-cactus-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}>
                <Bell className="w-2.5 h-2.5 text-white" />
              </div>
              <div className="flex items-center justify-center w-5 h-5 bg-cactus-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}>
                <Settings className="w-2.5 h-2.5 text-white" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;