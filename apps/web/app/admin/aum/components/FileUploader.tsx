"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';

interface FileUploaderProps {
  onUploadSuccess?: () => void;
}

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{ fileId: string; totals: any } | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const form = new FormData();
      form.append('file', file);
      // Debug
      // eslint-disable-next-line no-console
      console.log('Uploading AUM file', { name: file.name, size: file.size, type: file.type, url: `${base}/admin/aum/uploads?broker=balanz` });
      const res = await fetch(`${base}/admin/aum/uploads?broker=balanz`, {
        method: 'POST',
        body: form,
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined as any,
        credentials: 'include'
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const data = await res.json();
      const fileId = data.fileId as string;
      // Show summary modal if there are conflicts or interesting stats
      if (data.totals.conflicts > 0 || data.totals.ambiguous > 0) {
        setUploadSummary({ fileId, totals: data.totals });
        setShowSummary(true);
      } else {
        // Refresh the table on the main page
        if (onUploadSuccess) {
          onUploadSuccess();
        } else {
          // Fallback: navigate to preview if callback not provided
          router.push(`/admin/aum/${fileId}`);
        }
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('AUM upload failed', err);
      setError(err.message || 'Upload failed');
      alert(`Error subiendo archivo: ${err?.message || err}`);
    } finally {
      setLoading(false);
      (e.target as any).value = '';
    }
  };

  const handleCloseSummary = () => {
    setShowSummary(false);
    if (uploadSummary) {
      // Refresh the table after closing summary
      if (onUploadSuccess) {
        onUploadSuccess();
      } else {
        router.push(`/admin/aum/${uploadSummary.fileId}`);
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <label htmlFor="aum-file-input" className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer">
          {loading ? 'Subiendo…' : 'Cargar archivo de Balanz (CSV o Excel)'}
        </label>
        <input id="aum-file-input" type="file" className="hidden" accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onChange} disabled={loading} />
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {showSummary && uploadSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Resumen de importación</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-700">Total procesados:</span>
                <span className="font-semibold">{uploadSummary.totals.parsed}</span>
              </div>
              
              {uploadSummary.totals.matched > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Coincidencias:</span>
                  <span className="font-semibold">{uploadSummary.totals.matched}</span>
                </div>
              )}
              
              {uploadSummary.totals.conflicts > 0 && (
                <div className="flex justify-between text-orange-700">
                  <span>Conflictos detectados:</span>
                  <span className="font-semibold">{uploadSummary.totals.conflicts}</span>
                </div>
              )}
              
              {uploadSummary.totals.ambiguous > 0 && (
                <div className="flex justify-between text-orange-700">
                  <span>Requieren revisión:</span>
                  <span className="font-semibold">{uploadSummary.totals.ambiguous}</span>
                </div>
              )}
              
              {uploadSummary.totals.unmatched > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Sin coincidencia:</span>
                  <span className="font-semibold">{uploadSummary.totals.unmatched}</span>
                </div>
              )}
            </div>

            {uploadSummary.totals.conflicts > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-6">
                <p className="text-sm text-orange-800">
                  Se detectaron conflictos en cuentas duplicadas. Revisa los duplicados en la vista previa.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseSummary}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Ver archivo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


