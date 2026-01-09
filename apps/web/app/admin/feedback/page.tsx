'use client';

import { useRequireAuth } from '@/auth/useRequireAuth';
import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Heading,
  Text,
  Stack,
  DataTable,
  Select,
  Badge,
  Spinner,
  Icon,
  Pagination,
  type Column,
} from '@maatwork/ui';
import { useFeedback } from '@/lib/api-hooks';
import { updateFeedbackStatus, type Feedback } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Status and type labels/colors
const statusLabels: Record<
  Feedback['status'],
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' }
> = {
  new: { label: 'Nuevo', variant: 'warning' },
  in_progress: { label: 'En Progreso', variant: 'default' },
  completed: { label: 'Completado', variant: 'success' },
  closed: { label: 'Cerrado', variant: 'error' },
};

const typeLabels: Record<Feedback['type'], { label: string; emoji: string }> = {
  feedback: { label: 'Comentario', emoji: '💬' },
  feature_request: { label: 'Sugerencia', emoji: '💡' },
  bug: { label: 'Bug', emoji: '🐛' },
};

export default function AdminFeedbackPage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 20;

  const {
    feedback: items,
    meta,
    error,
    isLoading,
    mutate,
  } = useFeedback({
    page,
    limit,
    status: statusFilter,
    type: typeFilter,
  });

  // Handle status update
  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      try {
        setActionLoading(id);
        const res = await updateFeedbackStatus(id, newStatus);
        if (!res.success) throw new Error(res.error || 'Error updating status');
        await mutate();
      } catch (err) {
        console.error('Error updating feedback status:', err);
      } finally {
        setActionLoading(null);
      }
    },
    [mutate]
  );

  const columns: Column<Feedback>[] = useMemo(
    () => [
      {
        key: 'type',
        header: 'Tipo',
        render: (row) => (
          <div className="flex items-center gap-2">
            <span className="text-lg">{typeLabels[row.type].emoji}</span>
            <Text size="sm">{typeLabels[row.type].label}</Text>
          </div>
        ),
      },
      {
        key: 'content',
        header: 'Contenido',
        render: (row) => (
          <div className="max-w-md">
            <Text size="sm" className="line-clamp-2">
              {row.content}
            </Text>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        render: (row) => (
          <div className="min-w-[140px]">
            <Select
              value={row.status}
              onValueChange={(value) => handleStatusChange(row.id, value)}
              disabled={actionLoading === row.id}
              items={[
                { value: 'new', label: '🆕 Nuevo' },
                { value: 'in_progress', label: '🔄 En Progreso' },
                { value: 'completed', label: '✅ Completado' },
                { value: 'closed', label: '❌ Cerrado' },
              ]}
            />
          </div>
        ),
      },
      {
        key: 'createdAt',
        header: 'Fecha',
        render: (row) => (
          <Text size="sm" color="secondary">
            {formatDistanceToNow(new Date(row.createdAt), {
              addSuffix: true,
              locale: es,
            })}
          </Text>
        ),
      },
    ],
    [actionLoading, handleStatusChange]
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-2" />
          <Text>Cargando...</Text>
        </div>
      </div>
    );
  }

  // Redirect if not admin
  if (user && user.role !== 'admin') {
    router.push('/home');
    return null;
  }

  return (
    <div className="p-4 md:p-8">
      <Stack direction="column" gap="lg">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-primary hover:underline text-sm font-medium">
              ← Volver al panel
            </Link>
            <Heading level={1}>Feedback de Usuarios</Heading>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-lg py-1 px-3">
              {meta ? `${meta.total} mensajes` : '...'}
            </Badge>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/30 text-error">
            Error al cargar feedback. Por favor intenta de nuevo.
          </div>
        )}

        {/* Filters Card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Text size="sm" weight="medium">
                  Estado:
                </Text>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  items={[
                    { value: '', label: 'Todos' },
                    { value: 'new', label: '🆕 Nuevo' },
                    { value: 'in_progress', label: '🔄 En Progreso' },
                    { value: 'completed', label: '✅ Completado' },
                    { value: 'closed', label: '❌ Cerrado' },
                  ]}
                />
              </div>
              <div className="flex items-center gap-2">
                <Text size="sm" weight="medium">
                  Tipo:
                </Text>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value);
                    setPage(1);
                  }}
                  items={[
                    { value: '', label: 'Todos' },
                    { value: 'feedback', label: '💬 Comentario' },
                    { value: 'feature_request', label: '💡 Sugerencia' },
                    { value: 'bug', label: '🐛 Bug' },
                  ]}
                />
              </div>
              {(statusFilter || typeFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('');
                    setTypeFilter('');
                    setPage(1);
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feedback Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="edit" size={20} />
              Mensajes de Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable<Feedback & Record<string, unknown>>
              data={items as (Feedback & Record<string, unknown>)[]}
              columns={columns as Column<Feedback & Record<string, unknown>>[]}
              keyField="id"
              emptyMessage="No hay feedback disponible."
              loading={isLoading}
            />

            {meta.totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  currentPage={page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </Stack>
    </div>
  );
}
