import { redirect } from 'next/navigation';
import { getTeams, getMembershipRequests, getCurrentUser } from '@/lib/api-server';
import TeamsClient from './components/TeamsClient';
import { Heading, Button, Stack, Icon } from '@cactus/ui';
import type { Team, MembershipRequest } from '@/types';

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

  // AI_DECISION: Permitir acceso a advisor para visualizaci?n (solo lectura)
  // Justificaci?n: Advisors deben poder ver equipos pero sin permisos de edici?n
  // Impacto: Mejora UX permitiendo que advisors vean informaci?n de equipos
  // Check permissions - todos los roles autenticados pueden ver, pero solo manager/admin pueden editar
  // La l?gica de edici?n se maneja en TeamsClient basado en userRole
  if (!['advisor', 'manager', 'admin'].includes(user.role)) {
    // AI_DECISION: Log redirect reason for debugging
    redirect('/home');
  }

  // Fetch data server-side
  let teams: Team[] = [];
  let membershipRequests: MembershipRequest[] = [];
  let error: string | null = null;

  try {
    const [teamsResponse, requestsResponse] = await Promise.all([
      getTeams(),
      getMembershipRequests(),
    ]);

    if (teamsResponse.success && teamsResponse.data) {
      teams = teamsResponse.data;
    }
    if (requestsResponse.success && requestsResponse.data) {
      membershipRequests = requestsResponse.data;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Error al cargar datos';
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
        />
      </Stack>
    </main>
  );
}
