/**
 * Color Legend Component
 *
 * Leyenda que explica el significado de los colores en la tabla de contactos
 * Verde = Interacción reciente, Amarillo = Hace 7+ días, Rojo = Sin interacción
 */

'use client';

import { useState, useEffect } from 'react';
import { Badge, Text, Stack, Icon, Button, Tooltip, cn } from '@maatwork/ui';

interface ColorLegendProps {
  className?: string;
}

export function ColorLegend({ className }: ColorLegendProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Verificar si el usuario ya ha visto la leyenda
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('color-legend-dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      } else {
        // Mostrar tooltip la primera vez
        setShowTooltip(true);
        const timer = setTimeout(() => setShowTooltip(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('color-legend-dismissed', 'true');
    }
  };

  if (isDismissed) {
    return (
      <Tooltip content="Los colores indican urgencia de seguimiento">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDismissed(false)}
          className="h-6 px-2 text-xs"
          title="Mostrar leyenda de colores"
        >
          <Icon name="Info" size={14} />
        </Button>
      </Tooltip>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg border border-border bg-surface/50',
        className
      )}
    >
      <div className="flex items-center gap-2 shrink-0">
        <Text size="xs" weight="medium" color="secondary">
          Leyenda:
        </Text>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Verde - Interacción reciente */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded border-l-2"
            style={{
              backgroundColor: 'hsl(120 80% 96%)',
              borderLeftColor: 'hsl(120 76% 36%)',
            }}
          />
          <Text size="xs" color="secondary">
            Reciente
          </Text>
        </div>

        {/* Amarillo - Hace 7+ días */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded border-l-2"
            style={{
              backgroundColor: 'hsl(60 80% 96%)',
              borderLeftColor: 'hsl(60 70% 45%)',
            }}
          />
          <Text size="xs" color="secondary">
            7+ días
          </Text>
        </div>

        {/* Rojo - Sin interacción */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded border-l-2"
            style={{
              backgroundColor: 'hsl(0 100% 98%)',
              borderLeftColor: 'hsl(0 84% 60%)',
            }}
          />
          <Text size="xs" color="secondary">
            Sin contacto
          </Text>
        </div>

        {/* Cliente - Verde especial */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded border-l-2"
            style={{
              backgroundColor: 'hsl(142 70% 96%)',
              borderLeftColor: 'hsl(142 76% 36%)',
            }}
          />
          <Text size="xs" color="secondary">
            Cliente
          </Text>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
        className="h-6 w-6 p-0 ml-auto shrink-0"
        title="Ocultar leyenda"
        aria-label="Ocultar leyenda de colores"
      >
        <Icon name="X" size={14} />
      </Button>
    </div>
  );
}
