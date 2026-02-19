'use client';
import React from 'react';
import { cn } from '../../../utils/cn.js';
import { Skeleton, SkeletonAnimation } from '../Skeleton.js';

// --- SkeletonText ---
export interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: string;
  gap?: 'sm' | 'md' | 'lg';
  animation?: SkeletonAnimation;
}
const gapClasses = { sm: 'space-y-1', md: 'space-y-2', lg: 'space-y-3' };

export function SkeletonText({
  lines = 3,
  lastLineWidth = '75%',
  gap = 'md',
  animation = 'wave',
}: SkeletonTextProps) {
  return (
    <div className={cn(gapClasses[gap])}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? '' : 'w-full')}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          animation={animation}
          delay={i * 50}
        />
      ))}
    </div>
  );
}

// --- SkeletonAvatar ---
export function SkeletonAvatar({
  size = 'md',
  animation = 'wave',
}: {
  size?: 'sm' | 'md' | 'lg';
  animation?: SkeletonAnimation;
}) {
  const sizeMap = { sm: 32, md: 40, lg: 48 };
  return (
    <Skeleton variant="circle" width={sizeMap[size]} height={sizeMap[size]} animation={animation} />
  );
}

// --- SkeletonCard ---
export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  showHeader?: boolean;
  showFooter?: boolean;
  showAvatar?: boolean;
  contentLines?: number;
  delay?: number;
  lines?: number;
}
export const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ showHeader = true, showFooter = false, showAvatar = false, contentLines = 3, lines, delay = 0, className, ...props }, ref) => {
    const actualContentLines = lines || contentLines;
    return (
      <div ref={ref} className={cn('rounded-lg border border-border bg-surface p-4 space-y-4 animate-fade-in', className)} style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined} {...props}>
        {showHeader && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 w-full">
              {showAvatar && <Skeleton variant="circle" width={40} height={40} delay={delay} />}
              <Skeleton className="h-6 w-1/3" delay={delay + 50} />
            </div>
            <Skeleton className="h-6 w-20" delay={delay + 100} />
          </div>
        )}
        <div className="space-y-2">
          {Array.from({ length: actualContentLines }).map((_, i) => (
            <Skeleton key={i} className={cn('h-4', i === actualContentLines - 1 ? 'w-2/3' : 'w-full')} delay={delay + 150 + i * 50} />
          ))}
        </div>
        {showFooter && (
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-9 w-24" rounded="lg" delay={delay + 300} />
            <Skeleton className="h-9 w-24" rounded="lg" delay={delay + 350} />
          </div>
        )}
      </div>
    );
  }
);
SkeletonCard.displayName = 'SkeletonCard';

// --- SkeletonTable ---
function SkeletonTableRow({ columns = 5, delay = 0 }: { columns?: number; delay?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-b-0">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4 flex-1', i === 0 ? 'max-w-[200px]' : 'max-w-[150px]')} delay={delay + i * 30} />
      ))}
    </div>
  );
}

export interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}
export const SkeletonTable = React.forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ rows = 5, columns = 5, showHeader = true, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {showHeader && (
          <div className="flex items-center gap-4 py-3 border-b-2 border-border mb-1">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-5 flex-1 max-w-[150px]" delay={i * 30} />
            ))}
          </div>
        )}
        <div>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} delay={(i + 1) * 75} />
          ))}
        </div>
      </div>
    );
  }
);
SkeletonTable.displayName = 'SkeletonTable';

// --- SkeletonGrid ---
export function SkeletonGrid({ items = 6, columns = 3, showCardHeader = true, contentLines = 3 }: { items?: number; columns?: 2 | 3 | 4; showCardHeader?: boolean; contentLines?: number; }) {
  const gridClasses = { 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' };
  return (
    <div className={cn('grid gap-4', gridClasses[columns as keyof typeof gridClasses])}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard
          key={i}
          showHeader={showCardHeader}
          contentLines={contentLines}
          delay={i * 75}
        />
      ))}
    </div>
  );
}

// --- SkeletonPageHeader ---
export function SkeletonPageHeader({ showBreadcrumb = false, showActions = true }: { showBreadcrumb?: boolean; showActions?: boolean; }) {
  return (
    <div className="space-y-3 mb-6 animate-fade-in">
      {showBreadcrumb && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" delay={50} />
        {showActions && (
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" delay={100} />
          </div>
        )}
      </div>
    </div>
  );
}

// --- SkeletonGroup ---
export interface SkeletonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column';
  gap?: 'sm' | 'md' | 'lg';
}
export const SkeletonGroup = React.forwardRef<HTMLDivElement, SkeletonGroupProps>(
  ({ direction = 'row', gap = 'md', className, children, ...props }, ref) => {
    const gapClass = gap === 'sm' ? 'gap-2' : gap === 'lg' ? 'gap-4' : 'gap-3';
    return (
      <div ref={ref} className={cn('flex', direction === 'column' ? 'flex-col' : 'flex-row items-center', gapClass, className)} {...props}>
        {children}
      </div>
    );
  }
);
SkeletonGroup.displayName = 'SkeletonGroup';
