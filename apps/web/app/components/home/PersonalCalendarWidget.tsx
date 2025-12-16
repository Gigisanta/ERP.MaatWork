/**
 * Personal Calendar Widget
 *
 * Widget para mostrar eventos del calendario personal del usuario en /home
 *
 * AI_DECISION: Mejorar manejo de errores y visualización de estados
 * Justificación: Usuarios necesitan ver claramente cuando algo falla y qué pueden hacer
 * Impacto: Mejor UX, menos confusión cuando Google Calendar tiene problemas
 */

'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Badge,
  Alert,
} from '@cactus/ui';
import { useCalendarEvents } from '@/lib/api-hooks';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import Link from 'next/link';
import { WeeklyCalendarView } from './WeeklyCalendarView';
import type { CalendarEvent } from '@/types/calendar';

export function PersonalCalendarWidget() {
  const { user, mutateUser } = useAuth();

  // AI_DECISION: Usar useMemo para mantener fechas estables y evitar re-renders infinitos
  // Actualizado para traer toda la semana (domingo a sábado)
  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado
    endOfWeek.setHours(23, 59, 59, 999);

    return {
      timeMin: startOfWeek.toISOString(),
      timeMax: endOfWeek.toISOString(),
    };
  }, []); // Solo calcular una vez al montar

  const isConnected = user?.isGoogleConnected;

  // AI_DECISION: Revalidar usuario al montar componente SOLO UNA VEZ
  // Justificación: Cuando el usuario vuelve de /profile después de conectar Google Calendar,
  //                el estado del usuario en el contexto puede estar desactualizado.
  //                Forzamos una revalidación para asegurar que tenemos el estado más reciente.
  // Impacto: Garantiza que el widget muestre el estado correcto del calendario
  // CRITICAL: useEffect con dependencias vacías [] para ejecutar SOLO al montar (una vez)
  //           Si ponemos mutateUser en dependencias, causa bucle infinito
  React.useEffect(() => {
    logger.debug('[PersonalCalendarWidget] Component mounted, refreshing user state');
    mutateUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // IMPORTANTE: [] para ejecutar solo al montar

  // AI_DECISION: Debug logging para troubleshooting - SOLO una vez al montar
  // Justificación: Ayuda a diagnosticar problemas de conexión en producción
  // Impacto: Logs solo en development, sin causar bucles infinitos
  React.useEffect(() => {
    logger.debug('[PersonalCalendarWidget] Component state', {
      hasUser: !!user,
      userId: user?.id,
      isConnected,
      isGoogleConnectedValue: user?.isGoogleConnected,
      userKeys: user ? Object.keys(user) : [],
    });
    // Log solo cuando isConnected cambia (no cuando user cambia)
  }, [isConnected]); // Dependencia solo en isConnected para evitar re-logs innecesarios

  const {
    data: events,
    error,
    isLoading,
    mutate,
  } = useCalendarEvents(
    isConnected
      ? {
          timeMin: dateRange.timeMin,
          timeMax: dateRange.timeMax,
          maxResults: 100, // Aumentado para traer todos los eventos de la semana
        }
      : undefined
  );

  // AI_DECISION: Handler para actualización manual
  // Justificación: Usuarios quieren poder refrescar eventos sin recargar página
  // Impacto: Mejor UX, control explícito sobre sincronización
  const handleRefresh = async () => {
    logger.info('[PersonalCalendarWidget] Manual refresh triggered');
    await mutate();
  };

  // Si no está conectado, mostrar UI de conexión directamente
  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mi Calendario</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="sm">
            <Text color="secondary" size="sm">
              Conecta tu Google Calendar para ver tus eventos
            </Text>
            <Link href="/profile">
              <Button variant="outline" size="sm">
                Conectar en Perfil
              </Button>
            </Link>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // AI_DECISION: Manejo detallado de errores con acciones específicas
  // Justificación: Diferentes errores requieren diferentes acciones del usuario
  // Impacto: Usuario sabe exactamente qué hacer cuando algo falla
  if (error) {
    const apiError = error instanceof ApiError ? error : null;
    const isAuthError =
      apiError?.isAuthError || apiError?.status === 401 || apiError?.status === 403;
    const errorMessage = apiError?.message || (error as Error).message || 'Error desconocido';

    logger.error('[PersonalCalendarWidget] Error displaying calendar', {
      error: errorMessage,
      isAuthError,
      status: apiError?.status,
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle>Mi Calendario</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="sm">
            <Alert variant="error">
              {isAuthError ? (
                <Text size="sm">
                  Tu conexión con Google Calendar expiró o necesita reconectarse.
                </Text>
              ) : (
                <Text size="sm">Error al cargar eventos: {errorMessage}</Text>
              )}
            </Alert>
            <div className="flex gap-2">
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  {isAuthError ? 'Reconectar cuenta' : 'Revisar conexión'}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logger.info('[PersonalCalendarWidget] User triggered manual refresh');
                  window.location.reload();
                }}
              >
                Reintentar
              </Button>
            </div>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // AI_DECISION: Skeleton loading más informativo
  // Justificación: Mejor UX durante carga, usuarios ven que algo está pasando
  // Impacto: Percepción de velocidad mejorada
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mi Calendario</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="sm">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // AI_DECISION: Usar WeeklyCalendarView en lugar de lista simple
  // Justificación: Mejor visualización con timeline de horarios, permite ver distribución de eventos
  // Impacto: UX mejorada, usuario puede ver qué días/horas están ocupados
  return (
    <WeeklyCalendarView
      events={events as CalendarEvent[]}
      isLoading={isLoading}
      onRefresh={handleRefresh}
    />
  );
}
