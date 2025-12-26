'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Text,
  Stack,
  Grid,
  Badge,
  Tooltip,
} from '@maatwork/ui';
import { apiClient } from '@/lib/api-client';
import type { TeamCapacityMember } from '@/types';

interface CapacityHeatmapProps {
  teamId: string;
}

export default function CapacityHeatmap({ teamId }: CapacityHeatmapProps) {
  const [data, setData] = useState<TeamCapacityMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get<TeamCapacityMember[]>(`/v1/teams/${teamId}/capacity`);
        setData(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teamId]);

  if (loading) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overloaded':
        return 'bg-red-100 border-red-300 dark:bg-red-900/30';
      case 'low':
        return 'bg-green-100 border-green-300 dark:bg-green-900/30';
      default:
        return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa de Capacidad</CardTitle>
      </CardHeader>
      <CardContent>
        <Grid cols={{ base: 1, md: 3, lg: 4 }} gap="sm">
          {data.map((member) => (
            <div
              key={member.id}
              className={`p-3 rounded-md border ${getStatusColor(member.status)} transition-all hover:shadow-md`}
            >
              <div className="flex justify-between items-start mb-2">
                <Text weight="bold" className="truncate pr-2">
                  {member.name}
                </Text>
                <Badge
                  variant={
                    member.status === 'overloaded'
                      ? 'error'
                      : member.status === 'low'
                        ? 'success'
                        : 'warning'
                  }
                >
                  {member.score}%
                </Badge>
              </div>
              <Stack direction="column" gap="xs">
                <div className="flex justify-between text-sm">
                  <Text color="secondary">Clientes:</Text>
                  <Text weight="medium">{member.metrics.activeClients}</Text>
                </div>
                <div className="flex justify-between text-sm">
                  <Text color="secondary">Tareas:</Text>
                  <Text weight="medium">{member.metrics.openTasks}</Text>
                </div>
                <div className="flex justify-between text-sm">
                  <Text color="secondary">Leads (Mes):</Text>
                  <Text weight="medium">{member.metrics.newLeads}</Text>
                </div>
              </Stack>
            </div>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
