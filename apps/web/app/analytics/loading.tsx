/**
 * Loading component for analytics page
 *
 * AI_DECISION: Create loading.tsx for streaming SSR
 * Justificación: Provides instant loading state while Server Component fetches data
 * Impacto: Better perceived performance, reduced layout shift
 */

import { Card, CardContent, Stack } from '@cactus/ui';
import { Skeleton, SkeletonPageHeader, SkeletonCard } from '../components/SkeletonLoader';

export default function AnalyticsLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <Stack direction="column" gap="lg">
        {/* Header skeleton */}
        <SkeletonPageHeader showBreadcrumb />

        {/* Chart skeleton */}
        <Card className="overflow-hidden">
          <CardContent>
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-48 mx-auto" delay={50} />
              <Skeleton className="h-64 w-full" delay={100} />
            </div>
          </CardContent>
        </Card>

        {/* Metrics grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} showHeader={false} contentLines={3} delay={150 + i * 75} />
          ))}
        </div>
      </Stack>
    </main>
  );
}
