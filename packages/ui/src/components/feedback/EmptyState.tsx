'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Enable entrance animations */
  animated?: boolean;
  /** Enable floating animation on icon */
  floatingIcon?: boolean;
}

/**
 * EmptyState component with enhanced animations
 * 
 * AI_DECISION: Added animations for better UX feedback
 * Justificación: Animated empty states feel more polished and engaging
 * Impacto: Better perceived quality of the app
 */
export default function EmptyState({ 
  title, 
  description, 
  icon, 
  action, 
  className = '',
  animated = true,
  floatingIcon = true
}: EmptyStateProps) {
  const [mounted, setMounted] = useState(!animated);

  useEffect(() => {
    if (!animated) return;
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, [animated]);

  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        animated && 'transition-all duration-500 ease-out',
        animated && (mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'),
        className
      )}
    >
      {icon && (
        <div 
          className={cn(
            'mb-4 text-4xl text-text-muted',
            floatingIcon && 'animate-float',
            animated && 'transition-all duration-500 ease-out',
            animated && (mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90')
          )}
          style={{ transitionDelay: animated ? '100ms' : '0ms' }}
        >
          {icon}
        </div>
      )}
      <h3 
        className={cn(
          'text-lg font-medium text-text mb-2 font-display',
          animated && 'transition-all duration-500 ease-out',
          animated && (mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')
        )}
        style={{ transitionDelay: animated ? '200ms' : '0ms' }}
      >
        {title}
      </h3>
      {description && (
        <p 
          className={cn(
            'text-sm text-text-secondary mb-4 max-w-sm font-body',
            animated && 'transition-all duration-500 ease-out',
            animated && (mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')
          )}
          style={{ transitionDelay: animated ? '300ms' : '0ms' }}
        >
          {description}
        </p>
      )}
      {action && (
        <div 
          className={cn(
            'mt-4',
            animated && 'transition-all duration-500 ease-out',
            animated && (mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95')
          )}
          style={{ transitionDelay: animated ? '400ms' : '0ms' }}
        >
          {action}
        </div>
      )}
    </div>
  );
}