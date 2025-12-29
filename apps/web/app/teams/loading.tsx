/**
 * Loading component for teams page
 *
 * AI_DECISION: Use centralized SkeletonLoader for consistency
 * Justificación: Eliminates duplicate Skeleton definitions
 * Impacto: Better DRY, consistent skeleton-wave animation
 */

import { Card, CardContent, Stack, Skeleton, SkeletonCard } from '@maatwork/ui';

export default function TeamsLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <Stack direction="column" gap="lg">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40 rounded-lg" delay={50} />
        </div>

        {/* Teams grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} showHeader contentLines={3} showFooter delay={100 + i * 75} />
          ))}
        </div>
      </Stack>
    </main>
  );
}
