'use client';

import React from 'react';
import { Text, Stack, Input, Button, Badge, Tooltip, Icon } from '@cactus/ui';
import type { UserApiResponse as User, Team } from '@/types';
import type { AuthUser } from '@/app/auth/AuthContext';

// AI_DECISION: Usar AuthUser en props porque viene del contexto de autenticación
// Justificación: El componente recibe user del AuthContext que devuelve AuthUser, no UserApiResponse
// Impacto: Compatibilidad correcta de tipos entre AuthContext y componentes del perfil
interface TeamsSectionProps {
  user: AuthUser | null;
  teams: Team[];
  calendarUrls: Record<string, string>;
  calendarLoading: Record<string, boolean>;
  onCalendarUrlChange: (teamId: string, url: string) => void;
  onUpdateCalendarUrl: (teamId: string) => void;
  onShowTeamForm: () => void;
}

/**
 * Sección de equipos y calendario del perfil
 */
export function TeamsSection({
  user,
  teams,
  calendarUrls,
  calendarLoading,
  onCalendarUrlChange,
  onUpdateCalendarUrl,
  onShowTeamForm,
}: TeamsSectionProps) {
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';

  if (!isManagerOrAdmin && teams.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Equipos - Simplificado */}
      <div className="mb-3">
        <Text weight="semibold" size="sm" className="text-text mb-2 block">
          Mis Equipos
        </Text>
        {teams.length === 0 ? (
          <div className="flex items-center gap-2">
            <Text size="sm" color="secondary">
              No tienes equipos asignados
            </Text>
            {isManagerOrAdmin && (
              <Button variant="outline" size="sm" onClick={onShowTeamForm}>
                Crear
              </Button>
            )}
          </div>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="flex items-center gap-2">
              <Text weight="medium" size="sm" className="text-text">
                {team.name}
              </Text>
              <Badge variant={team.role === 'manager' ? 'secondary' : 'default'}>{team.role}</Badge>
            </div>
          ))
        )}
      </div>

      {/* Calendario del Equipo - Debajo de Equipos */}
      {isManagerOrAdmin && teams.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Text weight="semibold" size="sm" className="text-text">
              Calendario del Equipo
            </Text>
            <Tooltip
              content={
                <div className="max-w-xs">
                  <div className="font-semibold mb-1">Para obtener la URL correcta:</div>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Ve a Google Calendar → Configuración del calendario</li>
                    <li>
                      En &quot;Compartir este calendario&quot;, marca &quot;Hacer público este
                      calendario&quot;
                    </li>
                    <li>
                      En &quot;Integrar calendario&quot;, copia la URL que aparece en &quot;Código
                      para incrustar&quot;
                    </li>
                    <li>
                      La URL debe tener el formato:
                      https://calendar.google.com/calendar/embed?src=...
                    </li>
                  </ol>
                </div>
              }
            >
              <button
                type="button"
                className="text-text-muted hover:text-text transition-colors flex-shrink-0"
              >
                <Icon name="info" size={14} />
              </button>
            </Tooltip>
          </div>
          <Stack direction="column" gap="xs">
            {teams
              .filter((team) => team.role === 'manager' || user?.role === 'admin')
              .map((team) => (
                <div key={team.id}>
                  <div className="flex gap-2 mb-1">
                    <Input
                      type="url"
                      placeholder="URL del calendario"
                      value={calendarUrls[team.id] || ''}
                      onChange={(e) => onCalendarUrlChange(team.id, e.target.value)}
                      className="flex-1"
                      size="sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => onUpdateCalendarUrl(team.id)}
                      disabled={calendarLoading[team.id]}
                      className="flex-shrink-0"
                    >
                      {calendarLoading[team.id] ? '...' : 'Guardar'}
                    </Button>
                  </div>
                  {team.calendarUrl && (
                    <Tooltip content={team.calendarUrl}>
                      <Text size="xs" color="secondary" className="truncate">
                        URL: {team.calendarUrl}
                      </Text>
                    </Tooltip>
                  )}
                </div>
              ))}
          </Stack>
        </div>
      )}
    </div>
  );
}
