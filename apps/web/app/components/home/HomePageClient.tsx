/**
 * HomePageClient - Client Island for home page interactivity
 *
 * AI_DECISION: Extract client-side interactivity to separate component
 * Justificación: Allows home page to be Server Component while maintaining interactivity
 * Impacto: Reduces initial bundle size, improves FCP/LCP
 */

'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent, Button, Heading, Text, Stack } from '@cactus/ui';
import { MetricsSection } from './MetricsSection';
import { PersonalCalendarWidget } from './PersonalCalendarWidget';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';

interface HomePageClientProps {
  metricsData: MonthlyMetrics | null;
  goalsData: MonthlyGoal | null;
  metricsError: string | null;
  metricsLoading?: boolean;
  teamCalendarUrl: string | null;
  teamId: string | null;
}

export function HomePageClient({
  metricsData,
  goalsData,
  metricsError,
  metricsLoading = false,
  teamCalendarUrl,
  teamId,
}: HomePageClientProps) {
  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
      <Stack direction="column" gap="xl">
        <div className="grid grid-cols-1 gap-6">
          {/* Widget de Calendario Personal */}
          <section aria-label="Mi calendario">
            <PersonalCalendarWidget />
          </section>
        </div>

        {/* Sección de métricas */}
        <section aria-label="Métricas del mes">
          <MetricsSection
            metricsData={metricsData}
            goalsData={goalsData}
            loading={metricsLoading}
            error={metricsError}
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
            <Heading level={1}>
              <span className="text-primary">Maat</span>
              <span className="text-secondary">Work</span>
            </Heading>
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
