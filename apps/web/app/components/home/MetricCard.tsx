"use client";

import { Card, CardContent, Text, Stack } from '@cactus/ui';
import { useMemo } from 'react';

interface MetricCardProps {
  title: string;
  actual: number;
  goal: number;
  color: string;
}

/**
 * Card individual para mostrar una métrica con su valor actual y objetivo
 * Usa variables CSS del sistema de diseño para colores consistentes
 */
export function MetricCard({ title, actual, goal, color }: MetricCardProps) {
  const percentage = useMemo(() => {
    if (goal === 0) return 0;
    return Math.min((actual / goal) * 100, 100);
  }, [actual, goal]);

  // Manejar tanto colores hex como variables CSS
  const getBackgroundColor = (colorValue: string) => {
    // Si es una variable CSS, usar color-mix (soporte moderno) o fallback
    if (colorValue.startsWith('var(')) {
      // Para variables CSS, usar opacity directamente en el color
      return colorValue.replace(')', ' / 0.05)');
    }
    // Si es hex, convertir a rgba
    const hex = colorValue.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.05)`;
  };

  return (
    <Card
      className="relative overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{
        borderTop: `3px solid ${color}`,
        backgroundColor: getBackgroundColor(color)
      }}
    >
      <CardContent className="p-4">
        <Stack direction="column" gap="xs">
          <Text size="sm" color="secondary" className="font-medium">
            {title}
          </Text>
          <Text size="xl" className="font-bold" style={{ color }}>
            {actual}
          </Text>
          <Stack direction="row" gap="xs" align="center" justify="between">
            <Text size="xs" color="secondary">
              Objetivo: {goal}
            </Text>
            {goal > 0 && (
              <Text size="xs" color="secondary" className="font-medium">
                {percentage.toFixed(0)}%
              </Text>
            )}
          </Stack>
          {goal > 0 && (
            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden mt-1">
              <div
                className="h-full transition-all duration-500 ease-out rounded-full"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color
                }}
              />
            </div>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

