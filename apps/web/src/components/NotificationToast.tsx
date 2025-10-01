import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { Notification } from '../types/metrics';
import { cn } from '../lib/utils';
// Removed LayoutConfig import - using semantic Tailwind classes

const NotificationToast: React.FC = () => {
  const { notifications, markNotificationAsRead } = useDashboardStore();
  const unreadNotifications = notifications.filter(n => !n.read);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />;
    }
  };

  const getBackgroundColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700';
      case 'info':
      default:
        return 'bg-cactus-50 dark:bg-cactus-900/20 border-cactus-200 dark:border-cactus-700';
    }
  };

  const handleClose = (id: string) => {
    markNotificationAsRead(id);
  };

  if (unreadNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {unreadNotifications.slice(0, 5).map((notification) => (
        <div
          key={notification.id}
          className={cn(
            "p-4 rounded-lg border shadow-lg animate-in slide-in-from-right-full duration-300",
            getBackgroundColor(notification.type)
          )}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {notification.title}
              </h4>
              <p className="text-sm text-neutral-800 dark:text-neutral-200 mt-1">
                {notification.message}
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => handleClose(notification.id)}
              className="flex-shrink-0 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;