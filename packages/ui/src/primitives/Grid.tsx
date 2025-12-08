import React from 'react';
import { cn } from '../utils/cn';
import { type ResponsiveProp } from '../tokens/breakpoints';
import { buildResponsiveClasses } from '../utils/responsive';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: ResponsiveProp<1 | 2 | 3 | 4 | 5 | 6 | 12>;
  gap?: ResponsiveProp<'xs' | 'sm' | 'md' | 'lg' | 'xl'>;
  children?: React.ReactNode;
}

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  rowSpan?: 1 | 2 | 3 | 4 | 5 | 6;
  children?: React.ReactNode;
}

export function Grid({ className, children, cols = 1, gap = 'md', ...props }: GridProps) {
  return (
    <div
      className={cn(
        'grid',
        buildResponsiveClasses(cols, (c) =>
          c === 1
            ? 'grid-cols-1'
            : c === 2
              ? 'grid-cols-2'
              : c === 3
                ? 'grid-cols-3'
                : c === 4
                  ? 'grid-cols-4'
                  : c === 5
                    ? 'grid-cols-5'
                    : c === 6
                      ? 'grid-cols-6'
                      : 'grid-cols-12'
        ),
        buildResponsiveClasses(gap, (g) =>
          g === 'xs'
            ? 'gap-1'
            : g === 'sm'
              ? 'gap-2'
              : g === 'md'
                ? 'gap-4'
                : g === 'lg'
                  ? 'gap-6'
                  : 'gap-8'
        ),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function GridItem({
  className,
  children,
  colSpan = 1,
  rowSpan = 1,
  ...props
}: GridItemProps) {
  return (
    <div
      className={cn(
        {
          'col-span-1': colSpan === 1,
          'col-span-2': colSpan === 2,
          'col-span-3': colSpan === 3,
          'col-span-4': colSpan === 4,
          'col-span-5': colSpan === 5,
          'col-span-6': colSpan === 6,
          'col-span-12': colSpan === 12,
        },
        {
          'row-span-1': rowSpan === 1,
          'row-span-2': rowSpan === 2,
          'row-span-3': rowSpan === 3,
          'row-span-4': rowSpan === 4,
          'row-span-5': rowSpan === 5,
          'row-span-6': rowSpan === 6,
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
