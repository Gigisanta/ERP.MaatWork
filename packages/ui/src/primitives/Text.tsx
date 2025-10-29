import React from 'react';
import { cn } from '../utils/cn';

export interface TextProps {
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'muted';
  [key: string]: any;
}

export function Text({ 
  as: Component = 'p', 
  className, 
  children, 
  size = 'base',
  weight = 'normal',
  color = 'primary',
  ...props 
}: TextProps) {
  return (
    <Component 
      className={cn(
        // Size classes
        {
          'text-xs': size === 'xs',
          'text-sm': size === 'sm',
          'text-base': size === 'base',
          'text-lg': size === 'lg',
          'text-xl': size === 'xl',
        },
        // Weight classes
        {
          'font-normal': weight === 'normal',
          'font-medium': weight === 'medium',
          'font-semibold': weight === 'semibold',
          'font-bold': weight === 'bold',
        },
        // Color classes
        {
          'text-text': color === 'primary',
          'text-text-secondary': color === 'secondary',
          'text-text-muted': color === 'muted',
        },
        className
      )} 
      {...props}
    >
      {children}
    </Component>
  );
}
