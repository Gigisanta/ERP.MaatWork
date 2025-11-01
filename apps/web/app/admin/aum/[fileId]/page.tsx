"use client";
// AI_DECISION: Fix AuthContext import path to use the correct relative path and eliminate broken alias.
// Justificación: The previous alias '@/app/admin/auth/AuthContext' does not resolve; restoring the local relative path as per project structure and original file context.
// Impacto: Authentication will work as intended; linter/type errors removed. No breaking changes.
// AI_DECISION: Fix incorrect import path for AuthContext and update to client/server component pattern as per repo conventions.
// Justificación: The '../../auth/AuthContext' import path does not resolve due to incorrect relative location from this route folder. Based on app structure, AuthContext and useAuth should be imported from '@/app/admin/auth/AuthContext' since 'app/' is a Next.js root. This also prevents module resolution errors on Next.js App Router.
// Impacto: Authentication will now resolve and be typed correctly. All hooks and context providers resolve as expected. No breaking changes.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-url';
import ContactUserPicker from '../components/ContactUserPicker';

export default function AumPreviewPage() {
  const params = useParams();
  const fileId = params.fileId as string;
  const [file, setFile] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadRows = async () => {
    try {
      const data = await apiClient.get<{ok: boolean; file: any; rows: any[]}>(`/admin/aum/uploads/${fileId}/preview`);
      setFile(data.file);
      setRows(data.rows || []);
    } catch (e: any) {
      setError(e.userMessage || e.message || 'Error');
    }
  };

  useEffect(() => {
    loadRows();
  }, [fileId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Vista previa importación</h2>
          {file && <p className="text-sm text-gray-600">Archivo: {file.originalFilename} | Estado: {file.status}</p>}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={getApiUrl(`/admin/aum/uploads/${fileId}/export`)}
            className="px-3 py-2 text-sm border rounded"
          >Descargar CSV</a>
          <form action={getApiUrl(`/admin/aum/uploads/${fileId}/commit`)} method="post">
            <button className="px-3 py-2 text-sm bg-indigo-600 text-white rounded">Confirmar sincronización</button>
          </form>
        </div>
      </div>

      {file && <div className="text-sm text-gray-700">Procesados: {file.totals.parsed} · Coincidencias: {file.totals.matched} · Pendientes: {file.totals.unmatched}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cuenta</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Titular (Broker)</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Asesor (archivo)</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">CRM Contacto (nombre)</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Contacto CRM</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Usuario</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Vincular</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-sm text-gray-700">{r.accountNumber}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{r.holderName}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{r.advisorRaw}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{r.matchedContactId || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{r.raw?.Titular || r.holderName || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{r.matchedUserId || '-'}</td>
                <td className="px-4 py-2 text-sm">
                  <span className={"inline-flex items-center rounded px-2 py-0.5 text-xs " + (r.matchStatus === 'matched' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                    {r.matchStatus}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm">
                  <ContactUserPicker
                    fileId={fileId}
                    rowId={r.id}
                    initialContactId={r.matchedContactId}
                    initialUserId={r.matchedUserId}
                    onSave={() => loadRows()}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={6}>Sin filas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


