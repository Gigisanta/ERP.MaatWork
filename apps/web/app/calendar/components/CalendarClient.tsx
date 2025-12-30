/**
 * Calendar Client Island
 *
 * Client component para interactividad del calendario personal
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent, Text, Stack } from '@maatwork/ui';
import { useCalendarEvents } from '@/lib/api-hooks';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import Link from 'next/link';
import type { CalendarEvent } from '@maatwork/types';

interface CalendarClientProps {
  userId: string;
}

export function CalendarClient({ userId }: CalendarClientProps) {
  const {
    data: events,
    error,
    isLoading,
  } = useCalendarEvents({
    maxResults: 50,
  });

  // Si no hay eventos y hay error, mostrar botón de conexión
  if (error && !events) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conectar Google Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="md">
            <Text color="secondary">
              Conecta tu cuenta de Google para ver y gestionar tus eventos de calendario.
            </Text>
            <GoogleLoginButton redirectUrl="/calendar" />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" gap="sm" align="center" justify="center" className="py-8">
            <Text color="secondary">Cargando calendario...</Text>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {events && events.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <Stack direction="column" gap="xs">
              {events.map((event: CalendarEvent) => (
                <div key={event.id} className="py-2 border-b last:border-b-0">
                  <Text weight="medium">{event.summary || 'Sin título'}</Text>
                  {event.start?.dateTime && (
                    <Text color="secondary" size="sm">
                      {new Date(event.start.dateTime).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </Text>
                  )}
                  {event.description && (
                    <Text color="secondary" size="sm" className="mt-1">
                      {event.description}
                    </Text>
                  )}
                </div>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Text color="secondary">No hay eventos próximos</Text>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
