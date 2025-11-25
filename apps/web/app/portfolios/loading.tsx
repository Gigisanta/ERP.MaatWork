/**
 * Loading component for portfolios page
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

export default function PortfoliosLoading() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
      <Stack direction="column" gap="lg">
        {/* Header skeleton */}
        <Card>
          <CardContent>
            <Stack direction="row" gap="md" align="center" justify="between" className="py-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-10 w-40" />
            </Stack>
          </CardContent>
        </Card>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <Stack direction="column" gap="md" className="py-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-10 w-full mt-4" />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </div>
      </Stack>
    </div>
  );
}

