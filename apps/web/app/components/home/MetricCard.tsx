"use client";

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
    const progressTimer = setTimeout(() => setAnimateProgress(true), 300 + (index * 100));
    
    return () => {
      clearTimeout(mountTimer);
      clearTimeout(progressTimer);
    };
  }, [index]);

  const percentage = useMemo(() => {
    if (goal === 0) return 0;
    return Math.min((actual / goal) * 100, 100);
  }, [actual, goal]);

  // Handle both hex colors and CSS variables
  const getBackgroundColor = (colorValue: string) => {
    if (colorValue.startsWith('var(')) {
      return colorValue.replace(')', ' / 0.08)');
    }
    const hex = colorValue.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.08)`;
  };

  const getGlowColor = (colorValue: string) => {
    if (colorValue.startsWith('var(')) {
      return colorValue.replace(')', ' / 0.15)');
    }
    const hex = colorValue.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
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
        
        <CardContent className="p-5 relative">
          <Stack direction="column" gap="sm">
            {/* Title */}
            <Text size="sm" color="secondary" className="font-medium uppercase tracking-wide">
              {title}
            </Text>
            
            {/* Value with count-up animation feel */}
            <div className="flex items-baseline gap-2">
              <Text 
                size="xl" 
                className="font-bold text-3xl transition-all duration-300"
                style={{ color }}
              >
                {actual}
              </Text>
              {goal > 0 && (
                <Text size="sm" color="muted" className="font-medium">
                  / {goal}
                </Text>
              )}
            </div>
            
            {/* Percentage badge */}
            {goal > 0 && (
              <div className="flex items-center gap-2">
                <span 
                  className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                    transition-all duration-300
                    ${percentage >= 100 ? 'bg-success-subtle text-success' : 
                      percentage >= 75 ? 'bg-accent-subtle text-accent-hover' :
                      percentage >= 50 ? 'bg-warning-subtle text-warning' :
                      'bg-surface-hover text-text-secondary'}
                  `}
                >
                  {percentage.toFixed(0)}%
                </span>
                <Text size="xs" color="muted">
                  del objetivo
                </Text>
              </div>
            )}
            
            {/* Progress bar with animation */}
            {goal > 0 && (
              <div className="w-full h-2 bg-surface rounded-full overflow-hidden mt-2">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: animateProgress ? `${percentage}%` : '0%',
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${getGlowColor(color)}`,
                  }}
                />
              </div>
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
