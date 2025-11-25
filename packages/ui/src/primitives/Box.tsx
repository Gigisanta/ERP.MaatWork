import React from 'react';
import { cn } from '../utils/cn';
import { type ResponsiveProp } from '../tokens/breakpoints';
import { buildResponsiveClasses } from '../utils/responsive';

export interface BoxProps {
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
  className?: string;
  display?: ResponsiveProp<'block' | 'inline' | 'inline-block' | 'flex' | 'grid' | 'none'>;
  [key: string]: any;
}

export function Box({ as: Component = 'div', className, display, children, ...props }: BoxProps) {
  return (
    <Component 
      className={cn(
        buildResponsiveClasses(display, (d) =>
          d === 'block'
            ? 'block'
            : d === 'inline'
            ? 'inline'
            : d === 'inline-block'
            ? 'inline-block'
            : d === 'flex'
            ? 'flex'
            : d === 'grid'
            ? 'grid'
            : 'hidden'
        ),
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
