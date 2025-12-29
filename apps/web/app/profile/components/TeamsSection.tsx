'use client';

import React, { useEffect } from 'react';
import { Text, Stack, Button, Badge } from '@maatwork/ui';
import type { UserApiResponse as User, Team } from '@/types';
import type { AuthUser } from '@/app/auth/AuthContext';

// AI_DECISION: Usar AuthUser en props porque viene del contexto de autenticación
// Justificación: El componente recibe user del AuthContext que devuelve AuthUser, no UserApiResponse
// Impacto: Compatibilidad correcta de tipos entre AuthContext y componentes del perfil
interface TeamsSectionProps {
  user: AuthUser | null;
  teams: Team[];
  onShowTeamForm: () => void;
}

/**
 * Sección de equipos del perfil
 */
export function TeamsSection({ user, teams, onShowTeamForm }: TeamsSectionProps) {
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

      {/* Listado de equipos para Managers/Admin con estado de calendario (solo lectura) */}
      {isManagerOrAdmin && teams.length > 0 && (
        <div>
          <Text weight="semibold" size="sm" className="text-text mb-2 block">
            Estado de Equipos
          </Text>
          <Stack direction="column" gap="xs">
            {teams
              .filter((team) => team.role === 'manager' || user?.role === 'admin')
              .map((team) => (
                <div key={team.id} className="border border-border rounded-lg p-3 bg-surface">
                  <div className="flex items-center justify-between">
                    <Text weight="medium" size="sm">
                      {team.name}
                    </Text>
                    {team.calendarId ? (
                      <Badge variant="success">Calendario Conectado</Badge>
                    ) : team.calendarUrl ? (
                      <Badge variant="warning">Legacy URL</Badge>
                    ) : (
                      <Badge variant="secondary">Sin Calendario</Badge>
                    )}
                  </div>
                  <Text size="xs" color="secondary" className="mt-1">
                    Gestiona el calendario desde la sección de Equipos.
                  </Text>
                </div>
              ))}
          </Stack>
        </div>
      )}
    </div>
  );
}
