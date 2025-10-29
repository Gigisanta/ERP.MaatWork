"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';

export default function FileUploader() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${base}/admin/aum/uploads?broker=balanz`, {
        method: 'POST',
        body: form,
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined as any
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const data = await res.json();
      const fileId = data.fileId as string;
      // navegar a preview del archivo
      router.push(`/admin/aum/${fileId}`);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
      (e.target as any).value = '';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer">
        {loading ? 'Subiendo…' : 'Cargar archivo de Balanz (CSV o Excel)'}
        <input type="file" className="hidden" accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onChange} disabled={loading} />
      </label>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}


