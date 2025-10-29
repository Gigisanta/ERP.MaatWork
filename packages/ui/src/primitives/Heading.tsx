import React from 'react';
import { cn } from '../utils/cn';

export interface HeadingProps {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children?: React.ReactNode;
  className?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  [key: string]: any;
}

export function Heading({ 
  as, 
  className, 
  children, 
  level = 1,
  ...props 
}: HeadingProps) {
  const Component = as || (`h${level}` as keyof JSX.IntrinsicElements);
  
  return (
    <Component 
      className={cn(
        {
          'text-4xl font-bold': level === 1,
          'text-3xl font-bold': level === 2,
          'text-2xl font-semibold': level === 3,
          'text-xl font-semibold': level === 4,
          'text-lg font-medium': level === 5,
          'text-base font-medium': level === 6,
        },
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  );
}
