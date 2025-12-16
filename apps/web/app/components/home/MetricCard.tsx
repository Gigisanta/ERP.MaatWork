'use client';

import { Card, CardContent, Text, Stack } from '@cactus/ui';
import { useMemo, useEffect, useState, memo } from 'react';

interface MetricCardProps {
  title: string;
  actual: number;
  goal: number;
  color: string;
  /** Animation delay index for staggered animations */
  index?: number;
}

/**
 * Card individual para mostrar una métrica con su valor actual y objetivo
 * Con animaciones de entrada staggered y progress bar animado
 *
 * AI_DECISION: Memoizado para evitar re-renders innecesarios
 * Justificación: Solo debe re-renderizar si cambian los valores reales, no el timestamp
 * Impacto: Menos re-renders en dashboard home, mejor performance
 */
function MetricCardComponent({ title, actual, goal, color, index = 0 }: MetricCardProps) {
  const [mounted, setMounted] = useState(false);
  const [animateProgress, setAnimateProgress] = useState(false);

  useEffect(() => {
    // Trigger mount animation
    const mountTimer = setTimeout(() => setMounted(true), 50);
    // Trigger progress bar animation after card is visible
    const progressTimer = setTimeout(() => setAnimateProgress(true), 300 + index * 100);

    return () => {
      clearTimeout(mountTimer);
      clearTimeout(progressTimer);
    };
  }, [index]);

  const percentage = useMemo(() => {
    if (goal === 0) return 0;
    return Math.min((actual / goal) * 100, 100);
  }, [actual, goal]);

  // AI_DECISION: Use color-mix for robust color manipulation
  // Justificación: Previous string manipulation of var() was fragile and invalid for some CSS variable formats.
  // Impacto: Correctly renders background tints in all themes and with all color formats (hex, var, etc).
  const getBackgroundColor = (colorValue: string) => {
    // 92% transparent = 0.08 opacity
    return `color-mix(in srgb, ${colorValue}, transparent 92%)`;
  };

  const getGlowColor = (colorValue: string) => {
    // 85% transparent = 0.15 opacity
    return `color-mix(in srgb, ${colorValue}, transparent 85%)`;
  };

  return (
    <div
      className={`
        transition-all duration-500 ease-out
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
      `}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <Card
        className="relative overflow-hidden hover-lift group cursor-default"
        style={{
          borderTop: `3px solid ${color}`,
          backgroundColor: getBackgroundColor(color),
        }}
      >
        {/* Subtle glow effect on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at top, ${getGlowColor(color)}, transparent 70%)`,
          }}
        />

        {/* AI_DECISION: Reduce padding for optimized layout */}
        <CardContent className="p-3 relative">
          <Stack direction="column" gap="xs">
            {/* Title */}
            <Text
              size="xs"
              color="secondary"
              className="font-medium uppercase tracking-wide truncate"
            >
              {title}
            </Text>

            {/* Value with count-up animation feel */}
            <div className="flex flex-col items-start -space-y-0.5">
              <Text
                size="lg"
                className="font-bold text-2xl transition-all duration-300 leading-tight"
                style={{ color }}
              >
                {actual}
              </Text>
              {goal > 0 && (
                <Text size="xs" color="muted" className="font-medium">
                  / {goal}
                </Text>
              )}
            </div>

            {/* Percentage badge and progress bar in one line to save space if needed, 
                but here keeping stacked but tighter */}
            {goal > 0 && (
              <>
                <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: animateProgress ? `${percentage}%` : '0%',
                      backgroundColor: color,
                      boxShadow: `0 0 8px ${getGlowColor(color)}`,
                    }}
                  />
                </div>
                <div className="flex justify-end">
                  <span
                    className={`
                      text-xs font-semibold
                      ${
                        percentage >= 100
                          ? 'text-success'
                          : percentage >= 75
                            ? 'text-accent-hover'
                            : percentage >= 50
                              ? 'text-warning'
                              : 'text-text-secondary'
                      }
                    `}
                  >
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </div>
  );
}

// Memoize with custom comparison - ignore timestamp changes if values are equal
export const MetricCard = memo(MetricCardComponent, (prev, next) => {
  // Compare by title, actual value, goal, and color
  if (prev.title !== next.title) return false;
  if (prev.actual !== next.actual) return false;
  if (prev.goal !== next.goal) return false;
  if (prev.color !== next.color) return false;
  // Index can change without affecting display, but we compare it anyway for consistency
  // The component will re-render if index changes, but that's acceptable
  return true;
});
