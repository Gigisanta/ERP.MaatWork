'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Text,
  Stack,
  Icon,
  Grid,
  Spinner,
} from '@cactus/ui';
import { getTeamMembersActivity, type TeamMembersActivityResponse } from '@/lib/api/teams';

interface TeamPerformanceSnapshotProps {
  teamId: string;
}

export default function TeamPerformanceSnapshot({ teamId }: TeamPerformanceSnapshotProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TeamMembersActivityResponse['summary'] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getTeamMembersActivity(teamId);
        if (res.success && res.data) {
          setData(res.data.summary);
        }
      } catch (err) {
        console.error('Error fetching team activity summary', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teamId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Spinner size="sm" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const summary = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento del Equipo (Mes Actual)</CardTitle>
      </CardHeader>
      <CardContent>
        <Grid cols={{ base: 1, md: 3 }} gap="md">
          {/* New Prospects */}
          <div className="flex flex-col gap-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-900">
            <Stack direction="row" gap="sm" align="center" className="mb-1">
              <Icon name="Users" size={16} className="text-blue-600 dark:text-blue-400" />
              <Text size="sm" color="secondary">
                Nuevos Prospectos
              </Text>
            </Stack>
            <Text size="xl" weight="bold" className="text-blue-700 dark:text-blue-300 text-2xl">
              {summary.totalContactsCreatedThisMonth}
            </Text>
            <Text size="xs" color="secondary">
              Creados este mes
            </Text>
          </div>

          {/* Activity / First Meetings */}
          <div className="flex flex-col gap-1 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-100 dark:border-purple-900">
            <Stack direction="row" gap="sm" align="center" className="mb-1">
              <Icon name="Clock" size={16} className="text-purple-600 dark:text-purple-400" />
              <Text size="sm" color="secondary">
                Primeras Reuniones
              </Text>
            </Stack>
            <Text size="xl" weight="bold" className="text-purple-700 dark:text-purple-300 text-2xl">
              {summary.totalFirstMeetingsLast30Days}
            </Text>
            <Text size="xs" color="secondary">
              Últimos 30 días
            </Text>
          </div>

          {/* Active Members Ratio */}
          <div className="flex flex-col gap-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-100 dark:border-green-900">
            <Stack direction="row" gap="sm" align="center" className="mb-1">
              <Icon name="Activity" size={16} className="text-green-600 dark:text-green-400" />
              <Text size="sm" color="secondary">
                Miembros Activos
              </Text>
            </Stack>
            <div className="flex items-baseline gap-1">
              <Text size="xl" weight="bold" className="text-green-700 dark:text-green-300 text-2xl">
                {summary.activeMembers}
              </Text>
              <Text size="sm" color="secondary">
                / {summary.totalMembers}
              </Text>
            </div>
            <Text size="xs" color="secondary">
              Han ingresado en los últimos 3 días
            </Text>
          </div>
        </Grid>
      </CardContent>
    </Card>
  );
}
