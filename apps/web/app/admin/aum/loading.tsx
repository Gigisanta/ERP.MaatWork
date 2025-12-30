/**
 * Loading component for admin AUM page
 *
 * AI_DECISION: Create loading.tsx for streaming SSR
 * Justificación: Provides instant loading state while Server Component fetches data
 * Impacto: Better perceived performance, reduced layout shift
 */

import {
  Card,
  CardContent,
  Stack,
  Skeleton,
  SkeletonPageHeader,
  SkeletonTable,
} from '@maatwork/ui';

export default function AdminAumLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <Stack direction="column" gap="lg">
        {/* Header skeleton */}
        <SkeletonPageHeader showActions />

        {/* Filters skeleton */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-10 w-64" delay={50} />
              <Skeleton className="h-10 w-48" delay={100} />
              <Skeleton className="h-10 w-48" delay={150} />
            </div>
          </CardContent>
        </Card>

        {/* Table skeleton */}
        <Card>
          <CardContent className="py-4">
            <SkeletonTable rows={10} columns={5} />
          </CardContent>
        </Card>
      </Stack>
    </main>
  );
}
