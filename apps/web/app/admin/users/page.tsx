'use client';
import { useRequireAuth } from '@/auth/useRequireAuth';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  updateUserRole,
  updateUserStatus,
  deleteUser as deleteUserApi,
  approveUser,
  rejectUser,
} from '@/lib/api';
import { useUsers } from '@/lib/api-hooks';
import { logger, toLogContext } from '@/lib/logger';
import type { UserRole, UserApiResponse } from '@/types';
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
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Alert,
  Badge,
  Switch,
  Spinner,
  Icon,
  Pagination,
  type Column,
} from '@maatwork/ui';

export default function AdminUsersPage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserApiResponse | null>(null);

  // Calculate offset for pagination
  const offset = (page - 1) * limit;

  // Fetch users with SWR and pagination
  const {
    users = [],
    pagination,
    total,
    isLoading: dataLoading,
    error: fetchError,
    mutate,
  } = useUsers({
    limit,
    offset,
    ...(showPendingOnly ? { isActive: false } : {}),
  });

  // Local error state for action errors
  const [error, setError] = useState<string | null>(null);

  // Extract error message from SWR error
  const displayError = fetchError
    ? fetchError instanceof Error
      ? fetchError.message
      : 'Error al cargar usuarios'
    : error;

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!user) return;

    // Validar que el rol sea válido
    if (!['advisor', 'manager', 'admin', 'owner', 'staff'].includes(newRole)) {
      setError('Rol no válido');
      return;
    }

    try {
      setActionLoading(userId);
      setError(null);

      await updateUserRole(userId, newRole as UserRole);

      // Invalidate cache to refetch users
      await mutate();
    } catch (err) {
      logger.error(
        'Error updating user role',
        toLogContext({ err: err instanceof Error ? err.message : String(err), userId, newRole })
      );
      setError(err instanceof Error ? err.message : 'Error al actualizar rol');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    if (!user) return;

    try {
      setActionLoading(userId);
      setError(null);

      await updateUserStatus(userId, isActive);

      // Invalidate cache to refetch users
      await mutate();
    } catch (err) {
      logger.error(
        'Error updating user status',
        toLogContext({ err: err instanceof Error ? err.message : String(err), userId, isActive })
      );
      setError(err instanceof Error ? err.message : 'Error al actualizar estado');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !user) return;

    try {
      setActionLoading(userToDelete.id);
      setError(null);

      await deleteUserApi(userToDelete.id);

      // Invalidate cache to refetch users
      await mutate();
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario');
    } finally {
      setActionLoading(null);
    }
  };

  // AI_DECISION: Mover useMemo de columns ANTES de los early returns
  // Justificación: React requiere que los hooks se ejecuten en el mismo orden en cada renderizado
  // Impacto: Evita error "Rendered more hooks than during the previous render"
  // Configuración de columnas del DataTable
  const columns: Column<UserApiResponse>[] = useMemo(
    () => [
      {
        key: 'fullName',
        header: 'Usuario',
        render: (row) => (
          <div>
            <div className="flex items-center gap-2">
              <Text weight="medium">{row.fullName}</Text>
              {!row.isActive && <Badge variant="warning">Pendiente</Badge>}
            </div>
            <Text size="sm" color="secondary">
              {row.email}
            </Text>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Rol',
        render: (row) => (
          <div className="min-w-[150px]">
            <Select
              value={row.role}
              onValueChange={(value) => handleRoleChange(row.id, value)}
              disabled={actionLoading === row.id}
              items={[
                { value: 'advisor', label: 'Asesor' },
                { value: 'manager', label: 'Manager' },
                { value: 'staff', label: 'Administrativo' },
                { value: 'owner', label: 'Dirección' },
                { value: 'admin', label: 'Administrador' },
              ]}
            />
          </div>
        ),
      },
      {
        key: 'isActive',
        header: 'Activo',
        render: (row) => (
          <Switch
            checked={row.isActive}
            onCheckedChange={(checked) => handleToggleActive(row.id, checked)}
            disabled={actionLoading === row.id}
          />
        ),
      },
      {
        key: 'date',
        header: 'Fecha',
        render: () => (
          <Text size="sm" color="secondary">
            N/A
          </Text>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        render: (row) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/profile?userId=${row.id}`)}
            >
              <Icon name="User" size={16} />
            </Button>
            {!row.isActive && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      setActionLoading(row.id);
                      setError(null);
                      await approveUser(row.id);
                      // Invalidate cache to refetch users
                      await mutate();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Error al aprobar usuario');
                    } finally {
                      setActionLoading(null);
                    }
                  }}
                  disabled={actionLoading === row.id}
                >
                  Aprobar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      setActionLoading(row.id);
                      setError(null);
                      await rejectUser(row.id);
                      // Invalidate cache to refetch users
                      await mutate();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Error al rechazar usuario');
                    } finally {
                      setActionLoading(null);
                    }
                  }}
                  disabled={actionLoading === row.id}
                >
                  Rechazar
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUserToDelete(row);
                setShowDeleteModal(true);
              }}
            >
              <Icon name="trash-2" size={16} />
            </Button>
          </div>
        ),
      },
    ],
    [actionLoading, router, mutate]
  );

  // Early return for loading - DESPUÉS de todos los hooks
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
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/home"
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              ← Volver al inicio
            </Link>
            <Heading level={1}>Administración de Usuarios</Heading>
          </div>
          <Button onClick={() => router.push('/register')}>
            <Icon name="plus" size={16} className="mr-2" />
            Crear Usuario
          </Button>
        </div>

        {displayError && (
          <Alert variant="error" title="Error">
            {displayError}
          </Alert>
        )}

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div />
              <div className="flex items-center gap-2">
                <Text size="sm">Solo pendientes</Text>
                <Switch 
                  checked={showPendingOnly} 
                  onCheckedChange={(checked) => {
                    setShowPendingOnly(checked);
                    setPage(1); // Reset to first page when filter changes
                  }} 
                />
              </div>
            </div>
            
            <DataTable<UserApiResponse & Record<string, unknown>>
              data={users as (UserApiResponse & Record<string, unknown>)[]}
              columns={columns as Column<UserApiResponse & Record<string, unknown>>[]}
              keyField="id"
              emptyMessage="No hay usuarios registrados."
              loading={dataLoading}
            />

            <div className="mt-4 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={pagination?.totalPages || 1}
                onPageChange={setPage}
              />
            </div>
          </CardContent>
        </Card>

        {/* Modal de confirmación de eliminación */}
        <Modal open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <ModalHeader>
            <ModalTitle>Confirmar eliminación</ModalTitle>
            <ModalDescription>
              ¿Estás seguro de que quieres eliminar el usuario &quot;{userToDelete?.fullName}&quot;?
              Esta acción no se puede deshacer y eliminará todos los datos asociados.
            </ModalDescription>
          </ModalHeader>
          <ModalContent>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteUser}
                disabled={actionLoading === userToDelete?.id}
              >
                Eliminar usuario
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Stack>
    </div>
  );
}
