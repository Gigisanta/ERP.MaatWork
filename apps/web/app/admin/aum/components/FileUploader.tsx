"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { uploadAumFile } from '@/lib/api';
import type { ApiErrorWithMessage } from '@/types';
import type { AumUploadResponse } from '@/types';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Button,
  Text,
  Stack,
  Alert,
  Heading,
} from '@cactus/ui';

interface FileUploaderProps {
  onUploadSuccess?: () => void;
}

interface UploadResponse {
  ok: boolean;
  fileId: string;
  filename: string;
  totals: {
    parsed: number;
    matched: number;
    ambiguous: number;
    conflicts: number;
    unmatched: number;
  };
}

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{ fileId: string; totals: AumUploadResponse['totals'] } | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const response = await uploadAumFile(file, 'balanz');
      
      if (!response.success || !response.data) {
        throw new Error('Error al subir archivo');
      }
      
      const data = response.data;
      const fileId = data.fileId;
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
    } catch (err: unknown) {
      const error = err as ApiErrorWithMessage;
      const errorMessage = error.userMessage || error.message || 'Error subiendo archivo';
      setError(errorMessage);
    } finally {
      setLoading(false);
      (e.target as HTMLInputElement).value = '';
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
        <label htmlFor="aum-file-input">
          <Button
            variant="primary"
            disabled={loading}
            className="cursor-pointer"
            type="button"
          >
            {loading ? 'Subiendo…' : 'Cargar archivo de Balanz (CSV o Excel)'}
          </Button>
        </label>
        <input 
          id="aum-file-input" 
          type="file" 
          className="hidden" 
          accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
          onChange={onChange} 
          disabled={loading} 
        />
        {error && (
          <Text size="sm" className="text-error">{error}</Text>
        )}
      </div>

      <Modal open={showSummary && !!uploadSummary} onOpenChange={setShowSummary}>
        <ModalHeader>
          <ModalTitle>Resumen de importación</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <Stack direction="column" gap="md">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Text>Total procesados:</Text>
                <Text weight="semibold">{uploadSummary?.totals.parsed}</Text>
              </div>
              
              {uploadSummary?.totals.matched && uploadSummary.totals.matched > 0 && (
                <div className="flex justify-between">
                  <Text className="text-success-base">Coincidencias:</Text>
                  <Text weight="semibold" className="text-success-base">{uploadSummary.totals.matched}</Text>
                </div>
              )}
              
              {uploadSummary?.totals.conflicts && uploadSummary.totals.conflicts > 0 && (
                <div className="flex justify-between">
                  <Text className="text-warning-base">Conflictos detectados:</Text>
                  <Text weight="semibold" className="text-warning-base">{uploadSummary.totals.conflicts}</Text>
                </div>
              )}
              
              {uploadSummary?.totals.ambiguous && uploadSummary.totals.ambiguous > 0 && (
                <div className="flex justify-between">
                  <Text className="text-warning-base">Requieren revisión:</Text>
                  <Text weight="semibold" className="text-warning-base">{uploadSummary.totals.ambiguous}</Text>
                </div>
              )}
              
              {uploadSummary?.totals.unmatched && uploadSummary.totals.unmatched > 0 && (
                <div className="flex justify-between">
                  <Text>Sin coincidencia:</Text>
                  <Text weight="semibold">{uploadSummary.totals.unmatched}</Text>
                </div>
              )}
            </div>

            {uploadSummary?.totals.conflicts && uploadSummary.totals.conflicts > 0 && (
              <Alert variant="warning" title="Conflictos detectados">
                Se detectaron conflictos en cuentas duplicadas. Revisa los duplicados en la vista previa.
              </Alert>
            )}

            <ModalFooter>
              <Button variant="primary" onClick={handleCloseSummary}>
                Ver archivo
              </Button>
            </ModalFooter>
          </Stack>
        </ModalContent>
      </Modal>
    </>
  );
}
