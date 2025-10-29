'use client';

import React, { useState, useEffect } from 'react';
import { useRequireAuth } from '../auth/useRequireAuth';
import { useRouter } from 'next/navigation';
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
  Switch
} from '@cactus/ui';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'advisor';
  isActive: boolean;
}

interface Team {
  id: string;
  name: string;
  role: 'member' | 'manager';
}

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function ProfilePage() {
  const { user, token, loading } = useRequireAuth();
  const router = useRouter();
  
  // Estados para la información del usuario
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para formularios
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  
  // Estados de formularios
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [teamForm, setTeamForm] = useState({
    name: ''
  });

  const [memberForm, setMemberForm] = useState({
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Fetch user info
      const userResponse = await fetch(`${apiUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserInfo(userData.data);
      }

      // Fetch teams if user is manager or admin
      if (user?.role === 'manager' || user?.role === 'admin') {
        const teamsResponse = await fetch(`${apiUrl}/teams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          setTeams(teamsData.data || []);
          
          // Fetch team members
          const membersResponse = await fetch(`${apiUrl}/teams/members`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (membersResponse.ok) {
            const membersData = await membersResponse.json();
            setTeamMembers(membersData.data || []);
          }
        }
      }
    } catch (err) {
      setError('Error al cargar la información del usuario');
      console.error('Error:', err);
    } finally {
      setDataLoading(false);
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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/users/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cambiar contraseña');
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      alert('Contraseña cambiada exitosamente');
    } catch (err) {
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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/teams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear equipo');
      }

      setTeamForm({ name: '' });
      setShowTeamForm(false);
      fetchUserInfo(); // Reload data
      alert('Equipo creado exitosamente');
    } catch (err) {
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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/teams/invite-member`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al invitar miembro');
      }

      setMemberForm({ email: '' });
      setShowAddMemberForm(false);
      fetchUserInfo(); // Reload data
      alert('Invitación enviada exitosamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al invitar miembro');
    } finally {
      setActionLoading(null);
    }
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
        <Badge variant={member.role === 'manager' ? 'brand' : 'default'}>
          {member.role}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (member) => (
        <Switch
          checked={member.isActive}
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
          {(user?.role === 'manager' || user?.role === 'admin') && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mis Equipos</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTeamForm(true)}
                  >
                    Crear Equipo
                  </Button>
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
                        <Badge variant={team.role === 'manager' ? 'brand' : 'default'}>
                          {team.role}
                        </Badge>
                      </div>
                    ))
                  )}
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
    </div>
  );
}