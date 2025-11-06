"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { canImportFiles, canEditSharedResources } from '@/lib/auth-helpers';
import { useCapacitaciones, useInvalidateCapacitacionesCache } from '@/lib/api-hooks';
import { createCapacitacion, updateCapacitacion, deleteCapacitacion } from '@/lib/api';
import type { Capacitacion, CreateCapacitacionRequest } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Heading,
  Text,
  Stack,
  Input,
  Select,
  Badge,
  DataTable,
  DropdownMenu,
  DropdownMenuItem,
  EmptyState,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Alert,
  Spinner,
  Icon,
  Toast,
  type Column,
} from '@cactus/ui';
import ConfirmDialog from '../components/ConfirmDialog';
import CapacitacionForm from './CapacitacionForm';
import ImportCSVModal from './ImportCSVModal';

export default function CapacitacionesList() {
  const { user } = useAuth();
  const canImport = canImportFiles(user);
  const canEdit = canEditSharedResources(user);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTema, setSelectedTema] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCapacitacion, setEditingCapacitacion] = useState<Capacitacion | null>(null);
  const [toast, setToast] = useState<{ show: boolean; title: string; description?: string; variant: 'success' | 'error' }>({
    show: false,
    title: '',
    variant: 'success'
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'default';
  }>({
    open: false,
    title: '',
    onConfirm: () => {}
  });

  const queryParams: { tema?: string; search?: string; limit?: number } = { limit: 100 };
  if (selectedTema !== 'all') {
    queryParams.tema = selectedTema;
  }
  if (searchTerm) {
    queryParams.search = searchTerm;
  }
  const { capacitaciones, pagination, isLoading, error, mutate } = useCapacitaciones(queryParams);
  const invalidateCache = useInvalidateCapacitacionesCache();

  // Get unique temas from capacitaciones
  const temas = useMemo(() => {
    const temasSet = new Set<string>();
    (capacitaciones as Capacitacion[]).forEach((c: Capacitacion) => {
      if (c.tema) temasSet.add(c.tema);
    });
    return Array.from(temasSet).sort();
  }, [capacitaciones]);

  // Filter capacitaciones client-side for search
  const filteredCapacitaciones = useMemo(() => {
    const capArray = capacitaciones as Capacitacion[];
    if (!searchTerm) return capArray;
    const searchLower = searchTerm.toLowerCase();
    return capArray.filter((c: Capacitacion) =>
      c.titulo.toLowerCase().includes(searchLower) ||
      c.tema.toLowerCase().includes(searchLower)
    );
  }, [capacitaciones, searchTerm]);

  const handleCreate = async (data: CreateCapacitacionRequest) => {
    try {
      await createCapacitacion(data);
      await invalidateCache();
      setShowCreateModal(false);
      setToast({
        show: true,
        title: 'Capacitación creada',
        description: 'La capacitación se ha creado exitosamente.',
        variant: 'success'
      });
    } catch (err) {
      setToast({
        show: true,
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al crear la capacitación',
        variant: 'error'
      });
    }
  };

  const handleUpdate = async (id: string, data: Partial<CreateCapacitacionRequest>) => {
    try {
      await updateCapacitacion(id, data);
      await invalidateCache();
      setEditingCapacitacion(null);
      setToast({
        show: true,
        title: 'Capacitación actualizada',
        description: 'La capacitación se ha actualizado exitosamente.',
        variant: 'success'
      });
    } catch (err) {
      setToast({
        show: true,
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al actualizar la capacitación',
        variant: 'error'
      });
    }
  };

  const handleDelete = async (capacitacion: Capacitacion) => {
    try {
      await deleteCapacitacion(capacitacion.id);
      await invalidateCache();
      setToast({
        show: true,
        title: 'Capacitación eliminada',
        description: 'La capacitación se ha eliminado exitosamente.',
        variant: 'success'
      });
    } catch (err) {
      setToast({
        show: true,
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al eliminar la capacitación',
        variant: 'error'
      });
    }
  };

  const columns: Column<Capacitacion>[] = useMemo(() => {
    const baseColumns: Column<Capacitacion>[] = [
      {
        key: 'titulo',
        header: 'Título',
        sortable: true,
        render: (row) => (
          <Text weight="medium" className="text-sm">
            {row.titulo}
          </Text>
        ),
      },
      {
        key: 'tema',
        header: 'Tema',
        sortable: true,
        render: (row) => (
          <Badge>{row.tema}</Badge>
        ),
      },
      {
        key: 'fecha',
        header: 'Fecha',
        sortable: true,
        render: (row) => (
          <Text size="sm" color="secondary">
            {row.fecha ? new Date(row.fecha).toLocaleDateString('es-AR') : '-'}
          </Text>
        ),
      },
      {
        key: 'link',
        header: 'Link',
        render: (row) => (
          <a
            href={row.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
          >
            <Icon name="list" size={14} />
            Ver capacitación
          </a>
        ),
      },
    ];

    // Solo mostrar columna de acciones si el usuario tiene permisos de edición
    if (canEdit) {
      baseColumns.push({
        key: 'id',
        header: 'Acciones',
        render: (row) => (
          <DropdownMenu
            trigger={
              <Button variant="ghost" size="sm">
                <Icon name="more-vertical" size={16} />
              </Button>
            }
          >
            <DropdownMenuItem onClick={() => setEditingCapacitacion(row)}>
              <Icon name="edit" size={14} className="mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setConfirmDialog({
                  open: true,
                  title: 'Eliminar capacitación',
                  description: `¿Estás seguro de que quieres eliminar "${row.titulo}"? Esta acción no se puede deshacer.`,
                  variant: 'danger',
                  onConfirm: () => {
                    handleDelete(row);
                    setConfirmDialog({ open: false, title: '', onConfirm: () => {} });
                  }
                });
              }}
              className="text-red-600"
            >
              <Icon name="trash-2" size={14} className="mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenu>
        ),
      });
    }

    return baseColumns;
  }, [canEdit]);

  if (error) {
    return (
      <Alert variant="error">
        Error al cargar capacitaciones: {error instanceof Error ? error.message : 'Error desconocido'}
      </Alert>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Heading level={1}>Capacitaciones</Heading>
        <Text color="secondary" className="mt-2">
          Gestiona tu biblioteca de capacitaciones y recursos de aprendizaje
        </Text>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            {canEdit && (
              <div className="flex gap-2">
                {canImport && (
                  <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                    📤 Importar CSV
                  </Button>
                )}
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  <Icon name="plus" size={16} className="mr-2" />
                  Agregar capacitación
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Stack direction="row" gap="md" className="flex-wrap">
            <Input
              placeholder="Buscar por título o tema..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <select
              value={selectedTema}
              onChange={(e) => setSelectedTema(e.target.value)}
              className="w-[200px] px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">Todos los temas</option>
              {temas.map((tema) => (
                <option key={tema} value={tema}>
                  {tema}
                </option>
              ))}
            </select>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Capacitaciones ({filteredCapacitaciones.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : filteredCapacitaciones.length === 0 ? (
            <EmptyState
              title="No hay capacitaciones"
              description="Comienza agregando tu primera capacitación o importando desde CSV"
            />
          ) : (
            <DataTable
              data={filteredCapacitaciones as unknown as Record<string, unknown>[]}
              columns={columns as unknown as Column<Record<string, unknown>>[]}
              keyField="id"
              emptyMessage="No se encontraron capacitaciones"
            />
          )}
        </CardContent>
      </Card>

      {/* Modal de creación/edición */}
      {(showCreateModal || editingCapacitacion) && (
        <CapacitacionForm
          capacitacion={editingCapacitacion ? editingCapacitacion : undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCapacitacion(null);
          }}
          onSubmit={editingCapacitacion
            ? (data) => handleUpdate(editingCapacitacion.id, data)
            : handleCreate
          }
        />
      )}

      {/* Modal de importación CSV */}
      {showImportModal && (
        <ImportCSVModal
          onClose={() => setShowImportModal(false)}
          onSuccess={async () => {
            await invalidateCache();
            setShowImportModal(false);
            setToast({
              show: true,
              title: 'Importación exitosa',
              description: 'Las capacitaciones se han importado correctamente.',
              variant: 'success'
            });
          }}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog.open && (
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          {...(confirmDialog.description ? { description: confirmDialog.description } : {})}
          {...(confirmDialog.variant ? { variant: confirmDialog.variant } : {})}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmDialog({ open: false, title: '', onConfirm: () => {} });
            }
          }}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog({ open: false, title: '', onConfirm: () => {} });
          }}
        />
      )}

      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 z-50">
          <Alert variant={toast.variant === 'error' ? 'error' : 'success'}>
            <Text weight="medium">{toast.title}</Text>
            {toast.description && (
              <Text size="sm" className="mt-1">{toast.description}</Text>
            )}
          </Alert>
        </div>
      )}
    </>
  );
}

