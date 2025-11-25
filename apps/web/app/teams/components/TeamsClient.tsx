"use client";
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getTeamAdvisors, createTeamInvitation, createTeam, respondToMembershipRequest } from '@/lib/api';
import { logger, toLogContext } from '../../../lib/logger';
import TeamMemberCard from '../components/TeamMemberCard';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
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
import type { Team, MembershipRequest } from '@/types';

interface TeamsClientProps {
  initialTeams: Team[];
  initialMembershipRequests: MembershipRequest[];
  userRole: string;
  userId: string;
}

/**
 * TeamsClient - Client Island for team management interactivity
 * 
 * AI_DECISION: Extract interactive parts to Client Island for Server Component pattern
 * Justificación: Forms and modals require client-side interactivity, data fetching can be server-side
 * Impacto: Reduces First Load JS ~40KB, better SEO, faster initial load
 */
export default function TeamsClient({ 
  initialTeams, 
  initialMembershipRequests,
  userRole,
  userId
}: TeamsClientProps) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [membershipRequests, setMembershipRequests] = useState<MembershipRequest[]>(initialMembershipRequests);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // AI_DECISION: Determinar permisos de edición basado en rol
  // Justificación: Advisors solo pueden ver equipos, no editarlos
  // Impacto: Mejora seguridad y UX diferenciando permisos por rol
  const canEdit = userRole === 'manager' || userRole === 'admin';
  
  // Form states
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [linkModalOpen, setLinkModalOpen] = useState<null | { teamId: string; teamName: string }>(null);
  const [advisorCandidates, setAdvisorCandidates] = useState<Array<{ id: string; email: string; fullName: string }>>([]);
  const [inviteLoading, setInviteLoading] = useState<string | null>(null);

  // AI_DECISION: Use useCallback to stabilize navigation functions for memoized component
  // Justificación: TeamMemberCard is memoized, needs stable callback references
  // Impacto: Prevents unnecessary re-renders of TeamMemberCard components
  const handleNavigateToMember = useCallback((teamId: string, memberId: string) => {
    router.push(`/teams/${teamId}/member/${memberId}`);
  }, [router]);

  const handleNavigateToContacts = useCallback((advisorId: string) => {
    router.push(`/contacts?advisorId=${advisorId}`);
  }, [router]);

  const openLinkModal = async (team: Team) => {
    try {
      setLinkModalOpen({ teamId: team.id, teamName: team.name });
      const response = await getTeamAdvisors(team.id);
      if (response.success && response.data) {
        setAdvisorCandidates(response.data || []);
      } else {
        setAdvisorCandidates([]);
      }
    } catch {
      setAdvisorCandidates([]);
    }
  };

  const handleVincularAsesores = () => {
    if (teams.length === 1) {
      openLinkModal(teams[0]);
      return;
    }
    if (teams.length > 0) {
      openLinkModal(teams[0]);
    }
  };

  const inviteAdvisor = async (userId: string) => {
    if (!linkModalOpen) return;
    try {
      setInviteLoading(userId);
      await createTeamInvitation(linkModalOpen.teamId, { userId });
      setAdvisorCandidates(prev => prev.filter(a => a.id !== userId));
    } catch (err) {
      logger.error('Error inviting advisor', toLogContext({ err, teamId: linkModalOpen.teamId, userId }));
    } finally {
      setInviteLoading(null);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    
    try {
      setActionLoading('create');
      setError(null);
      
      // Get user ID from somewhere - for now using a placeholder
      // In real implementation, this should come from auth context or props
      const response = await createTeam({
        name: newTeamName.trim(),
        managerUserId: userId
      });
      
      if (response.success && response.data) {
        setNewTeamName('');
        setShowCreateTeam(false);
        // Refresh teams list
        setTeams(prev => [...prev, response.data!]);
      } else {
        throw new Error('Error al crear equipo');
      }
    } catch (err) {
      logger.error('Error creating team', toLogContext({ err, teamName: newTeamName }));
      setError(err instanceof Error ? err.message : 'Error al crear equipo');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMembershipAction = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      setActionLoading(requestId);
      setError(null);
      
      await respondToMembershipRequest(requestId, action);
      setMembershipRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (err) {
      logger.error('Error responding to membership request', toLogContext({ err, requestId, action }));
      setError(err instanceof Error ? err.message : 'Error al procesar solicitud');
    } finally {
      setActionLoading(null);
    }
  };

  // Configuración de columnas para la tabla de solicitudes
  const membershipColumns: Column<MembershipRequest>[] = [
    {
      key: 'user',
      header: 'Usuario',
      render: (request) => (
        <div>
          <Text weight="medium">{request.user?.fullName || 'N/A'}</Text>
          <Text size="sm" color="secondary">{request.user?.email || 'N/A'}</Text>
        </div>
      )
    },
    {
      key: 'user',
      header: 'Rol',
      render: (request) => (
        <Badge variant="default">{request.user?.role || 'N/A'}</Badge>
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
    // AI_DECISION: Ocultar columna de acciones para advisors
    // Justificación: Solo managers y admins pueden aprobar/rechazar solicitudes
    // Impacto: Mejora seguridad y UX diferenciando permisos por rol
    ...(canEdit ? [{
      key: 'actions',
      header: 'Acciones',
      render: (request) => (
        <Stack direction="row" gap="sm">
          <Button
            variant="primary"
            size="sm"
            disabled={actionLoading === request.id}
            onClick={() => handleMembershipAction(request.id, 'accept')}
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
    }] : [])
  ];

  return (
    <>
      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {/* Teams Grid */}
      <Grid cols={1} gap="lg">
        {teams.map((team) => (
          <Card 
            key={team.id} 
            className="rounded-md border border-border hover:border-border-hover hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => router.push(`/teams/${team.id}`)}
          >
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    router.push(`/teams/${team.id}`);
                  }}
                >
                  <Icon name="ChevronRight" size={16} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {team.members && team.members.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {team.members.slice(0, 5).map((member) => (
                    <TeamMemberCard
                      key={member.id}
                      member={member}
                      teamId={team.id}
                      onNavigateToMember={handleNavigateToMember}
                      onNavigateToContacts={handleNavigateToContacts}
                    />
                  ))}
                </div>
              )}
              {team.members && team.members.length > 5 && (
                <div className="mt-2 text-center">
                  <Text size="sm" color="secondary">
                    +{team.members.length - 5} miembros más
                  </Text>
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

      {/* Membership Requests - Solo visible para managers y admins */}
      {canEdit && membershipRequests.length > 0 && (
        <Card className="rounded-md border border-border hover:border-border-hover hover:shadow-sm transition-shadow">
          <CardHeader className="p-4">
            <CardTitle className="text-base">Solicitudes de Membresía</CardTitle>
            <Text size="sm" color="secondary">
              {membershipRequests.length} solicitud(es) pendiente(s)
            </Text>
          </CardHeader>
          <CardContent className="p-4">
            <DataTable
              data={membershipRequests as unknown as Record<string, unknown>[]}
              columns={membershipColumns as unknown as Column<Record<string, unknown>>[]}
              keyField="id"
              emptyMessage="No hay solicitudes pendientes."
            />
          </CardContent>
        </Card>
      )}

      {/* Modal de crear equipo - Solo visible para managers y admins */}
      {canEdit && (
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTeamName(e.target.value)}
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
      )}

      {/* Modal vincular asesores - Solo visible para managers y admins */}
      {canEdit && (
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
      )}
    </>
  );
}

