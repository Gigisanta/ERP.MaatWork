'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Switch,
  DataTable,
  type Column,
} from '@cactus/ui';
import type { UserApiResponse as User, TeamMember } from '@/types';
import type { AuthUser } from '@/app/auth/AuthContext';

// AI_DECISION: Usar AuthUser en props porque viene del contexto de autenticación
// Justificación: El componente recibe user del AuthContext que devuelve AuthUser, no UserApiResponse
// Impacto: Compatibilidad correcta de tipos entre AuthContext y componentes del perfil
interface TeamMembersSectionProps {
  user: AuthUser | null;
  teamMembers: TeamMember[];
  onShowAddMemberForm: () => void;
}

/**
 * Sección de miembros del equipo (solo para managers/admin)
 */
export function TeamMembersSection({
  user,
  teamMembers,
  onShowAddMemberForm,
}: TeamMembersSectionProps) {
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';

  // Columnas para la tabla de miembros
  const memberColumns: Column<TeamMember & Record<string, unknown>>[] = useMemo(
    () => [
      {
        key: 'fullName',
        header: 'Nombre',
        sortable: true,
      },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
      },
      {
        key: 'role',
        header: 'Rol',
        render: (member) => (
          <Badge variant={member.role === 'lead' ? 'brand' : 'default'}>{member.role}</Badge>
        ),
      },
      {
        key: 'user',
        header: 'Estado',
        render: (member) => <Switch checked={member.user?.role !== undefined} disabled={true} />,
      },
    ],
    []
  );

  if (!isManagerOrAdmin || teamMembers.length === 0) {
    return null;
  }

  return (
    <Card padding="sm">
      <CardHeader className="mb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Miembros del Equipo</CardTitle>
          <Button variant="outline" size="sm" onClick={onShowAddMemberForm}>
            Agregar Miembro
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable<TeamMember & Record<string, unknown>>
          data={teamMembers as (TeamMember & Record<string, unknown>)[]}
          columns={memberColumns}
          keyField="id"
        />
      </CardContent>
    </Card>
  );
}
