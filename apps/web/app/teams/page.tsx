import { redirect } from 'next/navigation';
import {
  getTeams,
  getMembershipRequests,
  getCurrentUser,
  getMemberDashboard,
} from '@/lib/api-server';
import TeamsClient from './components/TeamsClient';
import MemberTeamDashboard from './components/MemberTeamDashboard';
import { Heading, Stack } from '@maatwork/ui';
import type { Team, MembershipRequest } from '@/types';
import type { MemberDashboardResponse } from '@/lib/api/teams';

// AI_DECISION: Convert to Server Component with Client Islands pattern
// Justificaci?n: Reduces First Load JS ~40KB, better SEO, faster initial load
// Impacto: Page loads faster, better performance, reduced hydration JS

// AI_DECISION: Force dynamic rendering for teams page
// Justificaci?n: Page requires authentication via cookies(), cannot be pre-rendered statically
// Impacto: Dynamic rendering on each request, but necessary for authentication
// Note: Previously attempted ISR (revalidate = 3600) but caused build error:
//       "Dynamic server usage: Route /teams couldn't be rendered statically because it used `cookies`"
export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  // Check authentication and get user
  let user;
  try {
    const userResponse = await getCurrentUser();
    if (!userResponse.success || !userResponse.data) {
      redirect('/login');
    }
    user = userResponse.data;
  } catch (err) {
    // AI_DECISION: Usar console.error en Server Components para errores cr?ticos
    // Justificaci?n: Server Components no tienen acceso a logger del cliente. console.error es apropiado para errores cr?ticos.
    // Impacto: Errores cr?ticos de autenticaci?n se loguean correctamente
    console.error('[TeamsPage] Error getting current user, redirecting to /login', err);
    redirect('/login');
  }

  // 1. MANAGER / ADMIN VIEW
  if (['manager', 'admin'].includes(user.role)) {
    // Fetch data server-side
    let teams: Team[] = [];
    let membershipRequests: MembershipRequest[] = [];
    let teamCalendarUrl: string | null = null;

    try {
      const [teamsResponse, requestsResponse] = await Promise.all([
        getTeams(),
        getMembershipRequests(),
      ]);

      if (teamsResponse.success && teamsResponse.data) {
        teams = teamsResponse.data;
        // Extract team calendar URL from the first team that has one
        const teamWithCalendar = teams.find((team) => team.calendarUrl);
        teamCalendarUrl = teamWithCalendar?.calendarUrl || null;
      }
      if (requestsResponse.success && requestsResponse.data) {
        membershipRequests = requestsResponse.data;
      }
    } catch (err) {
      console.error('Error loading teams data', err);
    }

    return (
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <Stack direction="column" gap="lg">
          {/* Header */}
          <div className="flex justify-between items-center">
            <Heading level={3}>Equipos</Heading>
          </div>

          <TeamsClient
            initialTeams={teams}
            initialMembershipRequests={membershipRequests}
            userRole={user.role}
            userId={user.id}
            isGoogleConnected={user.isGoogleConnected || false}
            teamCalendarUrl={teamCalendarUrl}
          />
        </Stack>
      </main>
    );
  }

  // 2. MEMBER VIEW (Advisor)
  // Fetch member dashboard data
  let dashboardData: MemberDashboardResponse | null = null;
  try {
    const dashboardResponse = await getMemberDashboard();
    if (dashboardResponse.success && dashboardResponse.data) {
      dashboardData = dashboardResponse.data;
    }
  } catch (err) {
    console.error('Error loading member dashboard', err);
  }

  // If failed to load or no data, show empty state or error handled by component
  if (!dashboardData) {
    // Fallback if API fails completely
    dashboardData = { hasTeam: false, team: null, metrics: null };
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
      <Stack direction="column" gap="lg">
        {/* Only show heading if not in dashboard component which has its own header */}
        {!dashboardData.hasTeam && (
          <div className="flex justify-between items-center">
            <Heading level={3}>Mi Equipo</Heading>
          </div>
        )}

        <MemberTeamDashboard data={dashboardData} />
      </Stack>
    </main>
  );
}
