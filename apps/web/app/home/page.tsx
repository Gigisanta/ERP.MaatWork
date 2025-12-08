/**
 * Home Page - Server Component
 *
 * AI_DECISION: Create dedicated /home route to avoid rendering issues with root route
 * Justificación: Root route (/) has recurring rendering issues showing raw HTML elements.
 * Creating a dedicated /home route provides a stable alternative for the dashboard.
 * Impacto: Users can access dashboard via /home without rendering issues
 */

import { Suspense } from 'react';
import { HomePageClient } from '../components/home/HomePageClient';
import {
  getCurrentUser,
  getContactsMetricsServer,
  getMonthlyGoalsServer,
  getTeamsServer,
} from '@/lib/api-server-helpers';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';
import { Card, CardContent, Spinner, Stack, Text, Alert } from '@cactus/ui';

// AI_DECISION: Force dynamic rendering for home page
// Justificación: Page requires authentication, can't be pre-rendered at build time
export const dynamic = 'force-dynamic';

/**
 * Loading component for home page
 */
function HomePageLoading() {
  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
      <Card>
        <CardContent>
          <Stack direction="row" gap="sm" align="center" justify="center" className="py-8">
            <Spinner size="sm" />
            <Text color="secondary">Cargando...</Text>
          </Stack>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Fetch home page data
 */
async function getHomePageData() {
  try {
    // Fetch all data in parallel
    const [userResponse, metricsResponse, goalsResponse, teamsResponse] = await Promise.all([
      getCurrentUser().catch(() => ({ success: false, data: null })),
      getContactsMetricsServer().catch(() => ({ success: false, data: null })),
      getMonthlyGoalsServer().catch(() => ({ success: false, data: null })),
      getTeamsServer().catch(() => ({ success: false, data: null })),
    ]);

    const user = userResponse.success && userResponse.data ? userResponse.data : null;

    // If user is authenticated, fetch metrics and goals
    let metricsData: MonthlyMetrics | null = null;
    let goalsData: MonthlyGoal | null = null;
    let teamCalendarUrl: string | null = null;
    let metricsError: string | null = null;

    if (user) {
      if (metricsResponse.success && metricsResponse.data) {
        metricsData = metricsResponse.data.currentMonth;
      } else {
        metricsError = 'No pudimos cargar las métricas del mes.';
      }

      if (goalsResponse.success && goalsResponse.data) {
        goalsData = goalsResponse.data;
      }

      // Get team calendar URL
      if (teamsResponse.success && teamsResponse.data) {
        const teamWithCalendar = teamsResponse.data.find((team) => team.calendarUrl);
        teamCalendarUrl = teamWithCalendar?.calendarUrl || null;
      }
    }

    return {
      user,
      metricsData,
      goalsData,
      teamCalendarUrl,
      metricsError,
    };
  } catch (error) {
    // Return null user on error (will show unauthenticated state)
    return {
      user: null,
      metricsData: null,
      goalsData: null,
      teamCalendarUrl: null,
      metricsError: 'No pudimos cargar las métricas del mes.',
    };
  }
}

/**
 * Home page component - Dashboard with calendar and metrics
 * Main page of the application - requires authentication
 *
 * AI_DECISION: Removed redirect() call - middleware handles authentication
 * Justificación: Middleware already validates token before page loads. Adding redirect()
 *                creates infinite loop (307 redirects). Trust middleware to handle auth.
 * Impacto: Eliminates redirect loop, page loads correctly when middleware allows access
 */
export default async function HomePage() {
  const { user, metricsData, goalsData, teamCalendarUrl, metricsError } = await getHomePageData();

  // Middleware should have already validated authentication
  // If no user here, it's likely a data fetching issue, not an auth issue
  // Show error state instead of redirecting (which would cause loop)
  if (!user) {
    return (
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
        <Card>
          <CardContent>
            <Alert variant="error">
              <Stack direction="column" gap="md">
                <Text weight="medium">Error al cargar la página</Text>
                <Text size="sm" color="secondary">
                  No se pudo obtener la información del usuario. Por favor, recarga la página.
                </Text>
              </Stack>
            </Alert>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Show authenticated home page with calendar and metrics
  return (
    <Suspense fallback={<HomePageLoading />}>
      <HomePageClient
        metricsData={metricsData}
        goalsData={goalsData}
        teamCalendarUrl={teamCalendarUrl}
        metricsError={metricsError}
      />
    </Suspense>
  );
}
