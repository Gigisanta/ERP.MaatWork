import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../lib/utils';
// Removed LayoutConfig import - using semantic Tailwind classes

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  const location = useLocation();
  
  // Auto-generate breadcrumbs from current path if items not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', path: '/dashboard', icon: Home }
    ];

    let currentPath = '';
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip if it's the dashboard segment (already added)
      if (segment === 'dashboard') return;
      
      // Map common segments to user-friendly labels
      const segmentLabels: Record<string, string> = {
        'crm': 'CRM',
        'team': 'Mi Equipo',
        'manager': 'Manager',
        'admin': 'Administración',
        'profile': 'Perfil',
        'approvals': 'Aprobaciones',
        'invitations': 'Invitaciones',
        'tasks': 'Tareas',
        'metrics': 'Métricas',
        'settings': 'Configuración',
        'advisor': 'Asesor',
        'team-overview': 'Vista de Equipo',
        'advisor-metrics': 'Métricas de Asesores',
        'performance-comparison': 'Comparación de Rendimiento',
        'team-contacts': 'Contactos del Equipo'
      };
      
      const label = segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Don't add path for the last segment (current page)
      const isLastSegment = index === pathSegments.length - 1;
      
      breadcrumbs.push({
        label,
        path: isLastSegment ? undefined : currentPath
      });
    });
    
    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();
  
  // Don't show breadcrumbs if there's only one item (just dashboard)
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className={cn('flex items-center space-x-2 text-sm', className)} aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        const Icon = item.icon;
        
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
            )}
            
            <div className="flex items-center space-x-1">
              {Icon && (
                <Icon className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
              )}
              
              {item.path && !isLast ? (
                <Link
                  to={item.path}
                  className={cn(
                    'text-neutral-600 dark:text-neutral-400 hover:text-cactus-600 dark:hover:text-cactus-400',
                    'transition-colors duration-200 hover:underline font-medium'
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(
                  isLast 
                    ? "text-neutral-900 dark:text-neutral-100 font-semibold" 
                    : 'text-neutral-600 dark:text-neutral-400'
                )}>
                  {item.label}
                </span>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;

// Enhanced breadcrumb component with additional features
export const EnhancedBreadcrumbs: React.FC<BreadcrumbsProps & {
  showHome?: boolean;
  maxItems?: number;
  separator?: React.ReactNode;
}> = ({ 
  items, 
  className, 
  showHome = true, 
  maxItems = 5,
  separator 
}) => {
  const location = useLocation();
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    
    if (showHome) {
      breadcrumbs.push({ label: 'Inicio', path: '/dashboard', icon: Home });
    }

    let currentPath = '';
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      if (segment === 'dashboard' && showHome) return;
      
      const segmentLabels: Record<string, string> = {
        'crm': 'CRM',
        'team': 'Mi Equipo',
        'manager': 'Manager',
        'admin': 'Administración',
        'profile': 'Perfil',
        'approvals': 'Aprobaciones',
        'invitations': 'Invitaciones',
        'tasks': 'Tareas',
        'metrics': 'Métricas',
        'settings': 'Configuración',
        'advisor': 'Asesor',
        'team-overview': 'Vista de Equipo',
        'advisor-metrics': 'Métricas de Asesores',
        'performance-comparison': 'Comparación de Rendimiento',
        'team-contacts': 'Contactos del Equipo'
      };
      
      const label = segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      const isLastSegment = index === pathSegments.length - 1;
      
      breadcrumbs.push({
        label,
        path: isLastSegment ? undefined : currentPath
      });
    });
    
    return breadcrumbs;
  };

  let breadcrumbItems = items || generateBreadcrumbs();
  
  // Truncate if too many items
  if (breadcrumbItems.length > maxItems) {
    const firstItems = breadcrumbItems.slice(0, 1);
    const lastItems = breadcrumbItems.slice(-2);
    breadcrumbItems = [
      ...firstItems,
      { label: '...', path: undefined },
      ...lastItems
    ];
  }
  
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  const defaultSeparator = <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />;

  return (
    <nav className={cn(
      'flex items-center space-x-1.5 text-xs bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-md px-2 py-1 border border-cactus-300 dark:border-cactus-600 shadow-sm',
      className
    )} aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        const Icon = item.icon;
        
        return (
          <React.Fragment key={index}>
            {index > 0 && (separator || defaultSeparator)}
            
            <div className="flex items-center space-x-1">
              {Icon && (
                <Icon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              )}
              
              {item.path && !isLast ? (
                <Link
                  to={item.path}
                  className={cn(
                    'text-neutral-600 dark:text-neutral-400 hover:text-cactus-600 dark:hover:text-cactus-400',
                    "transition-colors duration-200 hover:underline font-medium px-1.5 py-0.5 rounded hover:bg-cactus-100 dark:hover:bg-cactus-900/20"
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(
                  'px-1.5 py-0.5 rounded',
                  isLast 
                    ? "text-neutral-900 dark:text-neutral-100 font-semibold bg-cactus-100 dark:bg-cactus-900/20" 
                    : 'text-neutral-600 dark:text-neutral-400'
                )}>
                  {item.label}
                </span>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// Hook to get current breadcrumb data
export const useBreadcrumbs = () => {
  const location = useLocation();
  
  const getCurrentPageTitle = (): string => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    const pageTitles: Record<string, string> = {
      'dashboard': 'Dashboard',
      'crm': 'CRM',
      'team': 'Mi Equipo',
      'manager': 'Panel de Manager',
      'admin': 'Panel de Administración',
      'profile': 'Mi Perfil',
      'approvals': 'Aprobaciones',
      'invitations': 'Invitaciones',
      'tasks': 'Tareas',
      'metrics': 'Métricas',
      'settings': 'Configuración',
      'team-overview': 'Vista de Equipo',
      'advisor-metrics': 'Métricas de Asesores',
      'performance-comparison': 'Comparación de Rendimiento',
      'team-contacts': 'Contactos del Equipo'
    };
    
    return pageTitles[lastSegment] || 'Página';
  };
  
  return {
    currentPageTitle: getCurrentPageTitle(),
    currentPath: location.pathname
  };
};