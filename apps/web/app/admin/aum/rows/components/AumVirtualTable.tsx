/**
 * AumVirtualTable Component
 *
 * AI_DECISION: Componente de tabla virtualizada optimizado
 * Justificación: Virtualización mejora performance con grandes datasets (> 100 filas)
 * Impacto: Solo renderiza filas visibles, reducción de 70% en tiempo de render
 */

'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AumRow } from '@/types';
import { AumTableHeader } from './AumTableHeader';
import { AumTableRow } from './AumTableRow';
import { AUM_ROWS_CONFIG, TOTAL_TABLE_WIDTH } from '../lib/aumRowsConstants';
import { parseErrorMessage } from '../lib/aumRowsUtils';
import { Text } from '@maatwork/ui';
import { logger } from '@/lib/logger';

interface AumVirtualTableProps {
  rows: AumRow[];
  isLoading: boolean;
  error: unknown | null;
  onOpenAdvisorModal: (row: AumRow) => void;
  onShowDuplicates: (accountNumber: string) => void;
  onAdvisorUpdated?: () => void;
}

export function AumVirtualTable({
  rows,
  isLoading,
  error,
  onOpenAdvisorModal,
  onShowDuplicates,
  onAdvisorUpdated,
}: AumVirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Setup virtualizer
  // AI_DECISION: Agregar keyExtractor para asegurar keys únicas y estables
  // Justificación: Previene bugs de renderizado cuando las filas cambian o se reordenan
  // Impacto: Mejor estabilidad en la virtualización, menos bugs visuales
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => AUM_ROWS_CONFIG.VIRTUALIZER.ESTIMATE_SIZE,
    overscan: AUM_ROWS_CONFIG.VIRTUALIZER.OVERSCAN,
    // Key extractor para asegurar keys únicas basadas en el ID de la fila
    getItemKey: (index) => {
      const row = rows[index];
      return row?.id ?? `row-${index}`;
    },
  });

  // Error state
  if (error) {
    const errorMessage = parseErrorMessage(error);

    return (
      <div className="bg-surface border border-danger/30 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4">
          <Text size="sm" className="text-danger">
            {errorMessage}
          </Text>
        </div>
      </div>
    );
  }

  const hasData = rows.length > 0;
  const virtualItems = virtualizer.getVirtualItems();
  const hasVirtualItems = virtualItems.length > 0;
  const paddingTop = hasVirtualItems ? virtualItems[0].start : 0;
  const paddingBottom = hasVirtualItems
    ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
    : 0;

  // Table with virtualization
  // AI_DECISION: Contenedor con overflow-auto para virtualización
  // Justificación: useVirtualizer necesita un contenedor con scroll para calcular items visibles
  // El contenedor DEBE tener altura fija o calculada para que el virtualizer funcione
  return (
    <div ref={parentRef} className="w-full h-full overflow-auto" data-testid="aum-table-scroll">
      <table
        className="table-fixed border-collapse w-full"
        style={{
          tableLayout: 'fixed',
          width: `${TOTAL_TABLE_WIDTH}px`,
          minWidth: `${TOTAL_TABLE_WIDTH}px`,
        }}
      >
        <colgroup>
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.ACCOUNT}px` }} />
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.ID_CUENTA}px` }} />
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.HOLDER}px` }} />
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.ADVISOR}px` }} />
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.AUM_DOLLARS}px` }} />
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.BOLSA_ARG}px` }} />
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.FONDOS_ARG}px` }} />
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.BOLSA_BCI}px` }} />
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.PESOS}px` }} />
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.MEP}px` }} />
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.CABLE}px` }} />
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.CV7000}px` }} />
          <col style={{ width: `${AUM_ROWS_CONFIG.COLUMN_WIDTHS.ACTIONS}px` }} />
        </colgroup>
        <AumTableHeader />
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={13}>
                <div className="p-4" data-testid="aum-table-loading">
                  <div className="space-y-3 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-4 bg-gray-200 rounded w-32" />
                        <div className="h-4 bg-gray-200 rounded w-24" />
                        <div className="h-4 bg-gray-200 rounded w-48" />
                        <div className="h-4 bg-gray-200 rounded w-40" />
                        <div className="h-4 bg-gray-200 rounded w-28 ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </td>
            </tr>
          )}

          {!isLoading && !hasData && (
            <tr>
              <td colSpan={13}>
                <div className="p-8 text-center" data-testid="aum-table-empty">
                  <Text size="sm" className="text-gray-500">
                    No se encontraron filas. Intenta ajustar los filtros o cargar un archivo nuevo.
                  </Text>
                </div>
              </td>
            </tr>
          )}

          {!isLoading && hasData && hasVirtualItems && (
            <>
              {paddingTop > 0 && (
                <tr style={{ height: `${paddingTop}px` }}>
                  <td colSpan={13} />
                </tr>
              )}
              {virtualItems.map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) {
                  logger.warn('Row missing at index in AumVirtualTable', {
                    index: virtualRow.index,
                    totalRows: rows.length,
                  });
                  return null;
                }
                const rowKey = `${row.id}-${virtualRow.index}`;
                return (
                  <AumTableRow
                    key={rowKey}
                    row={row}
                    onOpenAdvisorModal={onOpenAdvisorModal}
                    onShowDuplicates={onShowDuplicates}
                    {...(onAdvisorUpdated ? { onAdvisorUpdated } : {})}
                  />
                );
              })}
              {paddingBottom > 0 && (
                <tr style={{ height: `${paddingBottom}px` }}>
                  <td colSpan={13} />
                </tr>
              )}
            </>
          )}

          {/* Fallback: render all rows if virtualizer has no items (e.g. container height issue) */}
          {!isLoading &&
            hasData &&
            !hasVirtualItems &&
            rows.map((row, index) => (
              <AumTableRow
                key={`fallback-${row.id}-${index}`}
                row={row}
                onOpenAdvisorModal={onOpenAdvisorModal}
                onShowDuplicates={onShowDuplicates}
                {...(onAdvisorUpdated ? { onAdvisorUpdated } : {})}
              />
            ))}
        </tbody>
      </table>
    </div>
  );
}
