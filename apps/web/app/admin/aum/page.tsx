"use client";

import { useEffect, useState } from 'react';
import FileUploader from './components/FileUploader';
import { useAuth } from '../../auth/AuthContext';

export default function AumAdminPage() {
  const { token } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${base}/admin/aum/uploads/history`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setFiles(data.files || []);
      } catch (e: any) {
        setError(e.message || 'Error');
      }
    };
    if (token) load();
  }, [token]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">AUM y Brokers</h2>
        <p className="text-sm text-gray-600">Normalización de cuentas comitentes</p>
      </div>
      <div>
        <FileUploader />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="mt-6">
        <h3 className="font-medium mb-2">Historial de importaciones</h3>
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Archivo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Broker</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Procesados</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Coincidencias</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Pendientes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {files.map((f: any) => (
                <tr key={f.id}>
                  <td className="px-4 py-2 text-sm text-gray-700">{new Date(f.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm text-blue-700 underline"><a href={`/admin/aum/${f.id}`}>{f.originalFilename}</a></td>
                  <td className="px-4 py-2 text-sm text-gray-700">{f.broker}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">{f.totalParsed}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{f.totalMatched}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{f.totalUnmatched}</td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={7}>Sin importaciones todavía</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


