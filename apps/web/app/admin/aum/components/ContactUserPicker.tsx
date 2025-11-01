"use client";

// AI_DECISION: Create simple picker component for contact/user matching
// Justificación: Enables manual association of AUM rows with CRM contacts and users
// Impacto: New UI component for AUM normalization workflow

import { useState } from 'react';

interface ContactUserPickerProps {
  fileId: string;
  rowId: string;
  initialContactId?: string | null;
  initialUserId?: string | null;
  onSave?: () => void;
  token: string | null;
}

export default function ContactUserPicker({
  fileId,
  rowId,
  initialContactId,
  initialUserId,
  onSave,
  token
}: ContactUserPickerProps) {
  const [contactId, setContactId] = useState(initialContactId || '');
  const [userId, setUserId] = useState(initialUserId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${base}/admin/aum/uploads/${fileId}/match`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({ 
          rowId, 
          matchedContactId: contactId || null, 
          matchedUserId: userId || null 
        })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      setSuccess(true);
      if (onSave) onSave();
      setTimeout(() => setSuccess(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={contactId}
        onChange={(e) => setContactId(e.target.value)}
        placeholder="Contact ID"
        className="border rounded px-2 py-1 text-xs w-40"
      />
      <input
        type="text"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="User ID (advisor)"
        className="border rounded px-2 py-1 text-xs w-40"
      />
      <button
        onClick={save}
        disabled={saving || success}
        className={`px-2 py-1 text-xs rounded ${
          success 
            ? 'bg-green-600 text-white' 
            : 'bg-gray-800 text-white hover:bg-gray-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {saving ? '...' : success ? '✓' : 'Guardar'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}



