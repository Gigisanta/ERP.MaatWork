"use client";
// REGLA CURSOR: Página principal - mantener AuthContext, no eliminar loading states, preservar feedback visual
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Heading, Text, Stack } from '@cactus/ui';
import { getContactsMetrics, getMonthlyGoals } from '@/lib/api/metrics';
import { getTeams } from '@/lib/api/teams';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';
import CalendarWidget from './components/CalendarWidget';
import { QuickNavCards } from './components/home/QuickNavCards';
import { MetricsSection } from './components/home/MetricsSection';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [metricsData, setMetricsData] = useState<MonthlyMetrics | null>(null);
  const [goalsData, setGoalsData] = useState<MonthlyGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamCalendarUrl, setTeamCalendarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [metricsResponse, goalsResponse] = await Promise.all([
          getContactsMetrics(),
          getMonthlyGoals()
        ]);

        if (!metricsResponse.success || !metricsResponse.data) {
          throw new Error('Failed to fetch metrics data');
        }

        setMetricsData(metricsResponse.data.currentMonth);
        setGoalsData(goalsResponse.success && goalsResponse.data ? goalsResponse.data : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Obtener calendario del equipo
  useEffect(() => {
    if (!user) {
      setTeamCalendarUrl(null);
      return;
    }

    const fetchTeamCalendar = async () => {
      try {
        const teamsResponse = await getTeams();
        if (teamsResponse.success && teamsResponse.data) {
          // Buscar el primer equipo con calendarUrl configurado
          const teamWithCalendar = teamsResponse.data.find(team => team.calendarUrl);
          setTeamCalendarUrl(teamWithCalendar?.calendarUrl || null);
        }
      } catch (err) {
        // Silently fail - calendar is optional
        setTeamCalendarUrl(null);
      }
    };

    fetchTeamCalendar();
  }, [user]);

  
  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
      {!user ? (
        <div className="text-center py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <Heading level={1}>Cactus CRM</Heading>
            </CardHeader>
            <CardContent>
              <Stack direction="column" gap="md">
                <Text color="secondary">
                  Gestiona tus contactos y carteras de inversión de manera profesional
                </Text>
                <Button variant="primary" onClick={() => router.push('/login')}>
                  Iniciar sesión
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Stack direction="column" gap="xl">
          {/* Cards de navegación rápida */}
          <section aria-label="Navegación rápida">
            <QuickNavCards />
          </section>

          {/* Widget de Calendario del Equipo */}
          {teamCalendarUrl && (
            <section aria-label="Calendario del equipo">
              <CalendarWidget calendarUrl={teamCalendarUrl} />
            </section>
          )}

          {/* Sección de métricas */}
          <section aria-label="Métricas del mes">
            <MetricsSection
              metricsData={metricsData}
              goalsData={goalsData}
              loading={loading}
              error={error}
            />
          </section>
        </Stack>
      )}
    </main>
  );
}