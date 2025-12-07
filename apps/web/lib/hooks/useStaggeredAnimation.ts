/**
 * useStaggeredAnimation - Hook for staggered entrance animations
 * 
 * AI_DECISION: Centralized hook for consistent staggered animations across the app
 * Justificación: Reduces code duplication and ensures consistent animation timing
 * Impacto: Uniform entrance animations for lists, grids, and sequential content
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface UseStaggeredAnimationOptions {
  /** Base delay between items in ms (default: 50) */
  baseDelay?: number;
  /** Initial delay before first item animates in ms (default: 0) */
  initialDelay?: number;
  /** Maximum total delay cap in ms to prevent too slow animations (default: 1000) */
  maxTotalDelay?: number;
  /** Whether animation should trigger (default: true) */
  enabled?: boolean;
}

export interface UseStaggeredAnimationReturn {
  /** Whether the component has mounted and animations should start */
  mounted: boolean;
  /** Get the animation delay for a specific item index */
  getDelay: (index: number) => number;
  /** Get inline style object with animation delay */
  getDelayStyle: (index: number) => React.CSSProperties;
  /** Get className for staggered animation */
  getAnimationClass: (index: number, baseClass?: string) => string;
}

/**
 * Hook for creating staggered entrance animations on lists and grids
 * 
 * @example
 * ```tsx
 * const { mounted, getDelayStyle, getAnimationClass } = useStaggeredAnimation({
 *   baseDelay: 75,
 *   initialDelay: 100,
 * });
 * 
 * return (
 *   <div className="grid grid-cols-3 gap-4">
 *     {items.map((item, index) => (
 *       <div
 *         key={item.id}
 *         className={getAnimationClass(index, 'card')}
 *         style={getDelayStyle(index)}
 *       >
 *         {item.content}
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useStaggeredAnimation(
  options: UseStaggeredAnimationOptions = {}
): UseStaggeredAnimationReturn {
  const {
    baseDelay = 50,
    initialDelay = 0,
    maxTotalDelay = 1000,
    enabled = true,
  } = options;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setMounted(false);
      return;
    }

    // Small timeout to ensure DOM is ready before triggering animations
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, [enabled]);

  const getDelay = useCallback(
    (index: number): number => {
      const calculatedDelay = initialDelay + index * baseDelay;
      return Math.min(calculatedDelay, maxTotalDelay);
    },
    [baseDelay, initialDelay, maxTotalDelay]
  );

  const getDelayStyle = useCallback(
    (index: number): React.CSSProperties => ({
      transitionDelay: `${getDelay(index)}ms`,
      animationDelay: `${getDelay(index)}ms`,
    }),
    [getDelay]
  );

  const getAnimationClass = useCallback(
    (index: number, baseClass = ''): string => {
      const animationState = mounted
        ? 'opacity-100 translate-y-0'
        : 'opacity-0 translate-y-4';
      
      return `transition-all duration-500 ease-out ${animationState} ${baseClass}`.trim();
    },
    [mounted]
  );

  return useMemo(
    () => ({
      mounted,
      getDelay,
      getDelayStyle,
      getAnimationClass,
    }),
    [mounted, getDelay, getDelayStyle, getAnimationClass]
  );
}

/**
 * Simplified version for basic fade-in stagger
 */
export function useSimpleStagger(itemCount: number, baseDelay = 50) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return {
    mounted,
    getDelay: (index: number) => index * baseDelay,
  };
}

export default useStaggeredAnimation;
