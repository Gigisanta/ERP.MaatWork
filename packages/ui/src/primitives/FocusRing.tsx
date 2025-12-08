import React from 'react';
import { cn } from '../utils/cn';

export interface FocusRingProps {
  children: React.ReactNode;
  className?: string;
}

export function FocusRing({ children, className }: FocusRingProps) {
  return (
    <div
      className={cn(
        'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
        className
      )}
    >
      {children}
    </div>
  );
}
