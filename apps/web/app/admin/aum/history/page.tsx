'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAumRows } from '@/lib/api-hooks';
import ContactUserPicker from '../components/ContactUserPicker';
import DuplicateResolutionModal from '../components/DuplicateResolutionModal';
import type { Row, AumRow } from '@/types';

export default function AumHistoryPage() {
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0, hasMore: false });
  const [filters, setFilters] = useState({ broker: '', status: '', fileId: '' });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<string | null>(null);

  // Fetch AUM rows with SWR
  const {
    rows: allRows = [],
    totalRows,
    isLoading: loading,
    error: fetchError,
    mutate,
  } = useAumRows({
    limit: pagination.limit,
    offset: pagination.offset,
    ...(filters.broker && { broker: filters.broker }),
    ...(filters.status && { status: filters.status as 'matched' | 'ambiguous' | 'unmatched' }),
    ...(filters.fileId && { fileId: filters.fileId }),
    preferredOnly: false, // Show all rows in history
  });

  // Extract error message from SWR error
  const error = fetchError
    ? fetchError instanceof Error
      ? fetchError.message
      : 'Error cargando datos'
    : null;

  // Convert AumRow[] to Row[] (requires file)
  const rows = useMemo(() => {
    const validRows: Row[] = (allRows as AumRow[])
      .filter((r): r is Row => r.file !== undefined)
      .map((r) => ({ ...r, file: r.file! }));
    return validRows;
  }, [allRows]);

  // Update pagination when data changes
  useEffect(() => {
    if (totalRows > 0) {
      setPagination((prev) => ({
        ...prev,
        total: totalRows,
        hasMore: prev.offset + prev.limit < totalRows,
      }));
    }
  }, [totalRows]);

  const handleRefresh = () => {
    mutate();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      matched: 'bg-green-100 text-green-700',
      ambiguous: 'bg-orange-100 text-orange-700',
      unmatched: 'bg-gray-100 text-gray-700',
    };
    return styles[status as keyof typeof styles] || styles.unmatched;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Historial de importaciones AUM</h2>
          <p className="text-sm text-gray-600">
            Normalización y sincronización de cuentas comitentes
          </p>
        </div>
        <Link href="/admin/aum" className="text-sm text-indigo-600 hover:underline">
          ← Volver a AUM
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <select
          value={filters.broker}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, broker: e.target.value }));
            setPagination((prev) => ({ ...prev, offset: 0 }));
          }}
          className="border rounded px-3 py-1 text-sm"
        >
          <option value="">Todos los brokers</option>
          <option value="balanz">Balanz</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, status: e.target.value }));
            setPagination((prev) => ({ ...prev, offset: 0 }));
          }}
          className="border rounded px-3 py-1 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="matched">Coincidencias</option>
          <option value="ambiguous">Conflictos</option>
          <option value="unmatched">Sin coincidencia</option>
        </select>

        <input
          value={filters.fileId}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, fileId: e.target.value }));
            setPagination((prev) => ({ ...prev, offset: 0 }));
          }}
          placeholder="Filtrar por File ID"
          className="border rounded px-3 py-1 text-sm font-mono"
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : (
        <>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Archivo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Broker</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cuenta</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Titular</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Asesor</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Vincular (Contacto/Usuario)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.map((row) => (
                  <tr key={row.id} className={row.conflictDetected ? 'bg-orange-50' : ''}>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {new Date(row.rowCreatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <Link
                        href={`/admin/aum/${row.fileId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {row.file.originalFilename}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{row.file.broker}</td>
                    <td className="px-4 py-2 text-sm font-mono text-gray-700">
                      {row.accountNumber}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{row.holderName}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{row.advisorRaw}</td>
                    <td className="px-4 py-2 text-sm">
                      <ContactUserPicker
                        fileId={row.fileId}
                        rowId={row.id}
                        initialContactId={row.matchedContactId}
                        initialUserId={row.matchedUserId}
                        onSave={handleRefresh}
                      />
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${getStatusBadge(row.matchStatus)}`}
                      >
                        {row.matchStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {row.accountNumber && (
                        <button
                          onClick={() => {
                            setSelectedAccountNumber(row.accountNumber);
                            setShowDuplicateModal(true);
                          }}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Ver duplicados
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={10}>
                      Sin importaciones todavía
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-700">
              <div>
                Mostrando {pagination.offset + 1} -{' '}
                {Math.min(pagination.offset + pagination.limit, pagination.total)} de{' '}
                {pagination.total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      offset: Math.max(0, prev.offset - prev.limit),
                    }))
                  }
                  disabled={pagination.offset === 0}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }))
                  }
                  disabled={!pagination.hasMore}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showDuplicateModal && selectedAccountNumber && (
        <DuplicateResolutionModal
          accountNumber={selectedAccountNumber}
          onClose={() => {
            setShowDuplicateModal(false);
            setSelectedAccountNumber(null);
          }}
          onResolved={handleRefresh}
        />
      )}
    </div>
  );
}
