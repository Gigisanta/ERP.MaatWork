import React from 'react';
import { cn } from '../utils/cn';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
}

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  rowSpan?: 1 | 2 | 3 | 4 | 5 | 6;
  children?: React.ReactNode;
}

export function Grid({ 
  className, 
  children, 
  cols = 1,
  gap = 'md',
  ...props 
}: GridProps) {
  return (
    <div 
      className={cn(
        'grid',
        {
          'grid-cols-1': cols === 1,
          'grid-cols-2': cols === 2,
          'grid-cols-3': cols === 3,
          'grid-cols-4': cols === 4,
          'grid-cols-5': cols === 5,
          'grid-cols-6': cols === 6,
          'grid-cols-12': cols === 12,
        },
        {
          'gap-1': gap === 'xs',
          'gap-2': gap === 'sm',
          'gap-4': gap === 'md',
          'gap-6': gap === 'lg',
          'gap-8': gap === 'xl',
        },
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


