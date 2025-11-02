"use client";
import { useRequireAuth } from '../../auth/useRequireAuth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUsers, updateUserRole, updateUserStatus, deleteUser as deleteUserApi } from '@/lib/api';
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
  const { user, token, loading } = useRequireAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserApiResponse[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserApiResponse | null>(null);

  // Fetch users (must be declared before any early return to keep hooks order)
  useEffect(() => {
    if (user?.role === 'admin' && token) {
      fetchUsers();
    }
  }, [user, token]);

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
      logger.error('Error fetching users', { err });
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
    if (!token) return;
    
    // Validar que el rol sea válido (excluir 'client')
    if (newRole === 'client' || !['advisor', 'manager', 'admin'].includes(newRole)) {
      setError('Rol no válido');
      return;
    }
    
    try {
      setActionLoading(userId);
      setError(null);
      
      await updateUserRole(userId, newRole as Exclude<UserRole, 'client'>);

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole as Exclude<UserRole, 'client'> } : user
      ));
    } catch (err) {
      logger.error('Error updating user role', { err, userId, newRole });
      setError(err instanceof Error ? err.message : 'Error al actualizar rol');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    if (!token) return;

    try {
      setActionLoading(userId);
      setError(null);
      
      await updateUserStatus(userId, isActive);

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isActive } : user
      ));
    } catch (err) {
      logger.error('Error updating user status', { err, userId, isActive });
      setError(err instanceof Error ? err.message : 'Error al actualizar estado');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !token) return;
    
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
  const columns: Column<UserApiResponse>[] = [
    {
      key: 'fullName',
      header: 'Usuario',
      render: (user) => (
        <div>
          <Text weight="medium">{user.fullName}</Text>
          <Text size="sm" color="secondary">{user.email}</Text>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Rol',
      render: (user) => (
        <div className="min-w-[150px]">
          <Select
            value={user.role}
            onValueChange={(value) => handleRoleChange(user.id, value)}
            disabled={actionLoading === user.id || user.id === user.id}
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
      render: (user) => (
        <Switch
          checked={user.isActive}
          onCheckedChange={(checked) => handleToggleActive(user.id, checked)}
          disabled={actionLoading === user.id}
        />
      )
    },
    {
      key: 'actions',
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
      render: (user) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/profile?userId=${user.id}`)}
          >
            <Icon name="User" size={16} />
          </Button>
          {user.id !== user.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUserToDelete(user);
                setShowDeleteModal(true);
              }}
            >
              <Icon name="trash-2" size={16} />
            </Button>
          )}
        </div>
      )
    }
  ];

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
            <DataTable
              data={users}
              columns={columns}
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