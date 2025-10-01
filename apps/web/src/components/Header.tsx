import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, User, LogOut, ChevronDown, RefreshCw, Menu } from 'lucide-react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { useAuthStore, useCurrentUser } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useNotificationStore } from '../store/notificationStore';

interface HeaderProps {
  onMenuClick: () => void;
  pageTitle?: string;
  pageDescription?: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, pageTitle, pageDescription }) => {
  const user = useCurrentUser();
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();
  const [mostrarMenuUsuario, setMostrarMenuUsuario] = useState(false);
  const [tiempoActual, setTiempoActual] = useState(new Date());
  const [posicionMenu, setPosicionMenu] = useState({ top: 0, left: 0 });
  const { refreshDashboard, isRefreshing, lastUpdated } = useDashboardStore();
  const { notifications, markAsRead } = useNotificationStore();
  // Calcular notificaciones no leídas del store real
  const notificacionesNoLeidas = notifications.filter(n => !n.read_at).length;
  const menuRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  
  const userName = user?.name || 'Usuario';
  
  useEffect(() => {
    const timer = setInterval(() => setTiempoActual(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const manejarClicFuera = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        botonRef.current &&
        !botonRef.current.contains(event.target as Node)
      ) {
        setMostrarMenuUsuario(false);
      }
    };

    if (mostrarMenuUsuario) {
      document.addEventListener('mousedown', manejarClicFuera);
    }

    return () => {
      document.removeEventListener('mousedown', manejarClicFuera);
    };
  }, [mostrarMenuUsuario]);

  const manejarToggleMenuUsuario = () => {
    if (!mostrarMenuUsuario && botonRef.current) {
      const rect = botonRef.current.getBoundingClientRect();
      setPosicionMenu({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    setMostrarMenuUsuario(!mostrarMenuUsuario);
  };

  const manejarCerrarSesion = () => {
    logout();
    setMostrarMenuUsuario(false);
    navigate('/login', { replace: true });
  };

  const manejarClicPerfil = () => {
    setMostrarMenuUsuario(false);
    // Navegar al perfil
  };

  const manejarClicConfiguracion = () => {
    setMostrarMenuUsuario(false);
    // Navegar a configuración
  };

  const manejarClicNotificaciones = () => {
    setMostrarMenuUsuario(false);
    // Marcar todas las notificaciones como leídas al hacer clic
    notifications.forEach(notification => {
      if (!notification.read_at) {
        markAsRead(notification.id);
      }
    });
    console.log('Mostrando notificaciones:', notifications);
  };

  return (
    <header className="bg-gradient-to-r from-white to-cactus-50/30 dark:from-neutral-900 dark:to-neutral-800 border-b border-cactus-200/50 dark:border-neutral-700 shadow-sm backdrop-blur-sm h-16">
      <div className="flex items-center justify-between px-8 h-full">
        {/* Lado izquierdo - Saludo de bienvenida */}
        <div className="flex items-center space-x-6">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl hover:bg-cactus-100/50 dark:hover:bg-neutral-800 transition-all duration-200 lg:hidden hover:scale-105 group"
          >
            <Menu size={18} className="text-cactus-600 dark:text-neutral-400 group-hover:text-cactus-700 transition-colors" />
          </button>
          
          {/* Título de página o saludo de bienvenida */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-cactus-500 to-oasis-500 rounded-xl shadow-md">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-transparent bg-gradient-to-r from-cactus-600 to-oasis-600 bg-clip-text font-cactus">
                {pageTitle || `Bienvenido, ${userName}`}
              </h1>
              <p className="text-xs text-cactus-700 dark:text-cactus-300">
                {pageDescription || tiempoActual.toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Lado derecho */}
        <div className="flex items-center space-x-4">
          {/* Usuario - Diseño moderno */}
          <div className="relative">
            <button
              ref={botonRef}
              onClick={manejarToggleMenuUsuario}
              className="flex items-center space-x-3 p-2 rounded-xl hover:bg-soft transition-all duration-200 hover:scale-[1.02]"
            >
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-md",
                user && user.name ? getAvatarColor(user.name) : "bg-cactus-500"
              )}>
                {user ? getInitials(user.name) : <User className="w-5 h-5" />}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-primary font-cactus">
                  {user?.name || 'Usuario'}
                </p>
                <p className="text-xs text-secondary capitalize">
                  {user?.role || 'Rol'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-disabled transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Menú desplegable usando Portal */}
            {mostrarMenuUsuario && createPortal(
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-[99998]" 
                  onClick={() => setMostrarMenuUsuario(false)}
                />
                {/* Menú */}
                <div 
                  ref={menuRef}
                  className="fixed w-64 bg-primary rounded-2xl shadow-xl border border-border-primary z-[99999] overflow-hidden"
                  style={{
                    top: `${posicionMenu.top}px`,
                    left: `${posicionMenu.left}px`
                  }}
                >
                  <div className="px-4 py-3 border-b border-border-primary">
                    <p className="text-sm font-medium text-primary font-cactus">{user?.name}</p>
                    <p className="text-xs text-secondary">{user?.email}</p>
                  </div>
                  <button
                    onClick={manejarClicNotificaciones}
                    className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-soft flex items-center space-x-3 transition-all duration-200 font-cactus relative"
                  >
                    <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-br from-cactus-100 to-cactus-200 rounded shadow-sm">
                      <Bell className="w-3 h-3 text-cactus-600" />
                    </div>
                    <span>Notificaciones</span>
                    {notificacionesNoLeidas > 0 && (
                      <span className="ml-auto bg-error text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {notificacionesNoLeidas}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={manejarClicPerfil}
                    className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-soft flex items-center space-x-3 transition-all duration-200 font-cactus"
                  >
                    <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-br from-cactus-100 to-cactus-200 rounded shadow-sm">
                      <User className="w-3 h-3 text-cactus-600" />
                    </div>
                    <span>Mi Perfil</span>
                  </button>
                  <button
                    onClick={manejarClicConfiguracion}
                    className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-soft flex items-center space-x-3 transition-all duration-200 font-cactus"
                  >
                    <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-br from-cactus-100 to-cactus-200 rounded shadow-sm">
                      <Settings className="w-3 h-3 text-cactus-600" />
                    </div>
                    <span>Configuración</span>
                  </button>
                  <hr className="border-border-primary my-1" />
                  <button
                    onClick={manejarCerrarSesion}
                    className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error-soft flex items-center space-x-3 transition-all duration-200 font-cactus"
                  >
                    <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-br from-error-soft to-error-hover rounded shadow-sm">
                      <LogOut className="w-3 h-3 text-error" />
                    </div>
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </>,
              document.body
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;