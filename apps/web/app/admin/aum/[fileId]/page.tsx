"use client";
// AI_DECISION: Fix AuthContext import path to use the correct relative path and eliminate broken alias.
// Justificación: The previous alias '@/app/admin/auth/AuthContext' does not resolve; restoring the local relative path as per project structure and original file context.
// Impacto: Authentication will work as intended; linter/type errors removed. No breaking changes.
// AI_DECISION: Fix incorrect import path for AuthContext and update to client/server component pattern as per repo conventions.
// Justificación: The '../../auth/AuthContext' import path does not resolve due to incorrect relative location from this route folder. Based on app structure, AuthContext and useAuth should be imported from '@/app/admin/auth/AuthContext' since 'app/' is a Next.js root. This also prevents module resolution errors on Next.js App Router.
// Impacto: Authentication will now resolve and be typed correctly. All hooks and context providers resolve as expected. No breaking changes.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAumFilePreview, getAumFileExportUrl, commitAumFile } from '@/lib/api';
import { Toast, Button, Text, Badge, Breadcrumbs, BreadcrumbItem } from '@cactus/ui';
import ContactUserPicker from '../components/ContactUserPicker';
import type { ApiErrorWithMessage, AumFile, AumRow } from '@/types';

export default function AumPreviewPage() {
  const params = useParams();
  const fileId = params.fileId as string;
  const [file, setFile] = useState<AumFile | null>(null);
  const [rows, setRows] = useState<AumRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    description?: string;
    variant: 'success' | 'error' | 'warning' | 'info';
  }>({
    show: false,
    title: '',
    variant: 'info'
  });

  const loadRows = async () => {
    try {
      const response = await getAumFilePreview(fileId);
      
      if (response.success && response.data) {
        setFile(response.data.file);
        setRows(response.data.rows || []);
      }
    } catch (e: unknown) {
      const error = e as ApiErrorWithMessage;
      setError(error.userMessage || error.message || error.error || 'Error');
    }
  };

  useEffect(() => {
    loadRows();
  }, [fileId]);

  const breadcrumbItems: BreadcrumbItem[] = [
    { href: '/admin', label: 'Administración' },
    { href: '/admin/aum', label: 'AUM' },
    { href: `/admin/aum/${fileId}`, label: file?.originalFilename || 'Vista previa' }
  ];

  return (
    <div className="space-y-4">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Vista previa importación</h2>
          {file && <p className="text-sm text-gray-600">Archivo: {file.originalFilename} | Estado: {file.status}</p>}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={getAumFileExportUrl(fileId)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 inline-block"
          >
            Descargar CSV
          </a>
          <Button 
            onClick={async () => {
              try {
                await commitAumFile(fileId);
                setToast({
                  show: true,
                  title: 'Sincronización confirmada',
                  variant: 'success'
                });
                loadRows();
              } catch (e: unknown) {
                const error = e as ApiErrorWithMessage;
                setToast({
                  show: true,
                  title: 'Error al confirmar',
                  description: error.userMessage || error.message || error.error || 'Error desconocido',
                  variant: 'error'
                });
              }
            }}
            variant="primary"
            size="sm"
          >
            Confirmar sincronización
          </Button>
        </div>
      </div>

      {file && file.totals && (
        <Text size="sm" color="secondary">
          Procesados: {file.totals.parsed} · Coincidencias: {file.totals.matched} · Pendientes: {file.totals.unmatched}
        </Text>
      )}
      {error && (
        <Text size="sm" className="text-error">{error}</Text>
      )}

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cuenta</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Titular (Broker)</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Asesor (archivo)</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">CRM Contacto (nombre)</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Contacto CRM</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Usuario</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Vincular</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-sm text-gray-700">{r.accountNumber}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{r.holderName}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{r.advisorRaw}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{r.matchedContactId || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{r.raw?.Titular || r.holderName || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{r.matchedUserId || '-'}</td>
                <td className="px-4 py-2 text-sm">
                  <Badge 
                    variant={r.matchStatus === 'matched' ? 'success' : 'warning'} 
                    size="sm"
                  >
                    {r.matchStatus}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-sm">
                  <ContactUserPicker
                    fileId={fileId}
                    rowId={r.id}
                    initialContactId={r.matchedContactId}
                    initialUserId={r.matchedUserId}
                    onSave={() => loadRows()}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={6}>Sin filas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <Toast
        open={toast.show}
        title={toast.title}
        {...(toast.description ? { description: toast.description } : {})}
        variant={toast.variant}
        onOpenChange={(open) => setToast(prev => ({ ...prev, show: open }))}
      />
    </div>
  );
}
