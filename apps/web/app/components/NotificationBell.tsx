'use client';

import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Bell, Check, Clock, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@cactus/ui';
import { notificationKeys, markAsRead, markAllAsRead } from '@/lib/api/notifications';
import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
} from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { mutate } = useSWRConfig();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch unread count
  const { data: unreadCountData } = useSWR<{ success: boolean; data: UnreadCountResponse }>(
    notificationKeys.unreadCount,
    { refreshInterval: 60000 } // Check every minute
  );

  // Fetch notifications list only when open or to prefetch
  const { data: notificationsData, isLoading } = useSWR<{
    success: boolean;
    data: NotificationListResponse;
  }>(isOpen ? notificationKeys.all(20) : null);

  const unreadCount = unreadCountData?.data?.count || 0;
  const notifications = notificationsData?.data?.items || [];

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAsRead(id);
      mutate(notificationKeys.unreadCount);
      mutate(notificationKeys.all(20));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      mutate(notificationKeys.unreadCount);
      mutate(notificationKeys.all(20));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-error" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'success':
        return <Check className="w-4 h-4 text-success" />;
      default:
        return <Info className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'relative p-2 rounded-full text-text-secondary hover:text-text hover:bg-primary-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
            className
          )}
          aria-label="Notificaciones"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface animate-pulse" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'z-50 min-w-[320px] max-w-[360px] bg-surface rounded-xl border border-border shadow-xl',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 duration-200'
          )}
          align="end"
          sideOffset={8}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
              >
                Marcar todo leído
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 bg-border/40 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-border/40 rounded w-3/4" />
                      <div className="h-2 bg-border/40 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                <Bell className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map((notification) => (
                  <DropdownMenu.Item
                    key={notification.id}
                    className={cn(
                      'flex gap-3 p-4 hover:bg-surface-subtle focus:bg-surface-subtle outline-none cursor-default transition-colors',
                      !notification.readAt && 'bg-primary-subtle/30'
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {getSeverityIcon(notification.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm text-text leading-snug',
                          !notification.readAt && 'font-medium'
                        )}
                      >
                        {notification.renderedBody}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                    </div>
                    {!notification.readAt && (
                      <button
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="self-start mt-0.5 p-1 text-primary hover:bg-primary-subtle rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Marcar como leída"
                      >
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      </button>
                    )}
                  </DropdownMenu.Item>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-border bg-surface-subtle/50 rounded-b-xl">
            <a
              href="/notifications"
              className="block w-full py-1.5 text-xs text-center text-text-secondary hover:text-primary transition-colors font-medium"
            >
              Ver todas las notificaciones
            </a>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
