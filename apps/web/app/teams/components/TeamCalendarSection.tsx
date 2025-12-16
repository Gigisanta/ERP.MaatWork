/**
 * Team Calendar Section
 *
 * Componente para conectar y mostrar calendario de equipo
 * Solo managers pueden conectar calendarios, todos los miembros pueden ver eventos
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Alert,
  Select,
} from '@cactus/ui';
import { useTeamCalendar } from '@/lib/api-hooks';
import { assignEventToMember } from '@/lib/api/calendar';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import type { TeamMember } from '@/types';

interface TeamCalendarSectionProps {
  teamId: string;
  isManager: boolean;
  currentCalendarId?: string | null;
  members?: TeamMember[];
  onCalendarConnected?: (calendarId: string) => void;
  onCalendarDisconnected?: () => void;
}

export function TeamCalendarSection({
  teamId,
  isManager,
  currentCalendarId,
  members = [],
  onCalendarConnected,
  onCalendarDisconnected,
}: TeamCalendarSectionProps) {
  const [assigningEventId, setAssigningEventId] = useState<string | null>(null);

  // AI_DECISION: Memoize date params to prevent infinite re-renders loop
  // Justificación: Passing new object literal to hook on every render caused infinite SWR calls
  const dateParams = useMemo(() => {
    return {
      timeMin: new Date().toISOString(),
      maxResults: 10,
    };
  }, []); // Stable dependency array

  const {
    data: events,
    error,
    isLoading,
  } = useTeamCalendar(teamId, currentCalendarId ? dateParams : undefined);

  const handleAssignEvent = async (eventId: string, userId: string, event: any) => {
    if (!userId) return;

    setAssigningEventId(eventId);
    try {
      const response = await assignEventToMember(teamId, {
        eventId,
        targetUserId: userId,
        eventSummary: event.summary,
        eventDescription: event.description,
        attendees: event.attendees?.map((a: any) => a.email),
      });

      if (response.success) {
        alert('Reunión asignada correctamente y contacto creado/actualizado.');
      } else {
        alert('Error al asignar la reunión');
      }
    } catch (error) {
      console.error(error);
      alert('Error al asignar la reunión');
    } finally {
      setAssigningEventId(null);
    }
  };

  if (!isManager) {
    // Miembros del equipo solo ven el calendario
    if (!currentCalendarId) {
      return (
        <Card>
          <CardContent>
            <Text color="secondary" size="sm">
              El calendario del equipo no está conectado
            </Text>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendario del Equipo</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Text color="secondary" size="sm">
              Cargando eventos...
            </Text>
          ) : error ? (
            <Alert variant="error">
              <Text size="sm">Error al cargar eventos del calendario</Text>
            </Alert>
          ) : events && events.length > 0 ? (
            <Stack direction="column" gap="xs">
              {events.map((event: any) => (
                <div key={event.id}>
                  <Text weight="medium">{event.summary || 'Sin título'}</Text>
                  {event.start?.dateTime && (
                    <Text color="secondary" size="xs">
                      {new Date(event.start.dateTime).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </Text>
                  )}
                </div>
              ))}
            </Stack>
          ) : (
            <Text color="secondary" size="sm">
              No hay eventos próximos
            </Text>
          )}
        </CardContent>
      </Card>
    );
  }

  // Manager puede conectar calendario
  if (!currentCalendarId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendario del Equipo</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="md">
            <Text color="secondary">
              Conecta un calendario de Google para compartir eventos con tu equipo.
            </Text>
            <GoogleLoginButton redirectUrl={`/teams/${teamId}`} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendario del Equipo</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Text color="secondary" size="sm">
            Cargando eventos...
          </Text>
        ) : error ? (
          <Alert variant="error">
            <Text size="sm">Error al cargar eventos del calendario</Text>
          </Alert>
        ) : events && events.length > 0 ? (
          <Stack direction="column" gap="md">
            {events.map((event: any) => (
              <div key={event.id} className="p-3 border border-border rounded-md bg-surface/50">
                <div className="mb-2">
                  <Text weight="medium">{event.summary || 'Sin título'}</Text>
                  {event.start?.dateTime && (
                    <Text color="secondary" size="xs">
                      {new Date(event.start.dateTime).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </Text>
                  )}
                </div>

                {/* Assignment Dropdown */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1">
                    <Select
                      placeholder="Asignar a..."
                      disabled={assigningEventId === event.id}
                      items={members.map((m) => ({
                        value: m.userId,
                        label: m.user?.fullName || m.email || 'Miembro sin nombre',
                      }))}
                      onValueChange={(value) => handleAssignEvent(event.id, value, event)}
                      className="w-full text-xs"
                    />
                  </div>
                  {assigningEventId === event.id && (
                    <Text size="xs" color="secondary">
                      Asignando...
                    </Text>
                  )}
                </div>
              </div>
            ))}
          </Stack>
        ) : (
          <Text color="secondary" size="sm">
            No hay eventos próximos
          </Text>
        )}
      </CardContent>
    </Card>
  );
}
