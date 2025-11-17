/**
 * HomePageClient - Client Island for home page interactivity
 * 
 * AI_DECISION: Extract client-side interactivity to separate component
 * Justificación: Allows home page to be Server Component while maintaining interactivity
 * Impacto: Reduces initial bundle size, improves FCP/LCP
 */

'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent, Button, Heading, Text, Stack } from '@cactus/ui';
// AI_DECISION: Lazy load CalendarWidget to reduce initial bundle size
// Justificación: CalendarWidget includes iframe and calendar logic, loading it async reduces initial bundle by 20-30KB
// Impacto: Faster initial page load, smaller initial JavaScript bundle
const CalendarWidget = dynamic(() => import('../CalendarWidget'), {
  loading: () => (
    <Card>
      <CardHeader>
        <CardTitle>Calendario del Equipo</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack direction="row" gap="sm" align="center" justify="center" className="py-8">
          <Text color="secondary">Cargando calendario...</Text>
        </Stack>
      </CardContent>
    </Card>
  ),
  ssr: false
});
import { MetricsSection } from './MetricsSection';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';

interface HomePageClientProps {
  metricsData: MonthlyMetrics | null;
  goalsData: MonthlyGoal | null;
  teamCalendarUrl: string | null;
}

export function HomePageClient({ metricsData, goalsData, teamCalendarUrl }: HomePageClientProps) {
  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
      <Stack direction="column" gap="xl">
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
            loading={false}
            error={null}
          />
        </section>
      </Stack>
    </main>
  );
}

interface HomePageUnauthenticatedProps {
  onLoginClick: () => void;
}

function HomePageUnauthenticated({ onLoginClick }: HomePageUnauthenticatedProps) {
  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
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
              <Button variant="primary" onClick={onLoginClick}>
                Iniciar sesión
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

/**
 * Client component wrapper for unauthenticated state
 * Needed for useRouter hook
 */
export function HomePageUnauthenticatedClient() {
  const router = useRouter();
  
  return <HomePageUnauthenticated onLoginClick={() => router.push('/login')} />;
}
