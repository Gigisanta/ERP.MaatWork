"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

export default function AumPreviewPage({ params }: { params: { fileId: string } }) {
  const { token } = useAuth();
  const { fileId } = params;
  const [file, setFile] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${base}/admin/aum/uploads/${fileId}/preview`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setFile(data.file);
        setRows(data.rows || []);
      } catch (e: any) {
        setError(e.message || 'Error');
      }
    };
    if (token) load();
  }, [token, fileId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Vista previa importación</h2>
          {file && <p className="text-sm text-gray-600">Archivo: {file.originalFilename} | Estado: {file.status}</p>}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + `/admin/aum/uploads/${fileId}/export`}
            className="px-3 py-2 text-sm border rounded"
          >Descargar CSV</a>
          <form action={(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + `/admin/aum/uploads/${fileId}/commit`} method="post">
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
                  {/* client-side match form */}
                  {/* @ts-expect-error Server Component importing client component at runtime is allowed via usage only */}
                  <DynamicRowMatch fileId={fileId} row={r} />
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

// Dynamic import shim to use client component in server page
// We avoid next/dynamic for brevity; the component will only be rendered on client
function DynamicRowMatch({ fileId, row }: { fileId: string; row: any }) {
  // @ts-ignore
  const RowMatchForm = require('../components/RowMatchForm').default;
  return RowMatchForm ? RowMatchForm({ fileId, rowId: row.id, initialContactId: row.matchedContactId, initialUserId: row.matchedUserId }) : null;
}


