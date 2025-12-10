/**
 * Home Page - Server Component
 *
 * AI_DECISION: Convert to Server Component with Client Islands pattern
 * Justificación: Server-side data fetching reduces First Load JS by ~400KB
 * Impacto: Static content rendered server-side, interactivity isolated to client islands
 */

import { Suspense } from 'react';
import { HomePageClient, HomePageUnauthenticatedClient } from './components/home/HomePageClient';
import {
  getCurrentUser,
  getContactsMetricsServer,
  getMonthlyGoalsServer,
  getTeamsServer,
} from '@/lib/api-server-helpers';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';
import { Card, CardContent, Spinner, Stack, Text } from '@cactus/ui';

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

      // Get team calendar URL - find first team where user is a member that has calendarUrl configured
      // AI_DECISION: getTeamsServer() already returns only teams where user is a member/manager
      // Justificación: Since getTeamsServer() filters to user's teams, we just need to find first with calendarUrl
      // Impacto: Calendar will show for any team the user belongs to that has calendarUrl configured
      if (teamsResponse.success && teamsResponse.data && teamsResponse.data.length > 0) {
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
 * Home page component
 */
export default async function HomePage() {
  const { user, metricsData, goalsData, teamCalendarUrl, metricsError } = await getHomePageData();

  // If no user, show unauthenticated state
  if (!user) {
    return (
      <Suspense fallback={<HomePageLoading />}>
        <HomePageUnauthenticatedClient />
      </Suspense>
    );
  }

  // Show authenticated home page
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
