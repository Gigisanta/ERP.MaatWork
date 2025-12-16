/**
 * useDebouncedState Hook
 *
 * AI_DECISION: Hook reutilizable para debounce con cleanup correcto
 * Justificación: Evita duplicación de lógica de debounce y asegura cleanup de timers
 * Impacto: Mejor performance y prevención de memory leaks
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Hook for debounced state management
 *
 * @param initialValue - Initial value for the state
 * @param delay - Delay in milliseconds before updating debounced value
 * @returns [value, debouncedValue, setValue] - Current value, debounced value, and setter
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous timeout if it exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to update debounced value
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup timeout on unmount or when value/delay changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, delay]);

  return [value, debouncedValue, setValue];
}

/**
 * Hook for debounced value (simplified version)
 * Only returns the debounced value without exposing the setter
 *
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [value, delay]);

  return debouncedValue;
}
