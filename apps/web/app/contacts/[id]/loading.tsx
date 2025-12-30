/**
 * Loading component for contact detail page
 *
 * AI_DECISION: Consistent loading skeleton with wave animation
 * Justificación: Better perceived performance during data fetch
 * Impacto: Unified loading experience matching app design
 */

import {
  Stack,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
} from '@maatwork/ui';

export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <Stack direction="column" gap="lg">
        {/* Header with avatar */}
        <div className="flex items-center gap-4">
          <SkeletonAvatar size="lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" delay={50} />
          </div>
        </div>

        {/* Info cards grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" delay={100} />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <SkeletonText lines={4} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" delay={150} />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <SkeletonText lines={4} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity section */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" delay={200} />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50"
                >
                  <SkeletonAvatar size="sm" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" delay={250 + i * 50} />
                    <Skeleton className="h-3 w-1/2" delay={275 + i * 50} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Stack>
    </main>
  );
}
