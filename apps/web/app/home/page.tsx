/**
 * Home Page - Server Component
 *
 * AI_DECISION: Create dedicated /home route to avoid rendering issues with root route
 * Justificación: Root route (/) has recurring rendering issues showing raw HTML elements.
 * Creating a dedicated /home route provides a stable alternative for the dashboard.
 * Impacto: Users can access dashboard via /home without rendering issues
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { HomePageClient } from '../components/home/HomePageClient';
import {
  getCurrentUser,
  getContactsMetricsServer,
  getMonthlyGoalsServer,
  getTeamsServer,
} from '@/lib/api-server-helpers';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';
import { Card, CardContent, Spinner, Stack, Text, Alert } from '@maatwork/ui';

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
    // Fetch user first - if auth fails, redirect immediately
    let userResponse;
    try {
      userResponse = await getCurrentUser();
    } catch (error) {
      // Check if it's an auth error (401/403) vs network/server error
      const status = (error as Error & { status?: number; isNetworkError?: boolean })?.status;
      const isNetworkError = (error as Error & { isNetworkError?: boolean })?.isNetworkError;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Only redirect on actual auth errors (401/403), not network/server errors
      // Network errors (ECONNREFUSED, fetch failed) should not trigger redirect
      // as they might be temporary and the middleware already validated the token
      if (status === 401 || status === 403) {
        // Clear auth error - redirect to login
        redirect('/login');
      }

      // For network errors or server errors (no status or 5xx), don't redirect
      // The middleware already validated the token, so trust it
      // Show error state instead of redirecting (which would cause loop)
      if (isNetworkError || !status || status >= 500) {
        // Network/server error - don't redirect, show error state
        userResponse = { success: false, data: null };
      } else {
        // Other 4xx errors (not 401/403) - also don't redirect
        userResponse = { success: false, data: null };
      }
    }

    const user = userResponse?.success && userResponse?.data ? userResponse.data : null;

    // Only redirect if we got a clear auth error response (401/403)
    // Don't redirect on network errors or missing user from failed requests
    // The middleware already validated the token, so if we can't fetch user data
    // it's likely a temporary API issue, not an auth issue
    if (!user && userResponse && 'success' in userResponse && userResponse.success === false) {
      // Check if it was an auth error by checking the response
      // If we got here without throwing, it's not an auth error
      // Don't redirect - show error state instead
    }

    // Fetch other data in parallel (only if user exists)
    const [metricsResponse, goalsResponse, teamsResponse] = await Promise.all([
      getContactsMetricsServer().catch(() => ({ success: false, data: null })),
      getMonthlyGoalsServer().catch(() => ({ success: false, data: null })),
      getTeamsServer().catch(() => ({ success: false, data: null })),
    ]);

    // User is authenticated, fetch metrics and goals
    let metricsData: MonthlyMetrics | null = null;
    let goalsData: MonthlyGoal | null = null;
    let metricsError: string | null = null;
    let teamCalendarUrl: string | null = null;
    let teamId: string | null = null;

    if (metricsResponse.success && metricsResponse.data) {
      metricsData = metricsResponse.data.currentMonth;
    } else {
      metricsError = 'No pudimos cargar las métricas del mes.';
    }

    if (goalsResponse.success && goalsResponse.data) {
      goalsData = goalsResponse.data;
    }

    // Get team calendar URL - find first team where user is a member that has calendarUrl configured
    if (teamsResponse.success && teamsResponse.data && teamsResponse.data.length > 0) {
      // Prioritize team with connected calendar (calendarId)
      const teamWithConnectedCalendar = teamsResponse.data.find((team) => team.calendarId);

      if (teamWithConnectedCalendar) {
        teamId = teamWithConnectedCalendar.id;
        teamCalendarUrl = teamWithConnectedCalendar.calendarUrl || null;
      } else {
        // Fallback to team with legacy calendarUrl
        const teamWithLegacyCalendar = teamsResponse.data.find((team) => team.calendarUrl);
        if (teamWithLegacyCalendar) {
          teamId = teamWithLegacyCalendar.id;
          teamCalendarUrl = teamWithLegacyCalendar.calendarUrl || null;
        }
      }
    }

    return {
      user,
      metricsData,
      goalsData,
      metricsError,
      teamCalendarUrl,
      teamId,
    };
  } catch (error) {
    // Check if it's a redirect (Next.js redirect throws)
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error; // Re-throw redirect
    }
    // For other errors, redirect to login as fallback
    redirect('/login');
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
  // getHomePageData will redirect to login only on actual auth errors (401/403)
  // For network/server errors, it returns null user to show error state
  const { user, metricsData, goalsData, metricsError, teamCalendarUrl, teamId } =
    await getHomePageData();

  // If no user and we didn't redirect, it's likely a network/server error
  // Show error state instead of redirecting (middleware already validated token)
  if (!user) {
    return (
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
        <Card>
          <CardContent>
            <Alert variant="error">
              <Stack direction="column" gap="md">
                <Text weight="medium">Error al cargar la página</Text>
                <Text size="sm" color="secondary">
                  No se pudo conectar con el servidor. Por favor, verifica que el servidor esté
                  ejecutándose y recarga la página.
                </Text>
              </Stack>
            </Alert>
          </CardContent>
        </Card>
      </main>
    );
  }

  // User exists - show authenticated home page with calendar and metrics
  return (
    <Suspense fallback={<HomePageLoading />}>
      <HomePageClient metricsData={metricsData} goalsData={goalsData} metricsError={metricsError} />
    </Suspense>
  );
}
