"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';

interface DuplicateRow {
  id: string;
  fileId: string;
  accountNumber: string;
  holderName: string | null;
  advisorRaw: string | null;
  matchedContactId: string | null;
  matchedUserId: string | null;
  matchStatus: string;
  isPreferred: boolean;
  conflictDetected: boolean;
  rowCreatedAt: string;
  file: {
    id: string;
    broker: string;
    originalFilename: string;
    createdAt: string;
  };
  contact: {
    id: string;
    fullName: string;
  } | null;
  user: {
    id: string;
    name: string;
  } | null;
}

interface DuplicateResolutionModalProps {
  accountNumber: string | null;
  onClose: () => void;
  onResolved?: () => void;
}

export default function DuplicateResolutionModal({
  accountNumber,
  onClose,
  onResolved
}: DuplicateResolutionModalProps) {
  const { token } = useAuth();
  const [rows, setRows] = useState<DuplicateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (accountNumber) {
      loadDuplicates();
    }
  }, [accountNumber]);

  const loadDuplicates = async () => {
    setLoading(true);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${base}/admin/aum/rows/duplicates/${accountNumber}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRows(data.rows || []);
      // Auto-select the preferred row if exists
      const preferred = data.rows.find((r: DuplicateRow) => r.isPreferred);
      if (preferred) setSelectedRowId(preferred.id);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const saveResolution = async () => {
    if (!selectedRowId) return;
    setSaving(true);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Update is_preferred for all rows for this account
      for (const row of rows) {
        await fetch(`${base}/admin/aum/uploads/${row.fileId}/match`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            rowId: row.id,
            matchedContactId: row.matchedContactId,
            matchedUserId: row.matchedUserId,
            isPreferred: row.id === selectedRowId
          })
        });
      }
      
      if (onResolved) onResolved();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!accountNumber) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Resolución de duplicados</h3>
              <p className="text-sm text-gray-600">Cuenta: <span className="font-mono">{accountNumber}</span></p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Se encontraron {rows.length} importaciones con esta cuenta. Selecciona cuál es la versión correcta:
              </p>
              
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Seleccionar</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Archivo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Titular</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Asesor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Contacto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row) => (
                    <tr key={row.id} className={row.conflictDetected ? 'bg-orange-50' : ''}>
                      <td className="px-4 py-2">
                        <input
                          type="radio"
                          name="selectedRow"
                          checked={selectedRowId === row.id}
                          onChange={() => setSelectedRowId(row.id)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{row.file.originalFilename}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {new Date(row.file.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{row.holderName}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{row.advisorRaw}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {row.contact ? row.contact.fullName : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          row.matchStatus === 'matched' ? 'bg-green-100 text-green-700' :
                          row.matchStatus === 'ambiguous' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {row.matchStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={saveResolution}
            disabled={!selectedRowId || saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Marcar como preferida'}
          </button>
        </div>
      </div>
    </div>
  );
}



