import React from 'react';
import { cn } from '../utils/cn';

export interface BoxProps {
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export function Box({ as: Component = 'div', className, children, ...props }: BoxProps) {
  return (
    <Component className={cn(className)} {...props}>
      {children}
    </Component>
  );
}
