/**
 * Loading component for pipeline page
 *
 * AI_DECISION: Create loading.tsx for streaming SSR
 * Justificación: Provides instant loading state while data is being fetched
 * Impacto: Better perceived performance, reduced layout shift
 */

import { Card, CardContent, CardHeader, Stack } from '@cactus/ui';
import { Skeleton, SkeletonCard } from '../components/SkeletonLoader';

export default function PipelineLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <Stack direction="column" gap="lg">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" delay={50} />
          </div>
        </div>

        {/* Pipeline columns skeleton */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="min-w-[280px] flex-shrink-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" delay={i * 50} />
                  <Skeleton className="h-6 w-8" rounded="full" delay={i * 50 + 25} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 py-2">
                  {/* Contact cards skeleton */}
                  {Array.from({ length: 3 }).map((_, j) => (
                    <SkeletonCard
                      key={j}
                      showHeader={false}
                      contentLines={2}
                      showFooter
                      delay={100 + i * 100 + j * 75}
                      className="border-border/50"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Stack>
    </main>
  );
}
