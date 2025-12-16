'use client';

import { useState } from 'react';
import { matchAumRow } from '@/lib/api';
import type { ApiErrorWithMessage } from '@/types';
import { Input, Button, Spinner, Text } from '@cactus/ui';

export default function RowMatchForm({
  fileId,
  rowId,
  initialContactId,
  initialUserId,
}: {
  fileId: string;
  rowId: string;
  initialContactId?: string | null;
  initialUserId?: string | null;
}) {
  const [contactId, setContactId] = useState(initialContactId || '');
  const [userId, setUserId] = useState(initialUserId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await matchAumRow(fileId, {
        rowId,
        matchedContactId: contactId || null,
        matchedUserId: userId || null,
      });
    } catch (e: unknown) {
      const error = e as ApiErrorWithMessage;
      setError(error.userMessage || error.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={contactId}
        onChange={(e) => setContactId(e.target.value)}
        placeholder="contactId"
        size="sm"
        className="text-xs"
      />
      <Input
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="userId (advisor)"
        size="sm"
        className="text-xs"
      />
      <Button onClick={save} disabled={saving} size="sm" variant="primary" className="text-xs">
        {saving ? (
          <>
            <Spinner size="sm" className="mr-1" />
            Guardando...
          </>
        ) : (
          'Guardar'
        )}
      </Button>
      {error && (
        <Text size="sm" className="text-error">
          {error}
        </Text>
      )}
    </div>
  );
}
