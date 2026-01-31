/**
 * Color Legend Component
 *
 * Leyenda que explica el significado de los colores en la tabla de contactos
 * Verde = Interacción reciente, Amarillo = Hace 7+ días, Rojo = Sin interacción
 */

'use client';

import { useState, useEffect } from 'react';
import { Text, Icon, Button, Tooltip, cn } from '@maatwork/ui';

interface ColorLegendProps {
  className?: string;
}

export function ColorLegend({ className }: ColorLegendProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Verificar si el usuario ya ha visto la leyenda
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('color-legend-dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
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
        {/* Reciente (Verde) */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-4 rounded"
            style={{
              background:
                'linear-gradient(90deg, hsl(var(--success) / 0.2) 0%, transparent 100%)',
              boxShadow: 'inset 3px 0 0 0 hsl(var(--success))',
            }}
          />
          <Text size="xs" color="secondary">
            Reciente
          </Text>
        </div>

        {/* 7+ días (Amarillo) */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-4 rounded"
            style={{
              background:
                'linear-gradient(90deg, hsl(var(--warning-text) / 0.2) 0%, transparent 100%)',
              boxShadow: 'inset 3px 0 0 0 hsl(var(--warning-text))',
            }}
          />
          <Text size="xs" color="secondary">
            7+ días
          </Text>
        </div>

        {/* Sin contacto (Rojo) */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-4 rounded"
            style={{
              background:
                'linear-gradient(90deg, hsl(var(--destructive) / 0.2) 0%, transparent 100%)',
              boxShadow: 'inset 3px 0 0 0 hsl(var(--destructive))',
            }}
          />
          <Text size="xs" color="secondary">
            Sin contacto
          </Text>
        </div>

        {/* Cliente (Morado) */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-4 rounded"
            style={{
              background:
                'linear-gradient(90deg, hsl(var(--primary) / 0.2) 0%, transparent 100%)',
              boxShadow: 'inset 3px 0 0 0 hsl(var(--primary))',
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
