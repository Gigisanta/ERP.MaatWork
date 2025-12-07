/**
 * Loading component for benchmarks page
 * 
 * AI_DECISION: Create loading.tsx for streaming SSR
 * Justificación: Provides instant loading state while Server Component fetches data
 * Impacto: Better perceived performance, reduced layout shift
 */

import { Card, CardContent } from '@cactus/ui';
import { 
  SkeletonPageHeader, 
  SkeletonTable 
} from '../components/SkeletonLoader';

export default function BenchmarksLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      {/* Header skeleton */}
      <SkeletonPageHeader showBreadcrumb showActions />

      {/* Table skeleton */}
      <Card>
        <CardContent className="py-4">
          <SkeletonTable rows={5} columns={6} />
        </CardContent>
      </Card>
    </main>
  );
}

