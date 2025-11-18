/**
 * AumAdminActions Component
 *
 * AI_DECISION: Componente separado para acciones de administrador
 * Justificación: Separa lógica de admin del componente principal
 * Impacto: Componente reutilizable y testeable
 */

'use client';

import Link from 'next/link';
import { Button } from '@cactus/ui';

export interface AumAdminActionsProps {
  // State
  isResetting: boolean;
  canImport: boolean;

  // Handlers
  onReset: () => void;

  // Optional
  className?: string;
}

export function AumAdminActions({
  isResetting,
  canImport,
  onReset,
  className = '',
}: AumAdminActionsProps) {
  return (
    <div className={`flex gap-1.5 items-center ${className}`}>
      {canImport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={isResetting}
          title="Eliminar todos los datos AUM"
        >
          {isResetting ? '...' : '🗑️'}
        </Button>
      )}
      <Link href="/admin/aum/history">
        <Button variant="outline" size="sm" title="Historial de importaciones">
          📋
        </Button>
      </Link>
      <Link href="/admin/aum">
        <Button variant="outline" size="sm" title="Volver al hub">
          ←
        </Button>
      </Link>
    </div>
  );
}
