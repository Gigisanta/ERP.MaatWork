'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  getTeamAdvisors,
  createTeamInvitation,
  createTeam,
  respondToMembershipRequest,
} from '@/lib/api';
import {
  getPersonalCalendars,
  connectTeamCalendar,
  type CalendarListEntry,
} from '@/lib/api/calendar';
import { logger, toLogContext } from '@/lib/logger';
import TeamMemberCard from './TeamMemberCard';
import CalendarConfigModal from './CalendarConfigModal';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
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
  Icon,
  type Column,
} from '@maatwork/ui';
import type { Team, MembershipRequest, TeamAdvisor } from '@/types';
// AI_DECISION: Import CalendarWidget statically
import CalendarWidget from '@/app/components/CalendarWidget';

interface TeamsClientProps {
  initialTeams: Team[];
  initialMembershipRequests: MembershipRequest[];
  userRole: string;
  userId: string;
  teamCalendarUrl: string | null;
  isGoogleConnected: boolean;
}

/**
 * TeamsClient - Client Island for team management interactivity
 */
function TeamsClient({
  initialTeams,
  initialMembershipRequests,
  userRole,
  userId,
  teamCalendarUrl: _initialCalendarUrl,
  isGoogleConnected,
}: TeamsClientProps) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [membershipRequests, setMembershipRequests] =
    useState<MembershipRequest[]>(initialMembershipRequests);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Page transition animation state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const canEdit = userRole === 'manager' || userRole === 'admin';

  // Form states
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [linkModalOpen, setLinkModalOpen] = useState<null | { teamId: string; teamName: string }>(
    null
  );
  const [advisorCandidates, setAdvisorCandidates] = useState<TeamAdvisor[]>([]);
  const [inviteLoading, setInviteLoading] = useState<string | null>(null);

  // Calendar Config State
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configTeam, setConfigTeam] = useState<Team | null>(null);
  const [availableCalendars, setAvailableCalendars] = useState<CalendarListEntry[]>([]);
  const [calendarsLoaded, setCalendarsLoaded] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  // Temporary state for the modal form
  const [tempSelectedCalendarId, setTempSelectedCalendarId] = useState('');
  const [tempSelectedMeetingRoomCalendarId, setTempSelectedMeetingRoomCalendarId] = useState('');

  // Selected Team for Calendar Widget
  const [selectedCalendarTeamId, setSelectedCalendarTeamId] = useState<string | null>(null);

  // Initialize selected calendar team
  useEffect(() => {
    if (teams.length > 0 && !selectedCalendarTeamId) {
      // Prioritize team with Google Calendar ID
      const teamWithCalendar = teams.find((t) => t.calendarId) || teams[0];
      setSelectedCalendarTeamId(teamWithCalendar.id);
    }
  }, [teams, selectedCalendarTeamId]);

  const handleNavigateToMember = useCallback(
    (teamId: string, memberId: string) => {
      router.push(`/teams/${teamId}/member/${memberId}`);
    },
    [router]
  );

  const handleNavigateToContacts = useCallback(
    (advisorId: string) => {
      router.push(`/contacts?advisorId=${advisorId}`);
    },
    [router]
  );

  const openLinkModal = async (team: Team) => {
    try {
      setLinkModalOpen({ teamId: team.id, teamName: team.name });
      const response = await getTeamAdvisors(team.id);
      if (response.success && response.data) {
        setAdvisorCandidates((response.data || []) as TeamAdvisor[]);
      } else {
        setAdvisorCandidates([]);
      }
    } catch {
      setAdvisorCandidates([]);
    }
  };

  const inviteAdvisor = async (userId: string) => {
    if (!linkModalOpen) return;
    try {
      setInviteLoading(userId);
      await createTeamInvitation(linkModalOpen.teamId, { userId });
      setAdvisorCandidates((prev) => prev.filter((a: TeamAdvisor) => String(a.id) !== userId));
    } catch (err) {
      logger.error(
        toLogContext({ err, teamId: linkModalOpen.teamId, userId }),
        'Error inviting advisor'
      );
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

      const response = await createTeam({
        name: newTeamName.trim(),
        managerUserId: userId,
      });

      if (response.success && response.data) {
        setNewTeamName('');
        setShowCreateTeam(false);
        // Refresh teams list
        setTeams((prev) => [...prev, response.data!]);
      } else {
        throw new Error('Error al crear equipo');
      }
    } catch (err) {
      logger.error(toLogContext({ err, teamName: newTeamName }), 'Error creating team');
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
      setMembershipRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      logger.error(
        toLogContext({ err, requestId, action }),
        'Error responding to membership request'
      );
      setError(err instanceof Error ? err.message : 'Error al procesar solicitud');
    } finally {
      setActionLoading(null);
    }
  };

  // Calendar Config Handlers
  const loadAvailableCalendars = async () => {
    if (calendarsLoaded || !isGoogleConnected) return;

    try {
      const response = await getPersonalCalendars();
      if (response.success && response.data) {
        setAvailableCalendars(response.data);
        setCalendarsLoaded(true);
      }
    } catch (err) {
      console.error('Error loading calendars:', err);
      // Fail silently
    }
  };

  const handleOpenConfigModal = (team: Team) => {
    setConfigTeam(team);
    setTempSelectedCalendarId(team.calendarId || '');
    setTempSelectedMeetingRoomCalendarId(team.meetingRoomCalendarId || '');
    setConfigModalOpen(true);

    if (isGoogleConnected && !calendarsLoaded) {
      loadAvailableCalendars();
    }
  };

  const handleConfigTeamChange = (teamId: string) => {
    const newTeam = teams.find((t) => t.id === teamId);
    if (newTeam) {
      setConfigTeam(newTeam);
      setTempSelectedCalendarId(newTeam.calendarId || '');
      setTempSelectedMeetingRoomCalendarId(newTeam.meetingRoomCalendarId || '');
    }
  };

  const handleCloseConfigModal = () => {
    setConfigModalOpen(false);
    setConfigTeam(null);
    setTempSelectedCalendarId('');
    setTempSelectedMeetingRoomCalendarId('');
    setError(null);
  };

  const handleConnectCalendar = async (type: 'primary' | 'meetingRoom') => {
    if (!configTeam) return;

    const calendarIdToConnect =
      type === 'meetingRoom' ? tempSelectedMeetingRoomCalendarId : tempSelectedCalendarId;

    if (!calendarIdToConnect) return;

    try {
      setConfigLoading(true);
      setError(null);

      await connectTeamCalendar(configTeam.id, calendarIdToConnect, type);

      setTeams((prev) =>
        prev.map((team) => {
          if (team.id === configTeam.id) {
            return {
              ...team,
              [type === 'meetingRoom' ? 'meetingRoomCalendarId' : 'calendarId']:
                calendarIdToConnect,
            };
          }
          return team;
        })
      );

      // Update configTeam to reflect the change
      setConfigTeam((prev) =>
        prev
          ? {
              ...prev,
              [type === 'meetingRoom' ? 'meetingRoomCalendarId' : 'calendarId']:
                calendarIdToConnect,
            }
          : null
      );
    } catch (err) {
      logger.error(
        toLogContext({ err, teamId: configTeam.id, calendarId: calendarIdToConnect, type }),
        'Error connecting team calendar'
      );
      setError(err instanceof Error ? err.message : 'Error al conectar calendario');
    } finally {
      setConfigLoading(false);
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
          <Text size="sm" color="secondary">
            {request.user?.email || 'N/A'}
          </Text>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Rol',
      render: (request) => <Badge variant="default">{request.user?.role || 'N/A'}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (request) => (
        <Text size="sm">{new Date(request.createdAt).toLocaleDateString('es-ES')}</Text>
      ),
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: 'Acciones',
            render: (request: MembershipRequest) => (
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
            ),
          },
        ]
      : []),
  ];

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <Stack direction="column" gap="lg">
        {/* Widget de Calendario del Equipo - Integrado */}
        {teams.length > 0 && (
          <section aria-label="Calendario del equipo">
            <CalendarWidget
              teams={teams}
              selectedTeamId={selectedCalendarTeamId || undefined}
              onSelectTeam={setSelectedCalendarTeamId}
              onConfigure={handleOpenConfigModal}
              canConfigure={canEdit}
            />
          </section>
        )}

        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Teams Grid */}
        <Grid cols={1} gap="lg">
          {teams.map((team, index) => (
            <div
              key={team.id}
              className={`transition-all duration-500 ease-out ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${50 + index * 50}ms` }}
            >
              <Card
                className="rounded-md border border-border hover:border-border-hover hover:shadow-md hover-lift transition-all cursor-pointer"
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
            </div>
          ))}
        </Grid>

        {/* Empty state */}
        {teams.length === 0 && (
          <Card className="rounded-md border border-border hover:border-border-hover hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="text-center py-8">
                <Text weight="medium" className="mb-2">
                  No hay equipos creados
                </Text>
                <Text color="secondary" className="mb-4">
                  {canEdit
                    ? 'Crea tu primer equipo para comenzar a organizar a tu equipo de trabajo.'
                    : 'Aún no perteneces a ningún equipo.'}
                </Text>
                <div className="flex flex-col items-center gap-2">
                  <Text size="sm" color="secondary">
                    Si tienes invitaciones pendientes, puedes aceptarlas desde tu perfil.
                  </Text>
                  <Button variant="outline" size="sm" onClick={() => router.push('/profile')}>
                    Ir a mi perfil
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Membership Requests */}
        {canEdit && membershipRequests.length > 0 && (
          <Card className="rounded-md border border-border hover:border-border-hover hover:shadow-sm transition-shadow">
            <CardHeader className="p-4">
              <CardTitle className="text-base">Solicitudes de Membresía</CardTitle>
              <Text size="sm" color="secondary">
                {membershipRequests.length} solicitud(es) pendiente(s)
              </Text>
            </CardHeader>
            <CardContent className="p-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <DataTable
                data={membershipRequests as unknown as Record<string, unknown>[]}
                columns={membershipColumns as unknown as Column<Record<string, unknown>>[]}
                keyField="id"
                emptyState={<Text color="secondary">No hay solicitudes pendientes.</Text>}
              />
            </CardContent>
          </Card>
        )}

        {/* Modal de crear equipo */}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewTeamName(e.target.value)
                    }
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

        {/* Modal agregar miembros */}
        {canEdit && (
          <Modal open={!!linkModalOpen} onOpenChange={() => setLinkModalOpen(null)}>
            <ModalHeader>
              <ModalTitle>
                Agregar miembros {linkModalOpen ? `a ${linkModalOpen.teamName}` : ''}
              </ModalTitle>
              <ModalDescription>
                Selecciona miembros (asesores, managers o administrativos) para enviar invitación al
                equipo.
              </ModalDescription>
            </ModalHeader>
            <ModalContent>
              <Stack direction="column" gap="sm">
                {advisorCandidates.length === 0 && (
                  <Text color="secondary">No hay usuarios disponibles para invitar.</Text>
                )}
                {advisorCandidates.map((a: TeamAdvisor) => (
                  <div
                    key={String(a.id)}
                    className="flex items-center justify-between border rounded-md px-3 py-2"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Text weight="medium">{a.fullName || a.email}</Text>
                        <Badge variant="default" className="text-xs">
                          {a.role || 'N/A'}
                        </Badge>
                        {a.currentTeamId && (
                          <Badge variant="outline" className="text-xs">
                            En otro equipo
                          </Badge>
                        )}
                      </div>
                      <Text size="sm" color="secondary">
                        {a.email}
                      </Text>
                    </div>
                    <Button
                      size="sm"
                      disabled={inviteLoading === String(a.id)}
                      onClick={() => inviteAdvisor(String(a.id))}
                    >
                      Invitar
                    </Button>
                  </div>
                ))}
              </Stack>
              <ModalFooter>
                <Button variant="secondary" onClick={() => setLinkModalOpen(null)}>
                  Cerrar
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}

        {/* Modal Configuración Calendario */}
        {canEdit && configTeam && (
          <CalendarConfigModal
            isOpen={configModalOpen}
            onClose={handleCloseConfigModal}
            teams={teams}
            selectedTeam={configTeam}
            onTeamChange={handleConfigTeamChange}
            isGoogleConnected={isGoogleConnected}
            availableCalendars={availableCalendars}
            selectedCalendarId={tempSelectedCalendarId}
            onSelectCalendarId={setTempSelectedCalendarId}
            selectedMeetingRoomCalendarId={tempSelectedMeetingRoomCalendarId}
            onSelectMeetingRoomCalendarId={setTempSelectedMeetingRoomCalendarId}
            onConnectCalendar={handleConnectCalendar}
            isLoading={configLoading}
          />
        )}
      </Stack>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
// This component renders many team cards and can re-render frequently
const MemoizedTeamsClient = React.memo(TeamsClient);

export default MemoizedTeamsClient;
