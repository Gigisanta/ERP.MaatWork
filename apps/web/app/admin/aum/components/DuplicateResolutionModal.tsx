"use client";

import { useEffect, useState } from 'react';
import { getAumDuplicates, matchAumRow } from '@/lib/api';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Button,
  Text,
  Badge,
  Spinner,
  Alert,
} from '@cactus/ui';

interface DuplicateRow {
  id: string;
  fileId: string;
  accountNumber: string;
  holderName: string | null;
  advisorRaw: string | null;
  matchedContactId: string | null;
  matchedUserId: string | null;
  matchStatus: string;
  isPreferred: boolean;
  conflictDetected: boolean;
  rowCreatedAt: string;
  file: {
    id: string;
    broker: string;
    originalFilename: string;
    createdAt: string;
  };
  contact: {
    id: string;
    fullName: string;
  } | null;
  user: {
    id: string;
    name: string;
  } | null;
}

interface DuplicateResolutionModalProps {
  accountNumber: string | null;
  onClose: () => void;
  onResolved?: () => void;
}

export default function DuplicateResolutionModal({
  accountNumber,
  onClose,
  onResolved
}: DuplicateResolutionModalProps) {
  const [rows, setRows] = useState<DuplicateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (accountNumber) {
      loadDuplicates();
    }
  }, [accountNumber]);

  const loadDuplicates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAumDuplicates(accountNumber);
      
      if (response.success && response.data) {
        setRows(response.data.rows || []);
        // Auto-select the preferred row if exists
        const preferred = response.data.rows.find((r: DuplicateRow) => r.isPreferred);
        if (preferred) setSelectedRowId(preferred.id);
      }
    } catch (e: any) {
      setError(e.userMessage || e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const saveResolution = async () => {
    if (!selectedRowId) return;
    setSaving(true);
    setError(null);
    try {
      // Update is_preferred for all rows for this account
      for (const row of rows) {
        await matchAumRow(row.fileId, {
          rowId: row.id,
          matchedContactId: row.matchedContactId,
          matchedUserId: row.matchedUserId,
          isPreferred: row.id === selectedRowId,
        });
      }
      
      if (onResolved) onResolved();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!accountNumber) return null;

  return (
    <Modal open={!!accountNumber} onOpenChange={(open) => !open && onClose()} size="full">
      <ModalHeader>
        <ModalTitle>Resolución de duplicados</ModalTitle>
        <ModalDescription>
          Cuenta: <span className="font-mono">{accountNumber}</span>
        </ModalDescription>
      </ModalHeader>
      <ModalContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner size="lg" />
            <Text color="secondary" className="mt-4">Cargando...</Text>
          </div>
        ) : error ? (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        ) : (
          <div className="space-y-4">
            <Text size="sm" color="secondary">
              Se encontraron {rows.length} importaciones con esta cuenta. Selecciona cuál es la versión correcta:
            </Text>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Seleccionar</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Archivo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Titular</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Asesor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Contacto</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row) => (
                    <tr key={row.id} className={row.conflictDetected ? 'bg-orange-50' : ''}>
                      <td className="px-4 py-2">
                        <input
                          type="radio"
                          name="selectedRow"
                          checked={selectedRowId === row.id}
                          onChange={() => setSelectedRowId(row.id)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{row.file.originalFilename}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {new Date(row.file.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{row.holderName}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{row.advisorRaw}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {row.contact ? row.contact.fullName : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <Badge
                          variant={
                            row.matchStatus === 'matched' ? 'success' :
                            row.matchStatus === 'ambiguous' ? 'warning' :
                            'secondary'
                          }
                          size="sm"
                        >
                          {row.matchStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={saveResolution}
          disabled={!selectedRowId || saving}
        >
          {saving ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Guardando...
            </>
          ) : (
            'Marcar como preferida'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
