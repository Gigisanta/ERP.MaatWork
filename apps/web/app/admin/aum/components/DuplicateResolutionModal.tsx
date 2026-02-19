'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAumDuplicates, matchAumRow } from '@/lib/api';
import type { AumRow, ApiErrorWithMessage } from '@/types';
import { Button, Modal, Spinner, Text } from '@maatwork/ui';

interface DuplicateResolutionModalProps {
  accountNumber: string;
  onClose: () => void;
  onResolved?: () => void;
}

export default function DuplicateResolutionModal({
  accountNumber,
  onClose,
  onResolved,
}: DuplicateResolutionModalProps) {
  const [rows, setRows] = useState<AumRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const preferredRowId = useMemo(() => rows.find((r) => r.isPreferred)?.id ?? null, [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAumDuplicates(accountNumber);
      if (res.success && res.data) {
        setRows(res.data.rows || []);
        const currentPreferred = res.data.rows?.find((r: AumRow) => r.isPreferred)?.id ?? null;
        setSelectedRowId(currentPreferred);
      }
    } catch (e: unknown) {
      const apiErr = e as ApiErrorWithMessage;
      setError(apiErr.userMessage || apiErr.message || 'Error cargando duplicados');
    } finally {
      setLoading(false);
    }
  }, [accountNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleResolve = async () => {
    if (!selectedRowId) return;
    const target = rows.find((r) => r.id === selectedRowId);
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      await matchAumRow(target.fileId, {
        rowId: target.id,
        matchedContactId: target.matchedContactId,
        matchedUserId: target.matchedUserId,
        isPreferred: true,
      });
      if (onResolved) onResolved();
      onClose();
    } catch (e: unknown) {
      const apiErr = e as ApiErrorWithMessage;
      setError(apiErr.userMessage || apiErr.message || 'Error al resolver duplicados');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
      title={`Duplicados para ${accountNumber}`}
    >
      {loading ? (
        <div className="py-6 flex items-center justify-center text-gray-600">
          <Spinner size="sm" className="mr-2" /> Cargando...
        </div>
      ) : (
        <div className="space-y-4">
          {rows.length === 0 ? (
            <Text size="sm" className="text-gray-600">
              No hay duplicados para esta cuenta.
            </Text>
          ) : (
            <>
              <div className="space-y-2">
                {rows.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="preferredRow"
                      checked={(selectedRowId || preferredRowId) === r.id}
                      onChange={() => setSelectedRowId(r.id)}
                    />
                    <span>
                      {new Date(r.rowCreatedAt).toLocaleString()} • {r.holderName ?? ''} •{' '}
                      {r.advisorRaw ?? ''} • {r.matchStatus}
                      {r.file ? ` • ${r.file.originalFilename} (${r.file.broker})` : ''}
                    </span>
                  </label>
                ))}
              </div>
              {error && (
                <Text size="sm" className="text-error">
                  {error}
                </Text>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose} size="sm">
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedRowId || saving}
                  onClick={handleResolve}
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-1" /> Guardando...
                    </>
                  ) : (
                    'Guardar preferida'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
