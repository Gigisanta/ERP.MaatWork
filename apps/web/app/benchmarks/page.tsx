import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getBenchmarks, getCurrentUser } from '@/lib/api-server';
import BenchmarksClient from './components/BenchmarksClient';
import { Heading, Text, Alert } from '@cactus/ui';
import type { Benchmark } from '@/types';

// AI_DECISION: Convert to Server Component with Client Islands pattern
// Justificación: Reduces First Load JS ~40KB, better SEO, faster initial load
// Impacto: Page loads faster, better performance, reduced hydration JS

// AI_DECISION: Force dynamic rendering for benchmarks page
// Justificación: Page requires authentication via cookies(), cannot be pre-rendered statically
// Impacto: Dynamic rendering on each request, but necessary for authentication
export const dynamic = 'force-dynamic';

export default async function BenchmarksPage() {
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

  // Solo admin puede gestionar benchmarks
  if (user.role !== 'admin') {
    return (
      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Alert variant="warning" title="Acceso restringido">
          No tienes permisos para gestionar benchmarks.
        </Alert>
        <Link
          href="/home"
          className="inline-block mt-4 text-info hover:underline transition-colors"
        >
          ← Volver al inicio
        </Link>
      </main>
    );
  }

  // Fetch data server-side
  let benchmarks: Benchmark[] = [];
  let error: string | null = null;

  try {
    const response = await getBenchmarks();
    if (response.success && response.data) {
      benchmarks = response.data || [];
    } else {
      error = response.error || 'Failed to fetch benchmarks';
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Heading level={1} className="mb-2">
          📈 Benchmarks
        </Heading>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/home" className="text-info hover:underline transition-colors text-sm">
            ← Volver al inicio
          </Link>
          <span className="text-text-muted">|</span>
          <Text size="sm" color="secondary">
            Gestión de benchmarks para comparación de carteras
          </Text>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="error" title="Error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Content */}
      {!error && <BenchmarksClient initialBenchmarks={benchmarks} />}
    </main>
  );
}
