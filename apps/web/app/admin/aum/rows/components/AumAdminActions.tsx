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
  isCleaningDuplicates: boolean;
  canImport: boolean;

  // Handlers
  onReset: () => void;
  onCleanupDuplicates: () => void;

  // Optional
  className?: string;
}

export function AumAdminActions({
  isResetting,
  isCleaningDuplicates,
  canImport,
  onReset,
  onCleanupDuplicates,
  className = ''
}: AumAdminActionsProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {canImport && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={isResetting || isCleaningDuplicates}
          >
            {isResetting ? 'Reseteando...' : '🗑️ Eliminar todo'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCleanupDuplicates}
            disabled={isCleaningDuplicates || isResetting}
          >
            {isCleaningDuplicates ? 'Limpiando...' : '🧹 Limpiar duplicados'}
          </Button>
        </>
      )}
      <Link href="/admin/aum/history">
        <Button variant="outline" size="sm">
          📋 Historial de importaciones
        </Button>
      </Link>
      <Link href="/admin/aum">
        <Button variant="outline" size="sm">
          ← Volver al hub
        </Button>
      </Link>
    </div>
  );
}

