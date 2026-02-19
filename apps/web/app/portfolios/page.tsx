import { redirect } from 'next/navigation';
import { getPortfolios, getCurrentUser } from '@/lib/api-server';
import { Alert } from '@maatwork/ui';
import PortfoliosClient from './components/PortfoliosClient';
import type { Portfolio } from '@/types';

// AI_DECISION: Convert to Server Component with Client Islands pattern
// Justificación: Reduces First Load JS ~40KB, better SEO, faster initial load
// Impacto: Page loads faster, better performance, reduced hydration JS

// AI_DECISION: Force dynamic rendering for portfolios page
// Justificación: Page requires authentication via cookies(), cannot be pre-rendered statically
// Impacto: Dynamic rendering on each request, but necessary for authentication
export const dynamic = 'force-dynamic';

export default async function PortfoliosPage() {
  // Check authentication and get user
  let user;
  try {
    const userResponse = await getCurrentUser();
    if (!userResponse.success || !userResponse.data) {
      redirect('/login');
    }
    user = userResponse.data;
  } catch {
    redirect('/login');
  }

  // Check permissions - only admin and managers can manage portfolios
  if (user.role !== 'admin' && user.role !== 'manager') {
    redirect('/home');
  }

  // Fetch data server-side
  let portfolios: Portfolio[] = [];
  let error: string | null = null;

  try {
    const portfoliosResponse = await getPortfolios();
    if (portfoliosResponse.success && portfoliosResponse.data) {
      portfolios = portfoliosResponse.data.data;
    } else {
      error = portfoliosResponse.error || 'Error al cargar carteras';
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Error al cargar carteras';
  }

  return (
    <>
      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}
      <PortfoliosClient initialPortfolios={portfolios} />
    </>
  );
}
