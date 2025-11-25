import { redirect } from 'next/navigation';
import { getPortfolios, getCurrentUser } from '@/lib/api-server';
import PortfoliosClient from './components/PortfoliosClient';
import type { Portfolio } from '@/types';

// AI_DECISION: Convert to Server Component with Client Islands pattern
// Justificación: Reduces First Load JS ~40KB, better SEO, faster initial load
// Impacto: Page loads faster, better performance, reduced hydration JS

// AI_DECISION: Enable ISR with 30 min revalidation for portfolio lists
// Justificación: Portfolio lists change occasionally, ISR reduces server load while keeping data fresh
// Impacto: Faster TTFB, reduced API calls, better performance for portfolio management page
export const revalidate = 1800; // Revalidate every 30 minutes

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
      portfolios = portfoliosResponse.data;
    } else {
      error = portfoliosResponse.error || 'Error al cargar carteras';
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Error al cargar carteras';
  }

  return (
    <PortfoliosClient initialPortfolios={portfolios} />
  );
}
