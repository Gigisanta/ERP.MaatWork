"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import FileUploader from './components/FileUploader';
import ContactUserPicker from './components/ContactUserPicker';
import DuplicateResolutionModal from './components/DuplicateResolutionModal';

interface Row {
  id: string;
  fileId: string;
  accountNumber: string | null;
  holderName: string | null;
  advisorRaw: string | null;
  matchedContactId: string | null;
  matchedUserId: string | null;
  matchStatus: 'matched' | 'ambiguous' | 'unmatched';
  isPreferred: boolean;
  conflictDetected: boolean;
  rowCreatedAt: string;
  file: {
    id: string;
    broker: string;
    originalFilename: string;
    status: string;
    createdAt: string;
  };
  contact: {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function AumAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0, hasMore: false });
  const [filters, setFilters] = useState({ broker: '', status: '' });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<string | null>(null);
  
  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        limit: String(pagination.limit),
        offset: String(pagination.offset)
      };
      if (filters.broker) params.broker = filters.broker;
      if (filters.status) params.status = filters.status;
      
      const data = await apiClient.get<{ rows: Row[]; pagination: any }>('/admin/aum/rows/all', { params });
      setRows(data.rows || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (e: any) {
      setError(e.userMessage || e.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [pagination.offset, filters.broker, filters.status]);

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
          <Link 
            href="/admin/aum/history" 
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-md hover:bg-indigo-50"
          >
            📋 Historial de importaciones
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <select
          value={filters.broker}
          onChange={(e) => setFilters(prev => ({ ...prev, broker: e.target.value }))}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">Todos los Brokers</option>
          <option value="balanz">Balanz</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">Todos los Estados</option>
          <option value="matched">Coincidencia</option>
          <option value="ambiguous">Ambiguo</option>
          <option value="unmatched">Sin Coincidencia</option>
        </select>
        <div className="ml-auto">
          <FileUploader onUploadSuccess={() => loadRows()} />
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Tabla consolidada */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
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
