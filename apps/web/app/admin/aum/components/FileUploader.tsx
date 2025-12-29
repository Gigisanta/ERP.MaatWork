'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadAumFile } from '@/lib/api';
import type { ApiErrorWithMessage } from '@/types';
import { Button, Select, Spinner, Text, ProgressBar } from '@maatwork/ui';
import { logger, toLogContext } from '@/lib/logger';

// AI_DECISION: File upload limits aligned with backend
// Justificación: Client-side validation prevents unnecessary uploads and provides better UX
// Impacto: Better error feedback and reduced server load
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = ['.csv', '.xlsx', '.xls'];

interface FileUploaderProps {
  onUploadSuccess?: (fileId: string) => void;
}

/**
 * FileUploader - Component for uploading AUM files
 *
 * Features:
 * - Hidden native file input with button trigger (better UX than styled input)
 * - Client-side validation for file type and size
 * - Visual feedback with filename and size display
 * - Clear button to reset selection
 * - Broker selector (currently only Balanz)
 * - Success/error states with auto-clear
 *
 * @example
 * <FileUploader onUploadSuccess={() => loadRows()} />
 */
export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [broker, setBroker] = useState('balanz');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // AI_DECISION: Simular progreso durante upload para mejor UX
  // Justificación: La API no soporta progress events, pero mostramos feedback visual
  // Impacto: Usuario ve que algo está pasando durante uploads largos
  const startProgressSimulation = useCallback(() => {
    setUploadProgress(0);
    setUploadStatus('Preparando archivo...');

    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      // Simular progreso más rápido al inicio, más lento al final
      const increment = progress < 30 ? 5 : progress < 60 ? 3 : progress < 85 ? 1 : 0.5;
      progress = Math.min(progress + increment, 90); // Never reach 100 until complete
      setUploadProgress(progress);

      // Update status message based on progress
      if (progress < 30) {
        setUploadStatus('Subiendo archivo...');
      } else if (progress < 60) {
        setUploadStatus('Procesando datos...');
      } else if (progress < 85) {
        setUploadStatus('Normalizando filas...');
      } else {
        setUploadStatus('Finalizando...');
      }
    }, 200);
  }, []);

  const stopProgressSimulation = useCallback((isSuccess: boolean) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (isSuccess) {
      setUploadProgress(100);
      setUploadStatus('¡Completado!');
    } else {
      setUploadProgress(0);
      setUploadStatus('');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  /**
   * Validates file before setting state
   * Returns error message or null if valid
   */
  const validateFile = (f: File): string | null => {
    // Check file type
    const extension = f.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!extension || !ALLOWED_TYPES.includes(extension)) {
      return `Tipo de archivo no permitido. Solo se aceptan: ${ALLOWED_TYPES.join(', ')}`;
    }

    // Check file size
    if (f.size > MAX_FILE_SIZE) {
      const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
      return `Archivo demasiado grande. Tamaño máximo: ${maxSizeMB}MB`;
    }

    if (f.size === 0) {
      return 'El archivo está vacío';
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(false);
    const f = e.target.files?.[0] || null;

    if (!f) {
      setFile(null);
      return;
    }

    // Validate file before setting
    const validationError = validateFile(f);
    if (validationError) {
      logger.warn('AUM file validation failed', {
        fileName: f.name,
        fileSize: f.size,
        error: validationError,
      });
      setError(validationError);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFile(null);
      return;
    }

    setFile(f);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(false);
    startProgressSimulation();

    try {
      logger.info('Starting AUM file upload', {
        fileName: file.name,
        fileSize: file.size,
        broker,
      });

      const resp = await uploadAumFile(file, broker);

      logger.info('AUM file upload response received', {
        success: resp?.success,
        hasData: !!resp?.data,
        dataKeys: resp?.data ? Object.keys(resp.data) : [],
        ...(resp ? toLogContext({ fullResponse: resp }) : {}),
      });

      // Verificar respuesta del servidor
      // El apiClient normaliza { ok: true, ... } a { success: true, data: { ok: true, fileId, ... } }
      if (resp?.success && resp.data) {
        // El backend retorna { ok: true, fileId, filename, totals, ... }
        // que se normaliza a resp.data = { ok: true, fileId, filename, totals, ... }
        const { fileId, totals } = resp.data;

        if (!fileId) {
          logger.error('AUM file upload response missing fileId', {
            fileName: file.name,
            ...(resp.data ? toLogContext({ responseData: resp.data }) : {}),
          });
          setError('Error: El servidor no retornó un ID de archivo válido');
          return;
        }

        stopProgressSimulation(true);
        setSuccess(true);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        logger.info('AUM file uploaded successfully', {
          fileId,
          fileName: file.name,
          fileSize: file.size,
          broker,
          ...toLogContext({ totals }),
        });

        if (onUploadSuccess) {
          logger.info('Calling onUploadSuccess callback', { fileId });
          onUploadSuccess(fileId);
        } else {
          logger.warn('onUploadSuccess callback not provided');
        }

        setTimeout(() => setSuccess(false), 5000); // Mostrar éxito por más tiempo
      } else {
        // Respuesta sin éxito
        const details = resp?.details
          ? Array.isArray(resp.details)
            ? resp.details.join('; ')
            : resp.details
          : null;
        const errorMsg = resp?.error || details || 'Error desconocido al procesar archivo';
        logger.error('AUM file upload failed', {
          fileName: file.name,
          fileSize: file.size,
          broker,
          error: resp?.error,
          details,
          ...(resp ? toLogContext({ response: resp }) : {}),
        });
        stopProgressSimulation(false);
        setError(errorMsg);
      }
    } catch (e: unknown) {
      stopProgressSimulation(false);
      const apiErr = e as ApiErrorWithMessage;
      const errorMsg =
        apiErr.userMessage || apiErr.message || apiErr.error || 'Error al subir archivo';
      logger.error('AUM file upload error', {
        fileName: file.name,
        fileSize: file.size,
        broker,
        error: apiErr.message || apiErr.error,
        userMessage: apiErr.userMessage,
        ...(e ? toLogContext({ fullError: e }) : {}),
      });
      setError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {/* File selection button */}
      <Button
        size="sm"
        variant={file ? 'outline' : 'primary'}
        onClick={handleButtonClick}
        disabled={uploading}
        className="text-xs"
      >
        {file ? '📄 Cambiar archivo' : '📤 Seleccionar archivo'}
      </Button>

      {/* File info display */}
      {file && (
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded border">
          <span className="text-xs font-medium text-gray-700 truncate max-w-xs">{file.name}</span>
          <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
          <button
            type="button"
            onClick={handleClearFile}
            disabled={uploading}
            className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
            aria-label="Eliminar archivo"
          >
            ✕
          </button>
        </div>
      )}

      {/* Broker selector */}
      <Select
        value={broker}
        onValueChange={(v) => setBroker(v)}
        items={[{ value: 'balanz', label: 'Balanz' }]}
        placeholder="Broker"
        disabled={uploading}
      />

      {/* Upload button */}
      <Button
        size="sm"
        variant="primary"
        disabled={!file || uploading}
        onClick={handleUpload}
        className={`text-xs ${success ? 'bg-green-600 hover:bg-green-700' : ''}`}
      >
        {uploading ? (
          <>
            <Spinner size="sm" className="mr-1" /> Subiendo...
          </>
        ) : success ? (
          '✓ Subido'
        ) : (
          'Subir'
        )}
      </Button>

      {/* Progress bar during upload */}
      {uploading && (
        <div className="w-full">
          <ProgressBar
            value={uploadProgress}
            showLabel
            label={uploadStatus}
            variant={uploadProgress === 100 ? 'success' : 'default'}
            size="md"
            animated
          />
        </div>
      )}

      {/* Success display */}
      {success && (
        <div className="w-full bg-green-50 border border-green-200 rounded p-2">
          <Text size="sm" className="text-green-700">
            ✓ Archivo subido exitosamente. Revisa la consola del navegador para ver detalles del
            procesamiento.
          </Text>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="w-full bg-red-50 border border-red-200 rounded p-2">
          <Text size="sm" className="text-red-700">
            {error}
          </Text>
        </div>
      )}
    </div>
  );
}
