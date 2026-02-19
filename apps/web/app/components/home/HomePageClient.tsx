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
import { useAuth } from '../../auth/AuthContext';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Heading,
  Text,
  Stack,
  SkeletonCard,
} from '@maatwork/ui';
import { MetricsSection } from './MetricsSection';
import { PersonalCalendarWidget } from './PersonalCalendarWidget';
import { QuickActionsWidget } from './QuickActionsWidget';
import { TodayTasksWidget } from './TodayTasksWidget';
import { OnboardingChecklist } from './OnboardingChecklist';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';

interface HomePageClientProps {
  metricsData: MonthlyMetrics | null;
  goalsData: MonthlyGoal | null;
  metricsError: string | null;
  metricsLoading?: boolean;
}

export function HomePageClient({
  metricsData,
  goalsData,
  metricsError,
  metricsLoading = false,
}: HomePageClientProps) {
  const { user } = useAuth();

  // Obtener saludo según hora del día
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const greeting = getGreeting();
  const userName = user?.fullName || user?.email?.split('@')[0] || 'Usuario';

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
      <Stack direction="column" gap="lg">
        {/* Mensaje de bienvenida */}
        <div className="animate-enter">
          <Heading level={2} className="text-2xl md:text-3xl">
            {greeting}, {userName}
          </Heading>
          <Text color="secondary" size="sm" className="mt-1">
            Aquí está tu resumen del día
          </Text>
        </div>

        {/* Onboarding Checklist - Solo para usuarios nuevos */}
        <div className="animate-enter" style={{ transitionDelay: '50ms' }}>
          <OnboardingChecklist />
        </div>

        {/* Grid principal: Acciones rápidas y Qué hacer hoy */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-enter"
          style={{ transitionDelay: '100ms' }}
        >
          {/* Acciones rápidas - 2 columnas en desktop */}
          <div className="lg:col-span-2">
            <QuickActionsWidget />
          </div>

          {/* Qué hacer hoy - 1 columna en desktop */}
          <div className="lg:col-span-1">
            <TodayTasksWidget />
          </div>
        </div>

        {/* Widget de Calendario Personal */}
        <section
          aria-label="Mi calendario"
          className="animate-enter"
          style={{ transitionDelay: '200ms' }}
        >
          <PersonalCalendarWidget />
        </section>

        {/* Sección de métricas */}
        <section
          aria-label="Métricas del mes"
          className="animate-enter"
          style={{ transitionDelay: '300ms' }}
        >
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
function HomePageUnauthenticatedClient() {
  const router = useRouter();

  return <HomePageUnauthenticated onLoginClick={() => router.push('/login')} />;
}
