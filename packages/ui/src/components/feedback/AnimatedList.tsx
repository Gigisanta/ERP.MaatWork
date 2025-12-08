'use client';

import React, { useState, useEffect, Children, isValidElement } from 'react';
import { cn } from '../../utils/cn';

export interface AnimatedListProps {
  /** Children to animate */
  children: React.ReactNode;
  /** Base delay between items in ms */
  baseDelay?: number;
  /** Initial delay before first item in ms */
  initialDelay?: number;
  /** Animation type */
  animation?: 'fade-up' | 'fade-in' | 'scale-in' | 'slide-left' | 'slide-right';
  /** Animation duration in ms */
  duration?: number;
  /** Whether animations are enabled */
  enabled?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Element type for the container */
  as?: keyof React.JSX.IntrinsicElements;
}

const animationClasses = {
  'fade-up': {
    initial: 'opacity-0 translate-y-4',
    animate: 'opacity-100 translate-y-0',
  },
  'fade-in': {
    initial: 'opacity-0',
    animate: 'opacity-100',
  },
  'scale-in': {
    initial: 'opacity-0 scale-95',
    animate: 'opacity-100 scale-100',
  },
  'slide-left': {
    initial: 'opacity-0 -translate-x-4',
    animate: 'opacity-100 translate-x-0',
  },
  'slide-right': {
    initial: 'opacity-0 translate-x-4',
    animate: 'opacity-100 translate-x-0',
  },
};

/**
 * AnimatedList - Wrapper that applies staggered animations to children
 *
 * AI_DECISION: Declarative component for consistent list animations
 * Justificación: Simplifies animation implementation across the app
 * Impacto: Reduces boilerplate and ensures animation consistency
 *
 * @example
 * ```tsx
 * <AnimatedList animation="fade-up" baseDelay={75}>
 *   {items.map(item => (
 *     <Card key={item.id}>{item.content}</Card>
 *   ))}
 * </AnimatedList>
 * ```
 */
export const AnimatedList = React.forwardRef<HTMLDivElement, AnimatedListProps>(
  (
    {
      children,
      baseDelay = 50,
      initialDelay = 0,
      animation = 'fade-up',
      duration = 500,
      enabled = true,
      className,
      as: Component = 'div',
      ...props
    },
    ref
  ) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      if (!enabled) {
        setMounted(false);
        return;
      }
      const timer = setTimeout(() => setMounted(true), 10);
      return () => clearTimeout(timer);
    }, [enabled]);

    const animConfig = animationClasses[animation];
    const childArray = Children.toArray(children);

    return React.createElement(
      Component as React.ElementType,
      {
        ref,
        className,
        ...props,
      } as React.HTMLAttributes<HTMLElement>,
      childArray.map((child, index) => {
        if (!isValidElement(child)) return child;

        const delay = initialDelay + index * baseDelay;
        const animationState = mounted ? animConfig.animate : animConfig.initial;

        return (
          <div
            key={child.key ?? index}
            className={cn('transition-all ease-out', animationState)}
            style={{
              transitionDuration: `${duration}ms`,
              transitionDelay: `${delay}ms`,
            }}
          >
            {child}
          </div>
        );
      })
    );
  }
);

AnimatedList.displayName = 'AnimatedList';

/**
 * AnimatedItem - Individual animated item for more control
 *
 * @example
 * ```tsx
 * <AnimatedItem index={0} animation="scale-in">
 *   <Card>Content</Card>
 * </AnimatedItem>
 * ```
 */
export interface AnimatedItemProps {
  children: React.ReactNode;
  /** Index for calculating delay */
  index?: number;
  /** Base delay multiplier */
  baseDelay?: number;
  /** Initial delay offset */
  initialDelay?: number;
  /** Animation type */
  animation?: 'fade-up' | 'fade-in' | 'scale-in' | 'slide-left' | 'slide-right';
  /** Animation duration in ms */
  duration?: number;
  /** Whether animation is enabled */
  enabled?: boolean;
  /** Additional className */
  className?: string;
}

export const AnimatedItem = React.forwardRef<HTMLDivElement, AnimatedItemProps>(
  (
    {
      children,
      index = 0,
      baseDelay = 50,
      initialDelay = 0,
      animation = 'fade-up',
      duration = 500,
      enabled = true,
      className,
      ...props
    },
    ref
  ) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      if (!enabled) {
        setMounted(false);
        return;
      }
      const timer = setTimeout(() => setMounted(true), 10);
      return () => clearTimeout(timer);
    }, [enabled]);

    const animConfig = animationClasses[animation];
    const delay = initialDelay + index * baseDelay;
    const animationState = mounted ? animConfig.animate : animConfig.initial;

    return (
      <div
        ref={ref}
        className={cn('transition-all ease-out', animationState, className)}
        style={{
          transitionDuration: `${duration}ms`,
          transitionDelay: `${delay}ms`,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

AnimatedItem.displayName = 'AnimatedItem';

export default AnimatedList;
