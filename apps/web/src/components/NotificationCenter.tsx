import React, { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Filter, Trash2, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { useNotificationStore, useFilteredNotifications, useUnreadCount } from '../store/notificationStore';
import type { NotificationFilter } from '../store/notificationStore';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    isLoading,
    filter,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    setFilter
  } = useNotificationStore();
  
  const filteredNotifications = useFilteredNotifications();
  const unreadCount = useUnreadCount();
  
  const [showFilters, setShowFilters] = useState(false);
  const [localFilter, setLocalFilter] = useState<NotificationFilter>(filter);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleFilterChange = (newFilter: NotificationFilter) => {
    setLocalFilter(newFilter);
    setFilter(newFilter);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval_request':
        return <AlertCircle className="w-5 h-5 text-sunlight-600" />;
      case 'approval_approved':
        return <CheckCircle className="w-5 h-5 text-pear-600" />;
      case 'approval_rejected':
        return <XCircle className="w-5 h-5 text-error" />;
      case 'system':
        return <Info className="w-5 h-5 text-cactus-600" />;
      default:
        return <Bell className="w-5 h-5 text-muted" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-error';
      case 'medium':
        return 'border-l-sunlight-500';
      case 'low':
        return 'border-l-pear-500';
      default:
        return 'border-l-border-primary';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-muted" />
            <h2 className="text-lg font-semibold text-primary">Notificaciones</h2>
            {unreadCount > 0 && (
              <span className="bg-error text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 bg-secondary border-b border-border-primary">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-muted hover:bg-neutral-100 rounded-md transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-cactus-600 hover:bg-cactus-50 rounded-md transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Marcar todas</span>
              </button>
            )}
            
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-error hover:bg-error-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 bg-secondary border-b border-border-primary space-y-3">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Tipo
              </label>
              <select
                value={localFilter.type || ''}
                onChange={(e) => handleFilterChange({ ...localFilter, type: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-border-primary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cactus-500"
              >
                <option value="">Todos los tipos</option>
                <option value="approval_request">Solicitudes de aprobación</option>
                <option value="approval_approved">Aprobaciones</option>
                <option value="approval_rejected">Rechazos</option>
                <option value="system">Sistema</option>
                <option value="task_assigned">Tareas asignadas</option>
                <option value="task_completed">Tareas completadas</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Prioridad
              </label>
              <select
                value={localFilter.priority || ''}
                onChange={(e) => handleFilterChange({ ...localFilter, priority: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-border-primary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cactus-500"
              >
                <option value="">Todas las prioridades</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="unreadOnly"
                checked={localFilter.unreadOnly || false}
                onChange={(e) => handleFilterChange({ ...localFilter, unreadOnly: e.target.checked || undefined })}
                className="mr-2 h-4 w-4 text-cactus-600 focus:ring-cactus-500 border border-border-primary rounded"
              />
              <label htmlFor="unreadOnly" className="text-sm text-primary">
                Solo no leídas
              </label>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cactus-600"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-muted">
              <Bell className="w-12 h-12 mb-4 text-neutral-300" />
              <p className="text-center">
                {notifications.length === 0 
                  ? 'No tienes notificaciones' 
                  : 'No hay notificaciones que coincidan con los filtros'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-primary">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-neutral-50 transition-colors border-l-4 ${
                    getPriorityColor(notification.priority)
                  } ${
                    !notification.read_at ? 'bg-cactus-50' : 'bg-primary'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            !notification.read_at ? 'text-primary' : 'text-secondary'
                          }`}>
                            {notification.title}
                          </p>
                          <p className={`text-sm mt-1 ${
                            !notification.read_at ? 'text-secondary' : 'text-muted'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted mt-2">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.read_at && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 hover:bg-neutral-100 rounded-full transition-colors"
                              title="Marcar como leída"
                            >
                              <Check className="w-4 h-4 text-muted" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 hover:bg-neutral-100 rounded-full transition-colors"
                            title="Eliminar notificación"
                          >
                            <X className="w-4 h-4 text-muted" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;