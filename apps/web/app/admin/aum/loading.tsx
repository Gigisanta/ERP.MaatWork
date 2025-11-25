/**
 * Loading component for admin AUM page
 * 
 * AI_DECISION: Create loading.tsx for streaming SSR
 * Justificación: Provides instant loading state while Server Component fetches data
 * Impacto: Better perceived performance, reduced layout shift
 */

import { Card, CardContent, Spinner, Stack, Text } from '@cactus/ui';

// Simple Skeleton component using Tailwind
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className || ''}`} />;
}

export default function AdminAumLoading() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
      <Stack direction="column" gap="lg">
        {/* Header skeleton */}
        <Card>
          <CardContent>
            <Stack direction="row" gap="md" align="center" justify="between" className="py-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-10 w-32" />
            </Stack>
          </CardContent>
        </Card>

        {/* Filters skeleton */}
        <Card>
          <CardContent>
            <Stack direction="row" gap="md" className="py-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
            </Stack>
          </CardContent>
        </Card>

        {/* Table skeleton */}
        <Card>
          <CardContent>
            <Stack direction="column" gap="md" className="py-4">
              {/* Table header */}
              <Stack direction="row" gap="md">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </Stack>
              {/* Table rows */}
              {Array.from({ length: 10 }).map((_, i) => (
                <Stack key={i} direction="row" gap="md">
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-48" />
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-24" />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </div>
  );
}

