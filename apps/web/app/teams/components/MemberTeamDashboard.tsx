'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Heading,
  Stack,
  Text,
  Badge,
  Grid,
  Icon,
  Button,
} from '@maatwork/ui';
import { TeamCalendarSection } from './TeamCalendarSection';
import type { MemberDashboardResponse } from '@/lib/api/teams';
import { useRouter } from 'next/navigation';

interface MemberTeamDashboardProps {
  data: MemberDashboardResponse;
}

export default function MemberTeamDashboard({ data }: MemberTeamDashboardProps) {
  const router = useRouter();
  const { team, metrics } = data;

  if (!team) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Heading level={2} className="mb-4">
            No perteneces a ningún equipo
          </Heading>
          <Text color="secondary" className="mb-6">
            Contacta a tu manager para ser agregado a un equipo.
          </Text>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Stack direction="column" gap="lg">
      <div className="flex justify-between items-center">
        <div>
          <Heading level={2}>Tu Equipo: {team.name}</Heading>
          <Text color="secondary">Manager: {team.managerName || 'No asignado'}</Text>
        </div>
        <Badge variant="default">{team.role}</Badge>
      </div>

      <Grid cols={{ base: 1, md: 3 }} gap="md">
        {/* Personal Metrics */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex justify-between items-center mb-2">
              <Text size="sm" color="secondary">
                AUM Gestionado
              </Text>
              <Icon name="BarChart3" size={16} className="text-muted-foreground" />
            </div>
            <Heading level={3}>{formatCurrency(metrics?.totalAum || 0)}</Heading>
            <Text size="xs" color="secondary">
              Total bajo gestión
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex justify-between items-center mb-2">
              <Text size="sm" color="secondary">
                Mis Clientes
              </Text>
              <Icon name="Users" size={16} className="text-muted-foreground" />
            </div>
            <Heading level={3}>{metrics?.totalClients || 0}</Heading>
            <Text size="xs" color="success">
              +{metrics?.newContactsThisMonth || 0} este mes
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex justify-between items-center mb-2">
              <Text size="sm" color="secondary">
                Tareas Pendientes
              </Text>
              <Icon name="CheckCircle" size={16} className="text-muted-foreground" />
            </div>
            <Heading level={3}>{metrics?.openTasks || 0}</Heading>
            <div className="flex justify-between items-center">
              <Text size="xs" color="secondary">
                Acciones requeridas
              </Text>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => router.push('/tasks')}
              >
                Ver todas
              </Button>
            </div>
          </CardContent>
        </Card>
      </Grid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TeamCalendarSection
            teamId={team.id}
            isManager={false}
            currentCalendarId={team.calendarId}
          />
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Mi Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <Stack direction="column" gap="md">
                <div className="flex justify-between items-center border-b pb-2">
                  <Text>Contactos nuevos (30d)</Text>
                  <Text weight="bold">{metrics?.newContactsThisMonth || 0}</Text>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <Text>1° Reuniones (30d)</Text>
                  <Text weight="bold">{metrics?.firstMeetingsLast30Days || 0}</Text>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <Text>2° Reuniones (30d)</Text>
                  <Text weight="bold">{metrics?.secondMeetingsLast30Days || 0}</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text>Tareas pendientes</Text>
                  <Text weight="bold">{metrics?.openTasks || 0}</Text>
                </div>
              </Stack>
            </CardContent>
          </Card>
        </div>
      </div>
    </Stack>
  );
}
