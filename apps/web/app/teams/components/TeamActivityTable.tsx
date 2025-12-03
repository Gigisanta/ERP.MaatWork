'use client';

/**
 * TeamActivityTable - Control de actividad de miembros del equipo
 *
 * AI_DECISION: Componente dedicado para monitoreo de actividad de asesores
 * Justificación: Los managers necesitan visibilidad sobre la actividad de sus asesores
 * Impacto: Mejor control y seguimiento del trabajo del equipo
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTeamMembersActivity, type TeamMembersActivityResponse } from '@/lib/api/teams';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Grid,
  Badge,
  Spinner,
  Icon,
  DataTable,
  type Column,
} from '@cactus/ui';
import type { TeamMemberActivity } from '@/types/team';

interface TeamActivityTableProps {
  teamId: string;
  teamName?: string | undefined;
}

/**
 * Format relative time (e.g., "hace 2 días")
 */
function formatRelativeTime(date: string | null): string {
  if (!date) return 'Nunca';

  const now = new Date();
  const loginDate = new Date(date);
  const diffMs = Math.abs(now.getTime() - loginDate.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  // If the difference is very small or timestamp is future, show "hace momentos"
  if (diffMinutes <= 0) return 'hace momentos';
  if (diffMinutes < 60) return `hace ${diffMinutes}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'hace 1 día';
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} sem`;
  return `hace ${Math.floor(diffDays / 30)} meses`;
}

/**
 * Get activity status badge variant
 */
function getActivityStatusBadgeProps(status: TeamMemberActivity['activityStatus']): {
  variant: 'success' | 'warning' | 'error' | 'default';
  label: string;
} {
  switch (status) {
    case 'active':
      return { variant: 'success', label: 'Activo' };
    case 'moderate':
      return { variant: 'warning', label: 'Moderado' };
    case 'inactive':
      return { variant: 'error', label: 'Inactivo' };
    case 'critical':
      return { variant: 'error', label: 'Crítico' };
    default:
      return { variant: 'default', label: 'Desconocido' };
  }
}

/**
 * Format currency for AUM display
 */
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

export default function TeamActivityTable({ teamId, teamName }: TeamActivityTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<TeamMembersActivityResponse | null>(null);

  useEffect(() => {
    fetchActivityData();
  }, [teamId]);

  const fetchActivityData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTeamMembersActivity(teamId);
      if (response.success && response.data) {
        setActivityData(response.data);
      } else {
        setError('No se pudo cargar la actividad del equipo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar actividad');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<TeamMemberActivity>[] = [
    {
      key: 'member',
      header: 'Miembro',
      render: (member) => (
        <div className="min-w-[150px]">
          <Text weight="medium" className="truncate">
            {member.fullName}
          </Text>
          <Text size="xs" color="secondary" className="truncate">
            {member.email}
          </Text>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (member) => {
        const badgeProps = getActivityStatusBadgeProps(member.activityStatus);
        return <Badge variant={badgeProps.variant}>{badgeProps.label}</Badge>;
      },
    },
    {
      key: 'lastLogin',
      header: 'Último acceso',
      render: (member) => (
        <div className="min-w-[100px]">
          <Text size="sm">{formatRelativeTime(member.lastLogin)}</Text>
          {member.daysSinceLogin !== null && member.daysSinceLogin > 7 && (
            <Text size="xs" color="secondary">
              {member.daysSinceLogin} días
            </Text>
          )}
        </div>
      ),
    },
    {
      key: 'contacts',
      header: 'Contactos (mes)',
      render: (member) => (
        <div className="text-center">
          <Text weight="medium">{member.contactsCreatedThisMonth}</Text>
        </div>
      ),
    },
    {
      key: 'notes',
      header: 'Notas (30d)',
      render: (member) => (
        <div className="text-center">
          <Text>{member.notesCreatedLast30Days}</Text>
        </div>
      ),
    },
    {
      key: 'tasks',
      header: 'Tareas (30d)',
      render: (member) => (
        <div className="text-center">
          <Text>{member.tasksCompletedLast30Days}</Text>
        </div>
      ),
    },
    {
      key: 'clients',
      header: 'Clientes',
      render: (member) => (
        <div className="text-center">
          <Text weight="medium">{member.clientCount}</Text>
        </div>
      ),
    },
    {
      key: 'aum',
      header: 'AUM',
      render: (member) => (
        <div className="text-right min-w-[80px]">
          <Text weight="medium">{formatCurrency(member.totalAum)}</Text>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (member) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/teams/${teamId}/member/${member.id}`)}
        >
          <Icon name="ChevronRight" size={16} />
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Stack direction="row" gap="sm" align="center" justify="center">
            <Spinner size="sm" />
            <Text color="secondary">Cargando actividad...</Text>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Stack direction="column" gap="md" align="center">
            <Icon name="AlertCircle" size={24} className="text-red-500" />
            <Text color="secondary">{error}</Text>
            <Button variant="secondary" size="sm" onClick={fetchActivityData}>
              Reintentar
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!activityData) {
    return null;
  }

  const { members, summary } = activityData;

  return (
    <Stack direction="column" gap="md">
      {/* Summary Cards */}
      <Grid cols={{ base: 2, md: 4, lg: 6 }} gap="sm">
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <CardContent className="p-3 text-center">
            <Text size="xl" weight="bold" className="text-green-700 dark:text-green-400">
              {summary.activeMembers}
            </Text>
            <Text size="xs" color="secondary">
              Activos
            </Text>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
          <CardContent className="p-3 text-center">
            <Text size="xl" weight="bold" className="text-yellow-700 dark:text-yellow-400">
              {summary.moderateMembers}
            </Text>
            <Text size="xs" color="secondary">
              Moderados
            </Text>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
          <CardContent className="p-3 text-center">
            <Text size="xl" weight="bold" className="text-orange-700 dark:text-orange-400">
              {summary.inactiveMembers}
            </Text>
            <Text size="xs" color="secondary">
              Inactivos
            </Text>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
          <CardContent className="p-3 text-center">
            <Text size="xl" weight="bold" className="text-red-700 dark:text-red-400">
              {summary.criticalMembers}
            </Text>
            <Text size="xs" color="secondary">
              Críticos
            </Text>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="p-3 text-center">
            <Text size="xl" weight="bold" className="text-blue-700 dark:text-blue-400">
              {summary.totalContactsCreatedThisMonth}
            </Text>
            <Text size="xs" color="secondary">
              Contactos (mes)
            </Text>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
          <CardContent className="p-3 text-center">
            <Text size="xl" weight="bold" className="text-purple-700 dark:text-purple-400">
              {summary.totalNotesLast30Days}
            </Text>
            <Text size="xs" color="secondary">
              Notas (30d)
            </Text>
          </CardContent>
        </Card>
      </Grid>

      {/* Activity Table */}
      <Card>
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Control de Actividad</CardTitle>
              <Text size="sm" color="secondary">
                {summary.totalMembers} miembros en el equipo
              </Text>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchActivityData}>
              <Icon name="RefreshCw" size={14} className="mr-1" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <DataTable
              data={members as unknown as Record<string, unknown>[]}
              columns={columns as unknown as Column<Record<string, unknown>>[]}
              keyField="id"
              emptyMessage="No hay miembros en este equipo."
            />
          </div>
        </CardContent>
      </Card>
    </Stack>
  );
}
