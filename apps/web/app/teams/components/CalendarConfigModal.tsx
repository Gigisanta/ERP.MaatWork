'use client';

import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  Button,
  Select,
  Text,
  Badge,
  Icon,
  Tooltip,
} from '@cactus/ui';
import type { Team } from '@/types';
import type { CalendarListEntry } from '@/lib/api';

interface CalendarConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Use teams array for switching config
  teams: Team[];
  selectedTeam: Team;
  onTeamChange: (teamId: string) => void;

  isGoogleConnected: boolean;
  availableCalendars: CalendarListEntry[];

  // Google Calendar props - Primary
  selectedCalendarId: string;
  onSelectCalendarId: (id: string) => void;
  onConnectCalendar: (type: 'primary' | 'meetingRoom') => void;

  // Google Calendar props - Meeting Room
  selectedMeetingRoomCalendarId: string;
  onSelectMeetingRoomCalendarId: (id: string) => void;

  isLoading: boolean;
}

export default function CalendarConfigModal({
  isOpen,
  onClose,
  teams,
  selectedTeam,
  onTeamChange,
  isGoogleConnected,
  availableCalendars,
  selectedCalendarId,
  onSelectCalendarId,
  onConnectCalendar,
  selectedMeetingRoomCalendarId,
  onSelectMeetingRoomCalendarId,
  isLoading,
}: CalendarConfigModalProps) {
  // Helper to get calendar options
  const calendarOptions = availableCalendars.map((cal) => ({
    value: cal.id,
    label: cal.summary + (cal.primary ? ' (Principal)' : ''),
  }));

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent className="sm:max-w-[600px]">
        <ModalHeader>
          <ModalTitle>Configurar Calendarios</ModalTitle>
          <ModalDescription>
            Conecta los calendarios para sincronizar eventos y tareas del equipo.
          </ModalDescription>
        </ModalHeader>

        <div className="py-4 space-y-6">
          {/* Team Selector if multiple teams */}
          {teams.length > 1 && (
            <div className="space-y-1.5">
              <Text weight="medium" size="sm">
                Equipo
              </Text>
              <Select
                items={teams.map((t) => ({ value: t.id, label: t.name }))}
                value={selectedTeam.id}
                onValueChange={onTeamChange}
                placeholder="Selecciona un equipo"
                className="w-full"
              />
            </div>
          )}

          {isGoogleConnected ? (
            <>
              {/* PRIMARY CALENDAR */}
              <div className="space-y-3 p-4 border border-border rounded-lg bg-surface/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Text weight="medium">Calendario del Equipo</Text>
                    <Tooltip content="Este es el calendario principal del equipo.">
                      <Icon name="info" size={14} className="text-text-muted" />
                    </Tooltip>
                  </div>
                  {selectedTeam.calendarId ? (
                    <Badge variant="success" size="sm">
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" size="sm">
                      Sin conectar
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select
                      placeholder="Selecciona un calendario..."
                      items={calendarOptions}
                      value={selectedCalendarId || selectedTeam.calendarId || ''}
                      onValueChange={onSelectCalendarId}
                      className="w-full"
                    />
                  </div>
                  <Button
                    onClick={() => onConnectCalendar('primary')}
                    disabled={isLoading || !selectedCalendarId}
                    className="flex-shrink-0"
                    size="sm"
                  >
                    {isLoading
                      ? 'Guardando...'
                      : selectedTeam.calendarId
                        ? 'Actualizar'
                        : 'Conectar'}
                  </Button>
                </div>
              </div>

              {/* MEETING ROOM CALENDAR */}
              <div className="space-y-3 p-4 border border-border rounded-lg bg-surface/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Text weight="medium">Calendario de Sala de Reuniones</Text>
                    <Tooltip content="Calendario secundario para reservas de sala de reuniones.">
                      <Icon name="info" size={14} className="text-text-muted" />
                    </Tooltip>
                  </div>
                  {selectedTeam.meetingRoomCalendarId ? (
                    <Badge variant="success" size="sm">
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" size="sm">
                      Sin conectar
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select
                      placeholder="Selecciona un calendario de sala..."
                      items={calendarOptions}
                      value={
                        selectedMeetingRoomCalendarId || selectedTeam.meetingRoomCalendarId || ''
                      }
                      onValueChange={onSelectMeetingRoomCalendarId}
                      className="w-full"
                    />
                  </div>
                  <Button
                    onClick={() => onConnectCalendar('meetingRoom')}
                    disabled={isLoading || !selectedMeetingRoomCalendarId}
                    className="flex-shrink-0"
                    size="sm"
                  >
                    {isLoading
                      ? 'Guardando...'
                      : selectedTeam.meetingRoomCalendarId
                        ? 'Actualizar'
                        : 'Conectar'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-3 bg-surface-muted rounded-md text-sm text-text-secondary">
              Conecta tu cuenta de Google en tu perfil para sincronizar calendarios automáticamente.
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
