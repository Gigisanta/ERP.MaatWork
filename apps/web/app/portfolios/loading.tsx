/**
 * Loading component for portfolios page
 *
 * AI_DECISION: Create loading.tsx for streaming SSR
 * Justificación: Provides instant loading state while Server Component fetches data
 * Impacto: Better perceived performance, reduced layout shift
 */

import { Stack, SkeletonPageHeader, SkeletonGrid } from '@maatwork/ui';

export default function PortfoliosLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <Stack direction="column" gap="lg">
        {/* Header skeleton */}
        <SkeletonPageHeader showActions />

        {/* Grid skeleton */}
        <SkeletonGrid items={6} columns={3} showCardHeader contentLines={3} />
      </Stack>
    </main>
  );
}
