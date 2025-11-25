/**
 * Loading component for pipeline page
 * 
 * AI_DECISION: Create loading.tsx for streaming SSR
 * Justificación: Provides instant loading state while data is being fetched
 * Impacto: Better perceived performance, reduced layout shift
 */

import { Card, CardContent, CardHeader, Spinner, Stack, Text } from '@cactus/ui';

// Simple Skeleton component using Tailwind
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className || ''}`} />;
}

export default function PipelineLoading() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pb-4 lg:pb-6">
      <Stack direction="column" gap="lg">
        {/* Header skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
        </Card>

        {/* Pipeline columns skeleton */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="min-w-[280px] flex-shrink-0">
              <CardHeader>
                <Stack direction="row" gap="md" align="center" justify="between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-8 rounded-full" />
                </Stack>
              </CardHeader>
              <CardContent>
                <Stack direction="column" gap="md" className="py-2">
                  {/* Contact cards skeleton */}
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Card key={j}>
                      <CardContent>
                        <Stack direction="column" gap="sm" className="py-3">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                          <Stack direction="row" gap="sm" className="mt-2">
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </div>
      </Stack>
    </div>
  );
}

