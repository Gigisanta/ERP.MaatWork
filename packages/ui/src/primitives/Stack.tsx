import React from 'react';
import { cn } from '../utils/cn';
import { type ResponsiveProp } from '../tokens/breakpoints';
import { buildResponsiveClasses } from '../utils/responsive';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: ResponsiveProp<'row' | 'column'>;
  gap?: ResponsiveProp<'xs' | 'sm' | 'md' | 'lg' | 'xl'>;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  children?: React.ReactNode;
  className?: string;
}

export function Stack({ 
  className, 
  children, 
  direction = 'column',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  ...props 
}: StackProps) {
  return (
    <div 
      className={cn(
        'flex',
        buildResponsiveClasses(direction, (d) => (d === 'row' ? 'flex-row' : 'flex-col')),
        buildResponsiveClasses(gap, (g) =>
          g === 'xs' ? 'gap-1' : g === 'sm' ? 'gap-2' : g === 'md' ? 'gap-4' : g === 'lg' ? 'gap-6' : 'gap-8'
        ),
        {
          'items-start': align === 'start',
          'items-center': align === 'center',
          'items-end': align === 'end',
          'items-stretch': align === 'stretch',
        },
        {
          'justify-start': justify === 'start',
          'justify-center': justify === 'center',
          'justify-end': justify === 'end',
          'justify-between': justify === 'between',
          'justify-around': justify === 'around',
          'justify-evenly': justify === 'evenly',
        },
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}


