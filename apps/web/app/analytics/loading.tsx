/**
 * Loading component for analytics page
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

export default function AnalyticsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
      <Stack direction="column" gap="lg">
        {/* Header skeleton */}
        <Card>
          <CardContent>
            <Skeleton className="h-8 w-48 py-4" />
          </CardContent>
        </Card>

        {/* Chart skeleton */}
        <Card>
          <CardContent>
            <Stack direction="column" gap="md" className="py-8">
              <Skeleton className="h-6 w-64 mx-auto" />
              <Skeleton className="h-64 w-full" />
            </Stack>
          </CardContent>
        </Card>

        {/* Metrics grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <Stack direction="column" gap="sm" className="py-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32" />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </div>
      </Stack>
    </div>
  );
}

