"use client";

import { useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';

export default function RowMatchForm({ fileId, rowId, initialContactId, initialUserId }: { fileId: string; rowId: string; initialContactId?: string | null; initialUserId?: string | null; }) {
  const { token } = useAuth();
  const [contactId, setContactId] = useState(initialContactId || '');
  const [userId, setUserId] = useState(initialUserId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${base}/admin/aum/uploads/${fileId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rowId, matchedContactId: contactId || null, matchedUserId: userId || null })
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e: any) {
      setError(e.message || 'Error');
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


