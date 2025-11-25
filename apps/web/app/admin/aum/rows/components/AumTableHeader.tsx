/**
 * AumTableHeader Component
 * 
 * AI_DECISION: Header sticky separado con anchos configurables
 * Justificación: Componente reutilizable con configuración centralizada
 * Impacto: Fácil ajustar anchos de columnas desde constantes
 */

'use client';

import { AUM_ROWS_CONFIG } from '../lib/aumRowsConstants';

export function AumTableHeader() {
  const { COLUMN_WIDTHS } = AUM_ROWS_CONFIG;

  return (
    <div className="sticky top-0 z-30 bg-gray-50 border-b border-gray-200 shadow-sm">
      <table 
        className="table-fixed border-collapse" 
        style={{ 
          tableLayout: 'fixed', 
          width: `${Object.values(COLUMN_WIDTHS).reduce((sum, w) => sum + w, 0)}px`,
          minWidth: `${Object.values(COLUMN_WIDTHS).reduce((sum, w) => sum + w, 0)}px`
        }}
      >
        <colgroup>
          <col style={{ width: `${COLUMN_WIDTHS.ACCOUNT}px` }} />
          <col style={{ width: `${COLUMN_WIDTHS.ID_CUENTA}px` }} />
          <col style={{ width: `${COLUMN_WIDTHS.HOLDER}px` }} />
          <col style={{ width: `${COLUMN_WIDTHS.ADVISOR}px` }} />
          <col style={{ width: `${COLUMN_WIDTHS.AUM_DOLLARS}px` }} />
          <col style={{ width: `${COLUMN_WIDTHS.BOLSA_ARG}px` }} />
          <col style={{ width: `${COLUMN_WIDTHS.FONDOS_ARG}px` }} />
          <col style={{ width: `${COLUMN_WIDTHS.BOLSA_BCI}px` }} />
          <col style={{ width: `${COLUMN_WIDTHS.PESOS}px` }} />
          <col style={{ width: `${COLUMN_WIDTHS.MEP}px` }} />
          <col style={{ width: `${COLUMN_WIDTHS.CABLE}px` }} />
          <col style={{ width: `${COLUMN_WIDTHS.CV7000}px` }} />
          <col style={{ width: `${COLUMN_WIDTHS.ACTIONS}px` }} />
        </colgroup>
        <thead>
          <tr>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              Comitente
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              ID Cuenta
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              Cuenta
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              Asesor
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              AUM USD
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              Bolsa Arg
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              Fondos Arg
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              Bolsa BCI
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              Pesos
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              MEP
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              Cable
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              CV7000
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider overflow-hidden">
              Acciones
            </th>
          </tr>
        </thead>
      </table>
    </div>
  );
}

