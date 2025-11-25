"use client";
import { useRequireAuth } from '../../auth/useRequireAuth';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUsers, updateUserRole, updateUserStatus, deleteUser as deleteUserApi, approveUser, rejectUser } from '@/lib/api';
import { logger } from '../../../lib/logger';
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
  type Column,
} from '@cactus/ui';

export default function AdminUsersPage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserApiResponse[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserApiResponse | null>(null);

  // Fetch users (must be declared before any early return to keep hooks order)
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setDataLoading(true);
      setError(null);
      
      const response = await getUsers();

      if (response.success && response.data) {
        setUsers(response.data || []);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      logger.error('Error fetching users', { err: err instanceof Error ? err.message : String(err) });
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setDataLoading(false);
    }
  };
  // Early return for loading
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
    router.push('/');
    return null;
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!user) return;
    
    // Validar que el rol sea válido
    if (!['advisor', 'manager', 'admin'].includes(newRole)) {
      setError('Rol no válido');
      return;
    }
    
    try {
      setActionLoading(userId);
      setError(null);
      
      await updateUserRole(userId, newRole as UserRole);

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole as UserRole } : user
      ));
    } catch (err) {
      logger.error('Error updating user role', { err: err instanceof Error ? err.message : String(err), userId, newRole });
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

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isActive } : user
      ));
    } catch (err) {
      logger.error('Error updating user status', { err: err instanceof Error ? err.message : String(err), userId, isActive });
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

      setUsers(prev => prev.filter(user => user.id !== userToDelete.id));
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario');
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'warning';
      case 'advisor': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Manager';
      case 'advisor': return 'Asesor';
      default: return role;
    }
  };

  // Configuración de columnas del DataTable
  const columns: Column<UserApiResponse>[] = useMemo(() => ([
    {
      key: 'fullName',
      header: 'Usuario',
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <Text weight="medium">{row.fullName}</Text>
            {!row.isActive && <Badge variant="warning">Pendiente</Badge>}
          </div>
          <Text size="sm" color="secondary">{row.email}</Text>
        </div>
      )
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
              { value: 'admin', label: 'Administrador' }
            ]}
          />
        </div>
      )
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
      )
    },
    {
      key: 'date',
      header: 'Fecha',
      render: () => (
        <Text size="sm" color="secondary">
          N/A
        </Text>
      )
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
                    setUsers(prev => prev.map(u => u.id === row.id ? { ...u, isActive: true } : u));
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
                    setUsers(prev => prev.filter(u => u.id !== row.id));
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
      )
    }
  ]), [actionLoading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <Stack direction="column" gap="lg">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
              ← Volver al inicio
            </Link>
            <Heading level={1}>Administración de Usuarios</Heading>
          </div>
          <Button onClick={() => router.push('/register')}>
            <Icon name="plus" size={16} className="mr-2" />
            Crear Usuario
          </Button>
        </div>

        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Usuarios ({users.length})
            </CardTitle>
          </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div />
                <div className="flex items-center gap-2">
                  <Text size="sm">Solo pendientes</Text>
                  <Switch checked={showPendingOnly} onCheckedChange={setShowPendingOnly} />
                </div>
              </div>
            <DataTable<UserApiResponse & Record<string, unknown>>
              data={(showPendingOnly ? users.filter(u => !u.isActive) : users) as (UserApiResponse & Record<string, unknown>)[]}
              columns={columns as Column<UserApiResponse & Record<string, unknown>>[]}
              keyField="id"
              emptyMessage="No hay usuarios registrados."
            />
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
              <Button 
                variant="secondary" 
                onClick={() => setShowDeleteModal(false)}
              >
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