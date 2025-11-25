/**
 * AumTableHeader Component
 *
 * AI_DECISION: Header sticky separado con anchos configurables
 * Justificación: Componente reutilizable con configuración centralizada
 * Impacto: Fácil ajustar anchos de columnas desde constantes
 */

'use client';

import { AUM_ROWS_CONFIG } from '../lib/aumRowsConstants';

interface AumTableHeaderProps {
  className?: string;
}

export function AumTableHeader({ className = '' }: AumTableHeaderProps) {
  const { COLUMN_WIDTHS } = AUM_ROWS_CONFIG;

  return (
    <thead
      className={`bg-gray-50 sticky top-0 z-20 shadow-sm border-b border-gray-200 ${className}`}
    >
      <tr className="text-xs font-semibold uppercase tracking-wider text-gray-700">
        <th
          className="px-3 py-3 text-left overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.ACCOUNT}px` }}
        >
          Comitente
        </th>
        <th
          className="px-3 py-3 text-left overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.ID_CUENTA}px` }}
        >
          ID Cuenta
        </th>
        <th
          className="px-3 py-3 text-left overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.HOLDER}px` }}
        >
          Cuenta
        </th>
        <th
          className="px-3 py-3 text-left overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.ADVISOR}px` }}
        >
          Asesor
        </th>
        <th
          className="px-3 py-3 text-right overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.AUM_DOLLARS}px` }}
        >
          AUM USD
        </th>
        <th
          className="px-3 py-3 text-right overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.BOLSA_ARG}px` }}
        >
          Bolsa Arg
        </th>
        <th
          className="px-3 py-3 text-right overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.FONDOS_ARG}px` }}
        >
          Fondos Arg
        </th>
        <th
          className="px-3 py-3 text-right overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.BOLSA_BCI}px` }}
        >
          Bolsa BCI
        </th>
        <th
          className="px-3 py-3 text-right overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.PESOS}px` }}
        >
          Pesos
        </th>
        <th
          className="px-3 py-3 text-right overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.MEP}px` }}
        >
          MEP
        </th>
        <th
          className="px-3 py-3 text-right overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.CABLE}px` }}
        >
          Cable
        </th>
        <th
          className="px-3 py-3 text-right overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.CV7000}px` }}
        >
          CV7000
        </th>
        <th
          className="px-3 py-3 text-left overflow-hidden"
          style={{ width: `${COLUMN_WIDTHS.ACTIONS}px` }}
        >
          Acciones
        </th>
      </tr>
    </thead>
  );
}
