/**
 * Loading component for benchmarks page
 * 
 * AI_DECISION: Create loading.tsx for streaming SSR
 * Justificación: Provides instant loading state while Server Component fetches data
 * Impacto: Better perceived performance, reduced layout shift
 */

import { Card, CardContent, Spinner, Stack, Text } from '@cactus/ui';

// Simple Skeleton component using inline styles
function Skeleton({ style }: { style?: React.CSSProperties }) {
  return <div className="animate-pulse bg-gray-200 rounded" style={style} />;
}

export default function BenchmarksLoading() {
  return (
    <main style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Skeleton style={{ height: 32, width: 200, marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Skeleton style={{ height: 20, width: 150 }} />
          <Skeleton style={{ height: 20, width: 1 }} />
          <Skeleton style={{ height: 20, width: 300 }} />
        </div>
      </div>

      <Card>
        <CardContent>
          <Stack direction="column" gap="md" className="py-4">
            {/* Table header skeleton */}
            <Stack direction="row" gap="md">
              <Skeleton style={{ height: 24, width: 100 }} />
              <Skeleton style={{ height: 24, width: 150 }} />
              <Skeleton style={{ height: 24, width: 100 }} />
              <Skeleton style={{ height: 24, width: 120 }} />
              <Skeleton style={{ height: 24, width: 100 }} />
              <Skeleton style={{ height: 24, width: 100 }} />
            </Stack>
            {/* Table rows skeleton */}
            {Array.from({ length: 5 }).map((_, i) => (
              <Stack key={i} direction="row" gap="md">
                <Skeleton style={{ height: 48, width: 100 }} />
                <Skeleton style={{ height: 48, width: 150 }} />
                <Skeleton style={{ height: 48, width: 100 }} />
                <Skeleton style={{ height: 48, width: 120 }} />
                <Skeleton style={{ height: 48, width: 100 }} />
                <Skeleton style={{ height: 48, width: 100 }} />
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </main>
  );
}

