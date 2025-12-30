'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { importContactsCsv } from '@/lib/api';
import { Button, Spinner, Text, ProgressBar } from '@maatwork/ui';
import { type ImportStats } from '@/types';

// AI_DECISION: Límites de archivo alineados con el backend para importación de contactos
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['.csv'];

interface ContactFileUploaderProps {
  onImportSuccess?: (data: { stats: ImportStats; message: string }) => void;
}

/**
 * ContactFileUploader - Componente para importar contactos desde CSV
 */
export default function ContactFileUploader({ onImportSuccess }: ContactFileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ stats: ImportStats; message: string } | null>(
    null
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startProgressSimulation = useCallback(() => {
    setUploadProgress(0);
    setUploadStatus('Preparando archivo...');

    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      const increment = progress < 30 ? 5 : progress < 60 ? 3 : progress < 85 ? 1 : 0.5;
      progress = Math.min(progress + increment, 95);
      setUploadProgress(progress);

      if (progress < 30) {
        setUploadStatus('Subiendo archivo...');
      } else if (progress < 60) {
        setUploadStatus('Analizando CSV...');
      } else if (progress < 85) {
        setUploadStatus('Procesando contactos y asesores...');
      } else {
        setUploadStatus('Finalizando importación...');
      }
    }, 300);
  }, []);

  const stopProgressSimulation = useCallback((isSuccess: boolean) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (isSuccess) {
      setUploadProgress(100);
      setUploadStatus('¡Importación completada!');
    } else {
      setUploadProgress(0);
      setUploadStatus('');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const validateFile = (f: File): string | null => {
    const extension = f.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!extension || !ALLOWED_TYPES.includes(extension)) {
      return `Tipo de archivo no permitido. Solo se aceptan: ${ALLOWED_TYPES.join(', ')}`;
    }

    if (f.size > MAX_FILE_SIZE) {
      const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
      return `Archivo demasiado grande. Tamaño máximo: ${maxSizeMB}MB`;
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessData(null);
    const f = e.target.files?.[0] || null;

    if (!f) {
      setFile(null);
      return;
    }

    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFile(null);
      return;
    }

    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccessData(null);
    startProgressSimulation();

    try {
      const resp = await importContactsCsv(file);

      if (resp.success && resp.data) {
        stopProgressSimulation(true);
        setSuccessData(resp.data);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (onImportSuccess) {
          onImportSuccess(resp.data);
        }
      } else {
        stopProgressSimulation(false);
        setError(resp.error || 'Error al procesar la importación');
      }
    } catch (e: unknown) {
      stopProgressSimulation(false);
      const err = e as { userMessage?: string; message?: string };
      setError(err.userMessage || err.message || 'Error inesperado al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />

        <Button
          variant={file ? 'outline' : 'primary'}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {file ? '📄 Cambiar archivo' : '📤 Seleccionar CSV'}
        </Button>

        {file && (
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border">
            <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{file.name}</span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={uploading}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        <Button
          variant="primary"
          disabled={!file || uploading}
          onClick={handleUpload}
          className={successData ? 'bg-green-600' : ''}
        >
          {uploading ? (
            <>
              <Spinner size="sm" className="mr-2" /> Importando...
            </>
          ) : successData ? (
            '✓ Importado'
          ) : (
            'Iniciar Importación'
          )}
        </Button>
      </div>

      {uploading && (
        <div className="w-full">
          <ProgressBar
            value={uploadProgress}
            showLabel
            label={uploadStatus}
            variant={uploadProgress === 100 ? 'success' : 'default'}
            animated
          />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <Text className="text-red-700 font-medium">Error:</Text>
          <Text className="text-red-600 text-sm mt-1">{error}</Text>
        </div>
      )}

      {successData && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 space-y-3">
          <Text className="text-green-800 font-bold text-lg">✓ {successData.message}</Text>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <div className="bg-white p-3 rounded border border-green-100 shadow-sm">
              <Text size="xs" className="text-gray-500 uppercase font-semibold">
                Total
              </Text>
              <Text size="xl" className="font-bold text-gray-900">
                {successData.stats.total}
              </Text>
            </div>
            <div className="bg-white p-3 rounded border border-green-100 shadow-sm">
              <Text size="xs" className="text-green-600 uppercase font-semibold">
                Creados
              </Text>
              <Text size="xl" className="font-bold text-green-700">
                {successData.stats.created}
              </Text>
            </div>
            <div className="bg-white p-3 rounded border border-green-100 shadow-sm">
              <Text size="xs" className="text-blue-600 uppercase font-semibold">
                Actualizados
              </Text>
              <Text size="xl" className="font-bold text-blue-700">
                {successData.stats.updated}
              </Text>
            </div>
            <div className="bg-white p-3 rounded border border-green-100 shadow-sm">
              <Text size="xs" className="text-gray-400 uppercase font-semibold">
                Omitidos
              </Text>
              <Text size="xl" className="font-bold text-gray-500">
                {successData.stats.skipped}
              </Text>
            </div>
          </div>

          {successData.stats.unknownAdvisors.length > 0 && (
            <div className="mt-4 border-t border-green-200 pt-3">
              <Text size="sm" className="font-semibold text-amber-700 mb-1">
                Asesores no reconocidos (contactos creados como unassigned):
              </Text>
              <div className="flex flex-wrap gap-2">
                {successData.stats.unknownAdvisors.map((adv, i) => (
                  <span key={i} className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded">
                    {adv}
                  </span>
                ))}
              </div>
              <Text size="xs" className="text-gray-500 mt-2 italic">
                Tip: Agregue estos nombres como alias en Configuración de Asesores para futuros
                procesos.
              </Text>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
