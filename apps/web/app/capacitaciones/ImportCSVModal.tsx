'use client';

import { useState } from 'react';
import { importCapacitacionesCSV } from '@/lib/api';
import type { ImportCapacitacionesResponse } from '@/types';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Button,
  Stack,
  Alert,
  Text,
} from '@cactus/ui';

interface ImportCSVModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportCSVModal({ onClose, onSuccess }: ImportCSVModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportCapacitacionesResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Por favor selecciona un archivo CSV');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await importCapacitacionesCSV(file);
      if (response.success && response.data) {
        setResult(response.data);
        if (response.data.totalImported > 0) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        // Mostrar error con detalles si están disponibles
        const errorMessage = response.error || 'Error al importar el archivo';
        const details =
          typeof response.details === 'string'
            ? response.details
            : Array.isArray(response.details)
              ? response.details.join('; ')
              : null;
        setError(details ? `${errorMessage}: ${details}` : errorMessage);
      }
    } catch (err: unknown) {
      let errorMessage = 'Error al importar el archivo';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object' && 'error' in err) {
        const errorPayload = err as { error?: unknown; details?: unknown };
        errorMessage =
          typeof errorPayload.error === 'string' ? errorPayload.error : String(errorPayload.error);
        const details =
          typeof errorPayload.details === 'string'
            ? errorPayload.details
            : Array.isArray(errorPayload.details)
              ? errorPayload.details.join('; ')
              : null;
        if (details) {
          errorMessage = `${errorMessage}: ${details}`;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onOpenChange={onClose}>
      <ModalHeader>
        <ModalTitle>Importar capacitaciones desde CSV</ModalTitle>
        <ModalDescription>
          Selecciona un archivo CSV con el formato: Titulo,TEMA,LINK,Fecha
        </ModalDescription>
      </ModalHeader>
      <ModalContent>
        <Stack direction="column" gap="md">
          {error && <Alert variant="error">{error}</Alert>}

          {result && (
            <Alert variant={result.totalErrors > 0 ? 'warning' : 'success'}>
              <Text weight="medium" className="mb-2">
                Importación completada
              </Text>
              <Text size="sm">
                Procesadas: {result.totalProcessed} | Importadas: {result.totalImported} | Errores:{' '}
                {result.totalErrors}
              </Text>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <Text size="sm" weight="medium">
                    Errores:
                  </Text>
                  <ul className="list-disc list-inside mt-1 text-sm max-h-40 overflow-y-auto">
                    {result.errors.slice(0, 10).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {result.errors.length > 10 && <li>... y {result.errors.length - 10} más</li>}
                  </ul>
                </div>
              )}
            </Alert>
          )}

          <div>
            <Text size="sm" weight="medium" className="mb-2">
              Archivo CSV
            </Text>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              disabled={loading}
            />
            {file && (
              <Text size="sm" color="secondary" className="mt-2">
                Archivo seleccionado: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </Text>
            )}
          </div>

          <Alert variant="info">
            <Text size="sm">
              <strong>Formato esperado:</strong> La primera fila debe contener los headers:
              Titulo,TEMA,LINK,Fecha. Las fechas deben estar en formato DD/MM/YYYY.
            </Text>
          </Alert>
        </Stack>
      </ModalContent>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          {result ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!result && (
          <Button
            type="button"
            variant="primary"
            onClick={handleImport}
            disabled={loading || !file}
          >
            {loading ? 'Importando...' : 'Importar'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
