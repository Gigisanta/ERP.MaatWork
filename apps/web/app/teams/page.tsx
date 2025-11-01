"use client";
import { useRequireAuth } from '../auth/useRequireAuth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Heading,
  Text,
  Stack,
  Grid,
  Input,
  DataTable,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Alert,
  Badge,
  Spinner,
  Icon,
  type Column,
} from '@cactus/ui';

interface Team {
  id: string;
  name: string;
  managerUserId: string;
  createdAt: string;
  members?: TeamMember[];
}

interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface MembershipRequest {
  id: string;
  userId: string;
  managerId: string;
  status: string;
  createdAt: string;
  userEmail: string;
  userFullName: string;
  userRole: string;
}

export default function TeamsPage() {
  const { user, token, loading } = useRequireAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [membershipRequests, setMembershipRequests] = useState<MembershipRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Form states
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [linkModalOpen, setLinkModalOpen] = useState<null | { teamId: string; teamName: string }>(null);
  const [advisorCandidates, setAdvisorCandidates] = useState<Array<{ id: string; email: string; fullName: string }>>([]);
  const [inviteLoading, setInviteLoading] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Redirect if not manager or admin
  useEffect(() => {
    if (user && !['manager', 'admin'].includes(user.role)) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (!user || !token) {
      router.push('/login');
      return;
    }
    
    if (['manager', 'admin'].includes(user.role)) {
      fetchData();
    }
  }, [user, token, router]);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      setError(null);
      
      await Promise.all([
        fetchTeams(),
        fetchMembershipRequests()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setDataLoading(false);
    }
  };

  const openLinkModal = async (team: Team) => {
    if (!token) return;
    try {
      setLinkModalOpen({ teamId: team.id, teamName: team.name });
      const response = await fetch(`${apiUrl}/teams/${team.id}/advisors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAdvisorCandidates(data.data || []);
      } else {
        setAdvisorCandidates([]);
      }
    } catch {
      setAdvisorCandidates([]);
    }
  };

  const handleVincularAsesores = () => {
    // Si hay un solo equipo, abrir directamente
    if (teams.length === 1) {
      openLinkModal(teams[0]);
      return;
    }
    // Si hay varios equipos, abrir modal de selección primero
    // Por ahora, si hay equipos disponibles, abrir el primero o mostrar selector
    // Simplificado: abrir modal para el primer equipo (el usuario puede cambiar desde ahí)
    if (teams.length > 0) {
      openLinkModal(teams[0]);
    }
  };

  const inviteAdvisor = async (userId: string) => {
    if (!token || !linkModalOpen) return;
    try {
      setInviteLoading(userId);
      const response = await fetch(`${apiUrl}/teams/${linkModalOpen.teamId}/invitations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      if (response.ok) {
        // Optimistic feedback: remove invited advisor from list
        setAdvisorCandidates(prev => prev.filter(a => a.id !== userId));
      }
    } finally {
      setInviteLoading(null);
    }
  };

  const fetchTeams = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${apiUrl}/teams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeams(data.data || []);
      } else {
        throw new Error('Error al cargar equipos');
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      throw err;
    }
  };

  const fetchMembershipRequests = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${apiUrl}/teams/membership-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMembershipRequests(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching membership requests:', err);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !token) return;
    
    try {
      setActionLoading('create');
      setError(null);
      
      const response = await fetch(`${apiUrl}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newTeamName.trim() })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeams(prev => [...prev, data.data]);
        setNewTeamName('');
        setShowCreateTeam(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear equipo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear equipo');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMembershipAction = async (requestId: string, action: 'approve' | 'reject') => {
    if (!token) return;
    
    try {
      setActionLoading(requestId);
      setError(null);
      
      const response = await fetch(`${apiUrl}/teams/membership-requests/${requestId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setMembershipRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} solicitud`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar solicitud');
    } finally {
      setActionLoading(null);
    }
  };

  // Configuración de columnas para la tabla de solicitudes
  const membershipColumns: Column<MembershipRequest>[] = [
    {
      key: 'userFullName',
      header: 'Usuario',
      render: (request) => (
        <div>
          <Text weight="medium">{request.userFullName}</Text>
          <Text size="sm" color="secondary">{request.userEmail}</Text>
        </div>
      )
    },
    {
      key: 'userRole',
      header: 'Rol',
      render: (request) => (
        <Badge variant="default">{request.userRole}</Badge>
      )
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (request) => (
        <Text size="sm">
          {new Date(request.createdAt).toLocaleDateString('es-ES')}
        </Text>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (request) => (
        <Stack direction="row" gap="sm">
          <Button
            variant="primary"
            size="sm"
            disabled={actionLoading === request.id}
            onClick={() => handleMembershipAction(request.id, 'approve')}
          >
            Aprobar
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading === request.id}
            onClick={() => handleMembershipAction(request.id, 'reject')}
          >
            Rechazar
          </Button>
        </Stack>
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

  if (dataLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <Stack direction="column" gap="lg">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Heading level={3}>Equipos</Heading>
          <div className="flex items-center gap-2">
            {(['manager','admin'].includes(user?.role || '') && teams.length > 0) && (
              <Button variant="primary" onClick={handleVincularAsesores}>
                <Icon name="Users" size={16} className="mr-2" />
                Vincular asesores
              </Button>
            )}
            {(['manager','admin'].includes(user?.role || '') && teams.length === 0) && (
              <Button onClick={() => setShowCreateTeam(true)}>
                <Icon name="plus" size={16} className="mr-2" />
                Crear Equipo
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Teams Grid */}
        <Grid cols={1} gap="lg">
          {teams.map((team) => (
            <Card key={team.id} className="rounded-md border border-border hover:border-border-hover hover:shadow-sm transition-shadow">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base mb-1">{team.name}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Text size="xs" color="secondary">
                        Creado el {new Date(team.createdAt).toLocaleDateString('es-ES')}
                      </Text>
                      <span className="text-text-secondary">•</span>
                      <Text size="xs" color="secondary" weight="medium">
                        {team.members?.length || 0} miembros
                      </Text>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {team.members && team.members.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {team.members.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-md border border-border hover:border-border-hover hover:bg-surface-hover transition-all cursor-pointer p-2.5 bg-surface"
                        onClick={() => router.push(`/teams/${team.id}/member/${member.id}`)}
                      >
                        <div className="flex items-start gap-2 mb-1.5">
                          <Text weight="medium" className="text-sm truncate flex-1 min-w-0">
                            {member.fullName || member.email}
                          </Text>
                          <Badge variant="default" className="text-xs px-1.5 py-0.5 leading-tight flex-shrink-0 mt-0.5">
                            {member.role}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Text size="xs" color="secondary" className="truncate flex-1 min-w-0">
                            {member.email}
                          </Text>
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-shrink-0 px-2 py-1 h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/contacts?advisorId=${member.id}`);
                            }}
                          >
                            CRM
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </Grid>

        {/* Empty state */}
        {teams.length === 0 && (
          <Card className="rounded-md border border-border hover:border-border-hover hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="text-center py-8">
                <Text weight="medium" className="mb-2">No hay equipos creados</Text>
                <Text color="secondary">Crea tu primer equipo para comenzar a organizar a tu equipo de trabajo.</Text>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Membership Requests */}
        {membershipRequests.length > 0 && (
          <Card className="rounded-md border border-border hover:border-border-hover hover:shadow-sm transition-shadow">
            <CardHeader className="p-4">
              <CardTitle className="text-base">Solicitudes de Membresía</CardTitle>
              <Text size="sm" color="secondary">
                {membershipRequests.length} solicitud(es) pendiente(s)
              </Text>
            </CardHeader>
            <CardContent className="p-4">
              <DataTable
                data={membershipRequests}
                columns={membershipColumns}
                keyField="id"
                emptyMessage="No hay solicitudes pendientes."
              />
            </CardContent>
          </Card>
        )}

        {/* Modal de crear equipo */}
        <Modal open={showCreateTeam} onOpenChange={setShowCreateTeam}>
          <ModalHeader>
            <ModalTitle>Crear nuevo equipo</ModalTitle>
            <ModalDescription>
              Crea un nuevo equipo para organizar a tus colaboradores.
            </ModalDescription>
          </ModalHeader>
          <ModalContent>
            <form onSubmit={handleCreateTeam}>
              <Stack direction="column" gap="md">
                <Input
                  label="Nombre del equipo"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Ej: Equipo de Ventas Norte"
                  required
                />
                <ModalFooter>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setShowCreateTeam(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={actionLoading === 'create' || !newTeamName.trim()}
                  >
                    Crear equipo
                  </Button>
                </ModalFooter>
              </Stack>
            </form>
          </ModalContent>
        </Modal>

        {/* Modal vincular asesores */}
        <Modal open={!!linkModalOpen} onOpenChange={() => setLinkModalOpen(null)}>
          <ModalHeader>
            <ModalTitle>Vincular asesores {linkModalOpen ? `a ${linkModalOpen.teamName}` : ''}</ModalTitle>
            <ModalDescription>Selecciona asesores para enviar invitación al equipo.</ModalDescription>
          </ModalHeader>
          <ModalContent>
            <Stack direction="column" gap="sm">
              {advisorCandidates.length === 0 && (
                <Text color="secondary">No hay asesores disponibles para invitar.</Text>
              )}
              {advisorCandidates.map((a) => (
                <div key={a.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div>
                    <Text weight="medium">{a.fullName || a.email}</Text>
                    <Text size="sm" color="secondary">{a.email}</Text>
                  </div>
                  <Button size="sm" disabled={inviteLoading === a.id} onClick={() => inviteAdvisor(a.id)}>Invitar</Button>
                </div>
              ))}
            </Stack>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setLinkModalOpen(null)}>Cerrar</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Stack>
    </div>
  );
}