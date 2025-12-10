import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCapacitaciones } from '@/lib/api-server';
import CapacitacionesList from './CapacitacionesList';
import type { CapacitacionesListResponse } from '@/types/capacitaciones';

// AI_DECISION: Convert to Server Component with Client Islands pattern
// Justificación: Reduces First Load JS ~10-20KB, better SEO, faster initial load
// Impacto: Page loads faster, better performance, reduced hydration JS

export default async function CapacitacionesPage() {
  // Check authentication via cookies (middleware handles redirect, but we verify here too)
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');

  if (!tokenCookie) {
    redirect('/login');
  }

  // Fetch data server-side
  let initialData: CapacitacionesListResponse | null = null;
  let error: string | null = null;

  try {
    const response = await getCapacitaciones({ limit: 50 });
    if (!response.success || !response.data) {
      error = 'Failed to fetch capacitaciones';
    } else {
      initialData = response.data;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <CapacitacionesList initialData={initialData} initialError={error} />
    </div>
  );
}
