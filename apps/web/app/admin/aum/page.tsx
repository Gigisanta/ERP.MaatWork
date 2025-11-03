"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getAumRows } from '@/lib/api';
import FileUploader from './components/FileUploader';
import ContactUserPicker from './components/ContactUserPicker';
import DuplicateResolutionModal from './components/DuplicateResolutionModal';
import type { Row, ApiErrorWithMessage, AumRow } from '@/types';
import { Button, Select, Text, Badge } from '@cactus/ui';

// AI_DECISION: Debounce filter changes to reduce excessive API calls
// Justificación: Filter changes can trigger multiple rapid API calls, debouncing improves performance
// Impacto: Better performance and reduced server load
const FILTER_DEBOUNCE_MS = 300;

export default function AumAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0, hasMore: false });
  const [filters, setFilters] = useState({ broker: 'all', status: 'all' });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  
  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: {
        limit: number;
        offset: number;
        broker?: string;
        status?: string;
      } = {
        limit: pagination.limit,
        offset: pagination.offset,
      };
      if (filters.broker && filters.broker !== 'all') params.broker = filters.broker;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      
      const response = await getAumRows(params);
      
      if (response.success && response.data) {
        // Convertir AumRow[] a Row[] (requiere file)
        const allRows: AumRow[] = response.data.rows || [];
        const validRows: Row[] = allRows
          .filter((r): r is Row => r.file !== undefined)
          .map(r => ({ ...r, file: r.file! }));
        setRows(validRows);
        setPagination(prev => ({ ...prev, ...(response.data?.pagination || {}) }));
      }
    } catch (e: unknown) {
      const error = e as ApiErrorWithMessage;
      setError(error.userMessage || error.message || error.error || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, filters.broker, filters.status]);

  // Load on mount and pagination changes (no debounce)
  useEffect(() => {
    loadRows();
  }, [pagination.offset]);

  // Debounce filter changes
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const timer = setTimeout(() => {
      loadRows();
    }, FILTER_DEBOUNCE_MS);
    
    setDebounceTimer(timer);
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [filters.broker, filters.status]);

  const getStatusBadge = (status: string) => {
    const styles = {
      matched: 'bg-green-100 text-green-700',
      ambiguous: 'bg-orange-100 text-orange-700',
      unmatched: 'bg-gray-100 text-gray-700'
    };
    return styles[status as keyof typeof styles] || styles.unmatched;
  };

  return (
    <div className="space-y-4">
      {/* Header y acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">AUM y Brokers</h2>
          <p className="text-sm text-gray-600">Normalización de cuentas comitentes</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/aum/history">
            <Button
              variant="outline"
              size="sm"
            >
              📋 Historial de importaciones
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <Select
          value={filters.broker}
          onValueChange={(value) => setFilters(prev => ({ ...prev, broker: value }))}
          placeholder="Todos los Brokers"
          items={[
            { value: 'all', label: 'Todos los Brokers' },
            { value: 'balanz', label: 'Balanz' }
          ]}
        />
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          placeholder="Todos los Estados"
          items={[
            { value: 'all', label: 'Todos los Estados' },
            { value: 'matched', label: 'Coincidencia' },
            { value: 'ambiguous', label: 'Ambiguo' },
            { value: 'unmatched', label: 'Sin Coincidencia' }
          ]}
        />
        <div className="ml-auto">
          <FileUploader onUploadSuccess={async (fileId) => {
            // Bring the newest file to view immediately after upload
            try {
              setPagination(prev => ({ ...prev, offset: 0 }));
              setLoading(true);
              setError(null);
              const response = await getAumRows({ limit: 50, offset: 0, fileId });
              if (response.success && response.data) {
                const allRows = response.data.rows || [];
                const validRows = allRows
                  .filter((r): r is Row => r.file !== undefined)
                  .map(r => ({ ...r, file: r.file! }));
                setRows(validRows);
                setPagination(prev => ({ ...prev, ...(response.data?.pagination || {}) }));
              }
            } catch (e: unknown) {
              const err = e as ApiErrorWithMessage;
              setError(err.userMessage || err.message || 'Error cargando vista previa');
            } finally {
              setLoading(false);
            }
          }} />
        </div>
      </div>

      {error && (
        <Text size="sm" className="text-error">{error}</Text>
      )}

      {/* Tabla consolidada */}
      {loading ? (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archivo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Broker</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titular</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asesor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vincular Contacto/Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-36"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-28"></div></td>
                  <td className="px-4 py-3"><div className="h-8 bg-gray-200 rounded w-32"></div></td>
                  <td className="px-4 py-3"><div className="h-6 bg-gray-200 rounded w-24"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archivo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Broker</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titular</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asesor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vincular Contacto/Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={row.id} className={row.conflictDetected ? 'bg-orange-50' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {new Date(row.rowCreatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <Link href={`/admin/aum/${row.fileId}`} className="text-indigo-600 hover:underline">
                        {row.file.originalFilename}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{row.file.broker}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700">{row.accountNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{row.holderName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{row.advisorRaw}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <ContactUserPicker
                        fileId={row.fileId}
                        rowId={row.id}
                        initialContactId={row.matchedContactId}
                        initialUserId={row.matchedUserId}
                        suggestedUserId={row.suggestedUserId}
                        onSave={() => loadRows()}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${getStatusBadge(row.matchStatus)}`}>
                        {row.matchStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
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
                    <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={9}>
                      Sin importaciones todavía. Carga un archivo para comenzar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pagination.total > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-700">
              <div>
                Mostrando {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} de {pagination.total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                  disabled={pagination.offset === 0}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                  disabled={!pagination.hasMore}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Modal de duplicados */}
      {showDuplicateModal && selectedAccountNumber && (
        <DuplicateResolutionModal
          accountNumber={selectedAccountNumber}
          onClose={() => {
            setShowDuplicateModal(false);
            setSelectedAccountNumber(null);
          }}
          onResolved={() => {
            loadRows();
          }}
        />
      )}
    </div>
  );
}
