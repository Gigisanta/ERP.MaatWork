'use client';

import React, { useState, useEffect } from 'react';
import { useRequireAuth } from '../auth/useRequireAuth';
import { getCurrentUser, getTeams, getAllTeamMembers, getPendingInvitations, respondToInvitation, createTeam, inviteTeamMember, removeTeamMember, changePassword } from '@/lib/api';
import { logger } from '../../lib/logger';
import { useRouter } from 'next/navigation';
import type { UserApiResponse as User, Team, TeamMember, TeamInvitation } from '@/types';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Heading, 
  Text, 
  Stack, 
  Grid,
  Button, 
  Alert,
  Input,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  DataTable,
  type Column,
  Badge,
  Switch,
  Toast
} from '@cactus/ui';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ProfilePage() {
  const { user, token, loading } = useRequireAuth();
  const router = useRouter();
  
  // Estados para la información del usuario
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para formularios
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  
  // Estados para Toast
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

  // Estados para ConfirmDialog
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

  const showToast = (title: string, description?: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ show: true, title, description, variant });
  };
  
  // Estados de formularios
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [teamForm, setTeamForm] = useState({
    name: ''
  });

  const [memberForm, setMemberForm] = useState<{
    email: string;
    teamId?: string;
  }>({
    email: ''
  });

  // Estados de loading para acciones
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Cargar información del usuario
  useEffect(() => {
    if (token) {
      fetchUserInfo();
    }
  }, [token]);

  const fetchUserInfo = async () => {
    try {
      setDataLoading(true);
      
      // Fetch user info
      const userResponse = await getCurrentUser();
      if (userResponse.success && userResponse.data) {
        setUserInfo(userResponse.data);
      }

      // Fetch teams if user is manager or admin
      if (user?.role === 'manager' || user?.role === 'admin') {
        const teamsResponse = await getTeams();
        if (teamsResponse.success && teamsResponse.data) {
          setTeams(teamsResponse.data || []);
          
          // Fetch team members
          const membersResponse = await getAllTeamMembers();
          if (membersResponse.success && membersResponse.data) {
            setTeamMembers(membersResponse.data || []);
          }
        }
      }

      // Fetch pending team invitations for current user
      const invitationsResponse = await getPendingInvitations();
      if (invitationsResponse.success && invitationsResponse.data) {
        setInvitations(invitationsResponse.data || []);
      }
    } catch (err) {
      logger.error('Error fetching user info', { err });
      setError('Error al cargar la información del usuario');
    } finally {
      setDataLoading(false);
    }
  };

  const handleInvitation = async (id: string, action: 'accept' | 'reject') => {
    try {
      setActionLoading(`inv-${id}`);
      setError(null);
      await respondToInvitation(id, action);
      setInvitations(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      logger.error('Error responding to invitation', { err, invitationId: id, action });
      setError(err instanceof Error ? err.message : 'Error al procesar invitación');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setActionLoading('password');
      setError(null);

      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      showToast('Contraseña cambiada exitosamente', undefined, 'success');
    } catch (err) {
      logger.error('Error changing password', { err });
      setError(err instanceof Error ? err.message : 'Error al cambiar contraseña');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamForm.name.trim()) {
      setError('El nombre del equipo es requerido');
      return;
    }

    try {
      setActionLoading('team');
      setError(null);

      if (!user) throw new Error('Usuario no autenticado');
      
      await createTeam({
        name: teamForm.name.trim(),
        managerUserId: user.id
      });

      setTeamForm({ name: '' });
      setShowTeamForm(false);
      fetchUserInfo(); // Reload data
      showToast('Equipo creado exitosamente', undefined, 'success');
    } catch (err) {
      logger.error('Error creating team', { err, teamForm });
      setError(err instanceof Error ? err.message : 'Error al crear equipo');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddMember = async () => {
    if (!memberForm.email.trim()) {
      setError('El email es requerido');
      return;
    }

    try {
      setActionLoading('member');
      setError(null);

      if (!memberForm.teamId) throw new Error('Equipo requerido');
      
      await inviteTeamMember({
        teamId: memberForm.teamId,
        email: memberForm.email.trim()
      });

      setMemberForm({ email: '' });
      setShowAddMemberForm(false);
      fetchUserInfo(); // Reload data
      showToast('Invitación enviada exitosamente', undefined, 'success');
    } catch (err) {
      logger.error('Error inviting member', { err, memberForm });
      setError(err instanceof Error ? err.message : 'Error al invitar miembro');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveTeam = (teamId: string) => {
    if (!token || !user) return;
    
    setConfirmDialog({
      open: true,
      title: 'Abandonar equipo',
      description: '¿Seguro que deseas abandonar este equipo?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setActionLoading(`leave-${teamId}`);
          if (!user) throw new Error('Usuario no autenticado');
          
          await removeTeamMember(teamId, user.id);
          await fetchUserInfo();
          showToast('Has abandonado el equipo', undefined, 'success');
        } catch (err) {
          logger.error('Error leaving team', { err, teamId, userId: user?.id });
          setError(err instanceof Error ? err.message : 'Error al abandonar equipo');
          showToast('Error al abandonar equipo', err instanceof Error ? err.message : 'Error desconocido', 'error');
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  // Columnas para la tabla de miembros
  const memberColumns: Column<TeamMember>[] = [
    {
      key: 'fullName',
      header: 'Nombre',
      sortable: true,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
    },
    {
      key: 'role',
      header: 'Rol',
      render: (member) => (
        <Badge variant={member.role === 'lead' ? 'brand' : 'default'}>
          {member.role}
        </Badge>
      ),
    },
    {
      key: 'user',
      header: 'Estado',
      render: (member) => (
        <Switch
          checked={member.user?.role !== undefined}
          disabled={true}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Text>Cargando información del perfil...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Stack direction="column" gap="lg">
        <div>
          <Heading level={1}>Mi Perfil</Heading>
          <Text color="secondary">
            Gestiona tu información personal y equipos
          </Text>
        </div>

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        <Grid cols={1} gap="lg">
          {/* Información del Usuario */}
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent>
              <Stack direction="column" gap="md">
                <div>
                  <Text weight="medium" size="sm">Nombre completo</Text>
                  <Text>{userInfo?.fullName || 'No disponible'}</Text>
                </div>
                <div>
                  <Text weight="medium" size="sm">Email</Text>
                  <Text>{userInfo?.email || 'No disponible'}</Text>
                </div>
                <div>
                  <Text weight="medium" size="sm">Rol</Text>
                  <Badge variant={userInfo?.role === 'admin' ? 'brand' : 'default'}>
                    {userInfo?.role || 'No disponible'}
                  </Badge>
                </div>
                <div>
                  <Text weight="medium" size="sm">Estado</Text>
                  <Badge variant={userInfo?.isActive ? 'success' : 'error'}>
                    {userInfo?.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordForm(true)}
                  className="w-fit"
                >
                  Cambiar Contraseña
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Equipos */}
          {(user?.role === 'manager' || user?.role === 'admin' || teams.length > 0) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mis Equipos</CardTitle>
                  {(user?.role === 'manager' || user?.role === 'admin') && teams.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTeamForm(true)}
                    >
                      Crear Equipo
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Stack direction="column" gap="md">
                  {teams.length === 0 ? (
                    <Text color="secondary">No tienes equipos asignados</Text>
                  ) : (
                    teams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <Text weight="medium">{team.name}</Text>
                          <Text size="sm" color="secondary">
                            Rol: {team.role}
                          </Text>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={team.role === 'manager' ? 'brand' : 'default'}>
                            {team.role}
                          </Badge>
                          {team.role !== 'manager' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading === `leave-${team.id}`}
                              onClick={() => handleLeaveTeam(team.id)}
                            >
                              Abandonar equipo
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Invitaciones a equipos */}
          {invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Invitaciones a equipos</CardTitle>
              </CardHeader>
              <CardContent>
                <Stack direction="column" gap="sm">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Text weight="medium">Invitación de {inv.team?.name || 'Equipo'}</Text>
                        <Text size="sm" color="secondary">{new Date(inv.createdAt).toLocaleString('es-ES')}</Text>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={actionLoading === `inv-${inv.id}`} onClick={() => handleInvitation(inv.id, 'accept')}>Aceptar</Button>
                        <Button size="sm" variant="outline" disabled={actionLoading === `inv-${inv.id}`} onClick={() => handleInvitation(inv.id, 'reject')}>Rechazar</Button>
                      </div>
                    </div>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Tabla de Miembros (solo para managers/admin) */}
        {(user?.role === 'manager' || user?.role === 'admin') && teamMembers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Miembros del Equipo</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMemberForm(true)}
                >
                  Agregar Miembro
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={teamMembers}
                columns={memberColumns}
                keyField="id"
              />
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Modal Cambiar Contraseña */}
      <Modal
        open={showPasswordForm}
        onOpenChange={setShowPasswordForm}
        title="Cambiar Contraseña"
      >
        <Stack direction="column" gap="md">
          <Input
            label="Contraseña actual"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
            required
          />
          <Input
            label="Nueva contraseña"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
            required
            minLength={6}
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
            required
            minLength={6}
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handlePasswordChange}
              disabled={actionLoading === 'password'}
            >
              Cambiar Contraseña
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPasswordForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </Stack>
      </Modal>

      {/* Modal Crear Equipo */}
      <Modal
        open={showTeamForm}
        onOpenChange={setShowTeamForm}
        title="Crear Nuevo Equipo"
      >
        <Stack direction="column" gap="md">
          <Input
            label="Nombre del equipo"
            value={teamForm.name}
            onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nombre del equipo"
            required
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleCreateTeam}
              disabled={actionLoading === 'team'}
            >
              Crear Equipo
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTeamForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </Stack>
      </Modal>

      {/* Modal Agregar Miembro */}
      <Modal
        open={showAddMemberForm}
        onOpenChange={setShowAddMemberForm}
        title="Agregar Miembro al Equipo"
      >
        <Stack direction="column" gap="md">
          <Input
            label="Email del miembro"
            type="email"
            value={memberForm.email}
            onChange={(e) => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
            placeholder="miembro@email.com"
            required
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleAddMember}
              disabled={actionLoading === 'member'}
            >
              Enviar Invitación
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddMemberForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </Stack>
      </Modal>

      {/* Toast Notifications */}
      <Toast
        title={toast.title}
        {...(toast.description && { description: toast.description })}
        variant={toast.variant}
        open={toast.show}
        onOpenChange={(open) => setToast(prev => ({ ...prev, show: open }))}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant || 'default'}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
      />
    </div>
  );
}