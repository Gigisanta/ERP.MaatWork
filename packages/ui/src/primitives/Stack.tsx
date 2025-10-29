import React from 'react';
import { cn } from '../utils/cn';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
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
        {
          'flex-row': direction === 'row',
          'flex-col': direction === 'column',
        },
        {
          'gap-1': gap === 'xs',
          'gap-2': gap === 'sm',
          'gap-4': gap === 'md',
          'gap-6': gap === 'lg',
          'gap-8': gap === 'xl',
        },
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


