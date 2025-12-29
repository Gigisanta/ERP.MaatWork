'use client';

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
  Alert,
  Text,
  Stack,
  Button,
  Icon,
  Select,
} from '@maatwork/ui';
import Link from 'next/link';
import useSWR from 'swr';
import { getTeamEvents } from '@/lib/api';
import type { CalendarEvent, Team } from '@/types';
import { WeeklyCalendarView } from './home/WeeklyCalendarView';

interface CalendarWidgetProps {
  teams?: Team[];
  selectedTeamId?: string | null | undefined;
  onSelectTeam?: (teamId: string) => void;
  className?: string;
  onConfigure?: (team: Team) => void;
  canConfigure?: boolean;
}

export default function CalendarWidget({
  teams = [],
  selectedTeamId,
  onSelectTeam,
  className,
  onConfigure,
  canConfigure,
}: CalendarWidgetProps) {
  // Active team logic - assume single team context if usually one team
  const activeTeamId = selectedTeamId || (teams.length > 0 ? teams[0].id : null);
  const activeTeam = teams.find((t) => t.id === activeTeamId);

  // State for switching between Primary and Meeting Room calendars
  const [calendarType, setCalendarType] = useState<'primary' | 'meetingRoom'>('primary');

  // Determine if we should show the toggle dropdown
  // We show it if meeting room calendar is available OR if user just wants to see options?
  // User asked to replace logic with "Team Name" and "Meeting Room".
  // This implies a single dropdown that switches context.

  const showDropdown = !!activeTeam;
  const activeCalendarId =
    calendarType === 'meetingRoom' ? activeTeam?.meetingRoomCalendarId : activeTeam?.calendarId;

  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR(
    activeTeamId && activeCalendarId ? ['calendar', activeTeamId, calendarType] : null,
    () =>
      getTeamEvents(activeTeamId!, {
        timeMin: new Date(),
        maxResults: 50,
        calendarType,
      })
  );

  const events: CalendarEvent[] = response?.success && response.data ? response.data : [];

  const handleRefresh = () => {
    mutate();
  };

  if (!activeTeamId || teams.length === 0 || !activeTeam) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Agenda del Equipo</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <Text color="secondary" className="mb-4">
              No tienes equipos asignados.
            </Text>
            <Link href="/profile">
              <Button variant="outline">Ir a mi perfil</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Construct options for the single dropdown
  const calendarOptions = [
    { value: 'primary', label: activeTeam.name }, // Option 1: Team Name
  ];

  if (activeTeam.meetingRoomCalendarId) {
    calendarOptions.push({ value: 'meetingRoom', label: 'Reserva Sala de reunion' }); // Option 2
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="whitespace-nowrap">Agenda del Equipo</CardTitle>
              <span className="text-muted-foreground hidden sm:inline">-</span>

              {/* Single Dropdown for Calendar Selection */}
              {showDropdown && (
                <Select
                  value={calendarType}
                  onValueChange={(val) => setCalendarType(val as 'primary' | 'meetingRoom')}
                  items={calendarOptions}
                  className="w-[250px]"
                  // If only one option (no meeting room), it acts as read-only label effectively
                  disabled={calendarOptions.length <= 1}
                />
              )}
            </div>

            <div className="flex items-center gap-2 self-end xl:self-auto">
              {canConfigure && activeTeam && onConfigure && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onConfigure(activeTeam)}
                  title="Configurar calendarios"
                >
                  <Icon name="Settings" size={16} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {activeCalendarId ? (
            <WeeklyCalendarView
              events={events}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              readOnly={true}
              hideHeader={true} // Hide the internal header
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <Text color="secondary" className="mb-4">
                {calendarType === 'meetingRoom'
                  ? 'No hay calendario de sala de reuniones conectado.'
                  : 'Este equipo no tiene un calendario conectado.'}
              </Text>
              {canConfigure && onConfigure && activeTeam ? (
                <Button variant="outline" onClick={() => onConfigure(activeTeam)}>
                  Conectar Calendario
                </Button>
              ) : (
                <Text size="sm" color="secondary">
                  Contacta a un administrador para configurar el calendario.
                </Text>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
