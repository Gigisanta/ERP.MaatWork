/**
 * Loading component for contacts page
 *
 * AI_DECISION: Avoid @maatwork/ui imports in loading components to prevent webpack module resolution issues
 * Justificación: @maatwork/ui has circular dependency issues with SkeletonLoader in loading contexts
 * Impacto: Eliminates "Cannot read properties of undefined (reading 'call')" webpack errors
 */

import { Skeleton, SkeletonTable } from '@maatwork/ui';

export default function ContactsLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="flex flex-col gap-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32 rounded-lg" delay={50} />
        </div>

        {/* Filters skeleton */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="py-3">
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-10 w-64" delay={100} />
              <Skeleton className="h-10 w-48" delay={150} />
              <Skeleton className="h-10 w-48" delay={200} />
            </div>
          </div>
        </div>

        {/* Table skeleton */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="py-4">
            <SkeletonTable rows={8} columns={4} />
          </div>
        </div>
      </div>
    </main>
  );
}
