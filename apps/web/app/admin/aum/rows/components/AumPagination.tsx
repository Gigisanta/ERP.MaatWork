/**
 * AumPagination Component
 *
 * AI_DECISION: Componente separado para controles de paginación
 * Justificación: Reutilizable y testeable independientemente
 * Impacto: Lógica de paginación encapsulada
 */

'use client';

import { Button, Text } from '@cactus/ui';

export interface AumPaginationProps {
  // Pagination state
  limit: number;
  offset: number;
  total: number;

  // Handlers
  onPrevPage: () => void;
  onNextPage: () => void;

  // Flags
  hasPrevPage: boolean;
  hasNextPage: boolean;

  // Optional
  showSearchInfo?: boolean;
  searchActive?: boolean;
  className?: string;
}

export function AumPagination({
  limit,
  offset,
  total,
  onPrevPage,
  onNextPage,
  hasPrevPage,
  hasNextPage,
  showSearchInfo = false,
  searchActive = false,
  className = '',
}: AumPaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const startRow = offset + 1;
  const endRow = Math.min(offset + limit, total);

  return (
    <div className={`bg-surface border-t border-border px-6 py-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Text size="sm" className="text-text-secondary">
            Mostrando <span className="font-medium text-text">{startRow}</span> a{' '}
            <span className="font-medium text-text">{endRow}</span> de{' '}
            <span className="font-medium text-text">{total}</span> resultados
          </Text>

          {showSearchInfo && searchActive && (
            <Text size="sm" className="text-primary">
              (búsqueda activa - resultados filtrados)
            </Text>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrevPage} disabled={!hasPrevPage}>
            ← Anterior
          </Button>

          <Text size="sm" className="text-text-secondary px-4">
            Página <span className="font-medium text-text">{currentPage}</span> de{' '}
            <span className="font-medium text-text">{totalPages || 1}</span>
          </Text>

          <Button variant="outline" size="sm" onClick={onNextPage} disabled={!hasNextPage}>
            Siguiente →
          </Button>
        </div>
      </div>
    </div>
  );
}
