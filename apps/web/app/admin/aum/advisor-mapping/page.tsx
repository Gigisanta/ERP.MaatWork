'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/auth/AuthContext';
import { canImportFiles } from '@/lib/auth-helpers';
import { uploadAdvisorMapping } from '@/lib/api';
import type { ApiErrorWithMessage } from '@/types';
import { Button, Text, Spinner, Alert } from '@maatwork/ui';

// AI_DECISION: File upload limits aligned with backend
// Justificación: Client-side validation prevents unnecessary uploads and provides better UX
// Impacto: Better error feedback and reduced server load
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = ['.csv', '.xlsx', '.xls'];

/**
 * Page for uploading advisor-account mapping file
 *
 * This file is loaded once and applies to all future monthly imports.
 * It should contain columns: comitente/cuenta and asesor
 */
export default function AdvisorMappingPage() {
  const { user } = useAuth();
  const canImport = canImportFiles(user);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    message: string;
    totals: {
      inserted: number;
      updated: number;
      errors: number;
      total: number;
    };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setSuccess(null);
    const f = e.target.files?.[0] || null;

    if (!f) {
      setFile(null);
      return;
    }

    // Validate file before setting
    const validationError = validateFile(f);
    if (validationError) {
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
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const resp = await uploadAdvisorMapping(file);
      if (resp?.success && resp.data) {
        setSuccess({
          message: resp.data.message || 'Mapeo cargado exitosamente',
          totals: resp.data.totals,
        });
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError('Error al procesar respuesta del servidor');
      }
    } catch (e: unknown) {
      const apiErr = e as ApiErrorWithMessage;
      setError(apiErr.userMessage || apiErr.message || 'Error al subir archivo');
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mapeo Asesor-Cuenta</h2>
          <p className="text-sm text-gray-600">
            Carga un archivo una vez con el mapeo de asesores por cuenta. Este mapeo se aplicará a
            todas las importaciones futuras.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/aum">
            <Button variant="outline" size="sm">
              ← Volver al hub
            </Button>
          </Link>
          <Link href="/admin/aum/rows">
            <Button variant="outline" size="sm">
              Ver filas AUM
            </Button>
          </Link>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <Text size="sm" className="text-blue-900">
          <strong>Instrucciones:</strong>
          <br />• El archivo debe contener las columnas:{' '}
          <code className="bg-blue-100 px-1 rounded">comitente</code> o{' '}
          <code className="bg-blue-100 px-1 rounded">cuenta</code>, y{' '}
          <code className="bg-blue-100 px-1 rounded">asesor</code>
          <br />
          • Este archivo se carga una sola vez y se aplica a todas las importaciones mensuales
          futuras
          <br />• Si ya existe un mapeo para una cuenta, se actualizará con los nuevos valores
        </Text>
      </div>

      {/* Upload section */}
      {!canImport ? (
        <Alert variant="warning">
          <Text weight="medium">Acceso restringido</Text>
          <Text size="sm" className="mt-1">
            Solo los administradores pueden cargar archivos de mapeo de asesores.
          </Text>
        </Alert>
      ) : (
        <div className="border rounded p-6 bg-white">
          <div className="space-y-4">
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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={file ? 'outline' : 'primary'}
                onClick={handleButtonClick}
                disabled={uploading}
              >
                {file ? '📄 Cambiar archivo' : '📤 Seleccionar archivo'}
              </Button>

              {/* File info display */}
              {file && (
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded border">
                  <span className="text-sm font-medium text-gray-700 truncate max-w-xs">
                    {file.name}
                  </span>
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
            </div>

            {/* Upload button */}
            <div>
              <Button
                size="sm"
                variant="primary"
                disabled={!file || uploading}
                onClick={handleUpload}
                className={success ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {uploading ? (
                  <>
                    <Spinner size="sm" className="mr-1" /> Subiendo...
                  </>
                ) : success ? (
                  '✓ Subido'
                ) : (
                  'Subir mapeo'
                )}
              </Button>
            </div>

            {/* Error display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <Text size="sm" className="text-red-700">
                  {error}
                </Text>
              </div>
            )}

            {/* Success display */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <Text size="sm" className="text-green-700 font-medium mb-2">
                  {success.message}
                </Text>
                <div className="text-xs text-green-600 space-y-1">
                  <div>Total procesado: {success.totals.total}</div>
                  <div>Insertados: {success.totals.inserted}</div>
                  <div>Actualizados: {success.totals.updated}</div>
                  {success.totals.errors > 0 && (
                    <div className="text-orange-600">Errores: {success.totals.errors}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
