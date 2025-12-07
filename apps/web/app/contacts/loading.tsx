/**
 * Loading component for contacts page
 * 
 * AI_DECISION: Use centralized SkeletonLoader for consistency
 * Justificación: Eliminates duplicate Skeleton definitions
 * Impacto: Better DRY, consistent skeleton-wave animation
 */

import { Card, CardContent, Stack } from '@cactus/ui';
import { Skeleton, SkeletonTable } from '../components/SkeletonLoader';

export default function ContactsLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <Stack direction="column" gap="lg">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32 rounded-lg" delay={50} />
        </div>

        {/* Filters skeleton */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-10 w-64" delay={100} />
              <Skeleton className="h-10 w-48" delay={150} />
              <Skeleton className="h-10 w-48" delay={200} />
            </div>
          </CardContent>
        </Card>

        {/* Table skeleton */}
        <Card>
          <CardContent className="py-4">
            <SkeletonTable rows={8} columns={4} />
          </CardContent>
        </Card>
      </Stack>
    </main>
  );
}
