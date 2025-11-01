"use client";

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export default function RowMatchForm({ fileId, rowId, initialContactId, initialUserId }: { fileId: string; rowId: string; initialContactId?: string | null; initialUserId?: string | null; }) {
  const [contactId, setContactId] = useState(initialContactId || '');
  const [userId, setUserId] = useState(initialUserId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiClient.post(`/admin/aum/uploads/${fileId}/match`, {
        rowId,
        matchedContactId: contactId || null,
        matchedUserId: userId || null
      });
    } catch (e: any) {
      setError(e.userMessage || e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input value={contactId} onChange={(e) => setContactId(e.target.value)} placeholder="contactId" className="border rounded px-2 py-1 text-xs" />
      <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="userId (advisor)" className="border rounded px-2 py-1 text-xs" />
      <button onClick={save} disabled={saving} className="px-2 py-1 text-xs bg-gray-800 text-white rounded">{saving ? '...' : 'Guardar'}</button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
