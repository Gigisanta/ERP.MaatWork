'use client';

import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import {
  Bell,
  Check,
  Clock,
  AlertTriangle,
  Info,
  AlertCircle,
  Filter,
  CheckCircle,
  Search,
} from 'lucide-react';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Text,
  Icon,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  cn,
} from '@cactus/ui';
import { notificationKeys, markAsRead, markAllAsRead } from '@/lib/api/notifications';
import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
} from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NotificationsClient() {
  const { mutate } = useSWRConfig();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(0);
  const limit = 50;

  // Query construction
  const queryKey = `/notifications?limit=${limit}&offset=${page * limit}${filter === 'unread' ? '&unreadOnly=true' : ''}`;

  const { data, isLoading } = useSWR<{ success: boolean; data: NotificationListResponse }>(
    queryKey,
    { refreshInterval: 30000 }
  );

  const notifications = data?.data?.items || [];
  const total = data?.data?.meta?.total || 0;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAsRead(id);
      mutate(queryKey);
      mutate(notificationKeys.unreadCount);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      mutate(queryKey);
      mutate(notificationKeys.unreadCount);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-error" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-error-subtle';
      case 'warning':
        return 'bg-warning-subtle';
      case 'success':
        return 'bg-success-subtle';
      default:
        return 'bg-primary-subtle';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Tabs
            value={filter}
            onValueChange={(v) => {
              setFilter(v as 'all' | 'unread');
              setPage(0);
            }}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid w-full grid-cols-2 sm:w-[300px]">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="unread">No leídas</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={isLoading || notifications.length === 0}
            className="w-full sm:w-auto"
          >
            <Check className="w-4 h-4 mr-2" />
            Marcar todas como leídas
          </Button>
        </div>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 flex gap-4">
                <div className="w-10 h-10 rounded-full bg-border/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-border/50 rounded w-1/4" />
                  <div className="h-3 bg-border/50 rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-surface-subtle w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-text-muted" />
            </div>
            <Text size="lg" weight="medium">
              No hay notificaciones
            </Text>
            <Text color="muted" className="mt-1">
              {filter === 'unread'
                ? '¡Estás al día! No tienes notificaciones pendientes.'
                : 'No tienes notificaciones en tu historial.'}
            </Text>
          </div>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                'transition-all duration-200 hover:shadow-md',
                !notification.readAt
                  ? 'border-primary/30 bg-primary-subtle/10'
                  : 'opacity-80 hover:opacity-100'
              )}
            >
              <CardContent className="p-4 sm:p-5 flex gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    getSeverityBg(notification.severity)
                  )}
                >
                  {getSeverityIcon(notification.severity)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {notification.renderedSubject && (
                        <Text weight="semibold" className="mb-0.5">
                          {notification.renderedSubject}
                        </Text>
                      )}
                      <Text
                        className={cn(
                          'leading-relaxed',
                          !notification.readAt && 'font-medium text-text'
                        )}
                      >
                        {notification.renderedBody}
                      </Text>
                    </div>

                    {!notification.readAt && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="shrink-0 h-8 w-8 p-0 rounded-full text-primary hover:bg-primary-subtle"
                        title="Marcar como leída"
                      >
                        <div className="w-2.5 h-2.5 bg-primary rounded-full" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-text-muted flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                    {notification.type && (
                      <Badge variant="outline" className="text-[10px] px-1.5 h-5">
                        {notification.type}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Simple Pagination - Load More */}
      {notifications.length >= limit && (
        <div className="flex justify-center py-4">
          <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={isLoading}>
            Cargar más notificaciones
          </Button>
        </div>
      )}
    </div>
  );
}
