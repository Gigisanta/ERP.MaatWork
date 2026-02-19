'use client';
import { useRequireAuth } from '@/auth/useRequireAuth';
import { getTeamById, getTeamMemberById, getTeamMemberMetrics } from '@/lib/api';
import { formatCurrency, FormatCurrencyOptions, formatDateShort } from '@maatwork/utils';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Team, TeamMember, TeamMemberMetrics } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Spinner,
  Heading,
  Icon,
  Grid,
  Badge,
} from '@maatwork/ui';
import Link from 'next/link';
import dynamic from 'next/dynamic';

/**
 * Format relative time (e.g., "hace 2 días")
 */
function formatRelativeTime(date: string | null): string {
  if (!date) return 'Nunca';

  const now = new Date();
  const loginDate = new Date(date);
  const diffMs = now.getTime() - loginDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `hace ${diffMinutes} minutos`;
  if (diffHours < 24) return `hace ${diffHours} horas`;
  if (diffDays === 1) return 'hace 1 día';
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`;
  return `hace ${Math.floor(diffDays / 30)} meses`;
}

/**
 * Get activity status badge variant and label
 */
function getActivityStatusBadge(daysSinceLogin: number | null): {
  variant: 'success' | 'warning' | 'error' | 'default';
  label: string;
} {
  if (daysSinceLogin === null) return { variant: 'error', label: 'Sin actividad' };
  if (daysSinceLogin <= 3) return { variant: 'success', label: 'Activo' };
  if (daysSinceLogin <= 7) return { variant: 'warning', label: 'Moderado' };
  if (daysSinceLogin <= 14) return { variant: 'error', label: 'Inactivo' };
  return { variant: 'error', label: 'Crítico' };
}

// AI_DECISION: Lazy load Recharts to reduce initial bundle size
// Justificación: Recharts is heavy (~200KB), loading it async reduces initial bundle significantly
// Impacto: Faster initial page load, smaller initial JavaScript bundle (~200KB reduction)
const RechartsLineChart = dynamic(
  () =>
    import('recharts').then((mod) => ({
      default: ({
        data,
        formatCurrency,
      }: {
        data: Array<{ date: string; value: number }>;
        formatCurrency: (value: number, options?: FormatCurrencyOptions) => string;
      }) => {
        const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = mod;
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  return formatDateShort(value);
                }}
              />
              <YAxis
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                  return `$${value}`;
                }}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value, { currency: 'ARS', locale: 'es-AR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('es-ES');
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      },
    })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          minHeight: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner size="lg" />
      </div>
    ),
  }
);

export default function TeamMemberPage() {
  const { user, loading } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = String(params?.id || '');
  const memberId = String(params?.memberId || '');

  const [member, setMember] = useState<TeamMember | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [metrics, setMetrics] = useState<TeamMemberMetrics | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!['manager', 'admin'].includes(user.role)) {
      router.push('/home');
      return;
    }
    fetchData();
  }, [user, teamId, memberId]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      setError(null);

      // Get team info and member info in parallel
      const [teamRes, memberRes, metricsRes] = await Promise.all([
        getTeamById(teamId),
        getTeamMemberById(teamId, memberId),
        getTeamMemberMetrics(teamId, memberId),
      ]);

      if (teamRes.success && teamRes.data) {
        setTeam(teamRes.data);
      } else {
        throw new Error('No se pudo cargar la información del equipo');
      }

      if (memberRes.success && memberRes.data) {
        setMember(memberRes.data);
      } else {
        setError('Miembro no encontrado en este equipo');
      }

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar información');
    } finally {
      setLoadingData(false);
    }
  };

// function removed in favor of shared utility

  if (loading || loadingData) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-4 md:p-6">
        <Stack direction="column" gap="lg">
          <Button variant="secondary" onClick={() => router.push(`/teams/${teamId}`)}>
            <Icon name="ChevronLeft" size={16} className="mr-2" />
            Volver al equipo
          </Button>
          <Card>
            <CardContent className="p-6">
              <Text color="secondary">{error || 'Miembro no encontrado'}</Text>
            </CardContent>
          </Card>
        </Stack>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <Stack direction="column" gap="lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/teams/${teamId}`)}
              className="mb-2"
            >
              <Icon name="ChevronLeft" size={16} className="mr-2" />
              Volver al equipo
            </Button>
            <Heading level={2}>
              {member.fullName ||
                member.email ||
                member.user?.fullName ||
                member.user?.email ||
                'Miembro'}
            </Heading>
            <Text color="secondary">{team?.name || 'Equipo'}</Text>
          </div>
        </div>

        {/* Member Info Card */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Información del Asesor</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Stack direction="column" gap="md">
              <div>
                <Text size="sm" weight="medium" color="secondary">
                  Email
                </Text>
                <Text>{member.email || member.user?.email || 'N/A'}</Text>
              </div>
              <div>
                <Text size="sm" weight="medium" color="secondary">
                  Rol en el equipo
                </Text>
                <Text>{member.role || member.user?.role || 'N/A'}</Text>
              </div>
              {metrics && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <div>
                    <Text size="sm" weight="medium" color="secondary">
                      Último acceso
                    </Text>
                    <div className="flex items-center gap-2 mt-1">
                      <Text>{formatRelativeTime(metrics.lastLogin)}</Text>
                      <Badge variant={getActivityStatusBadge(metrics.daysSinceLogin).variant}>
                        {getActivityStatusBadge(metrics.daysSinceLogin).label}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Metrics Cards */}
        {metrics && (
          <>
            {/* Performance Metrics */}
            <div>
              <Heading
                level={4}
                className="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wider"
              >
                Rendimiento
              </Heading>
              <Grid cols={{ base: 1, md: 2, lg: 4 }} gap="md">
                <Card>
                  <CardContent className="p-4">
                    <Text size="sm" color="secondary" className="mb-1">
                      AUM Total
                    </Text>
                      <Text weight="bold" className="text-xl">
                        {formatCurrency(metrics.totalAum, { currency: 'ARS', locale: 'es-AR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Text>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Text size="sm" color="secondary" className="mb-1">
                      Clientes
                    </Text>
                    <Text weight="bold" className="text-xl">
                      {metrics.clientCount}
                    </Text>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Text size="sm" color="secondary" className="mb-1">
                      Portfolios Activos
                    </Text>
                    <Text weight="bold" className="text-xl">
                      {metrics.portfolioCount}
                    </Text>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Text size="sm" color="secondary" className="mb-1">
                      Desvíos &gt;10%
                    </Text>
                    <Text weight="bold" className="text-xl">
                      {metrics.deviationAlerts}
                    </Text>
                  </CardContent>
                </Card>
              </Grid>
            </div>

            {/* Activity Metrics */}
            <div>
              <Heading
                level={4}
                className="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wider"
              >
                Actividad (Últimos 30 días)
              </Heading>
              <Grid cols={{ base: 1, md: 2, lg: 4 }} gap="md">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="UserPlus" size={16} className="text-blue-500" />
                      <Text size="sm" color="secondary">
                        Contactos Creados (mes)
                      </Text>
                    </div>
                    <Text weight="bold" className="text-xl">
                      {metrics.contactsCreatedThisMonth}
                    </Text>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="Users" size={16} className="text-green-500" />
                      <Text size="sm" color="secondary">
                        Contactos (30 días)
                      </Text>
                    </div>
                    <Text weight="bold" className="text-xl">
                      {metrics.contactsCreatedLast30Days}
                    </Text>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="FileText" size={16} className="text-purple-500" />
                      <Text size="sm" color="secondary">
                        Notas Creadas
                      </Text>
                    </div>
                    <Text weight="bold" className="text-xl">
                      {metrics.notesCreatedLast30Days}
                    </Text>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="CheckCircle" size={16} className="text-emerald-500" />
                      <Text size="sm" color="secondary">
                        Tareas Completadas
                      </Text>
                    </div>
                    <Text weight="bold" className="text-xl">
                      {metrics.tasksCompletedLast30Days}
                    </Text>
                  </CardContent>
                </Card>
              </Grid>
            </div>

            {/* AUM Trend Chart */}
            {metrics.aumTrend && metrics.aumTrend.length > 0 && (
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-base">Tendencia AUM (Últimos 30 días)</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <RechartsLineChart data={metrics.aumTrend} formatCurrency={formatCurrency} />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Actions Card */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Acciones</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Stack direction="column" gap="sm">
              <Link href={`/contacts?advisorId=${member.id}`}>
                <Button variant="primary" className="w-full">
                  <Icon name="User" size={16} className="mr-2" />
                  Ver CRM del Asesor
                </Button>
              </Link>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </div>
  );
}
