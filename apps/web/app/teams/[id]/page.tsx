'use client';
import { useRequireAuth } from '@/auth/useRequireAuth';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getTeamDetail,
  getTeamAdvisors,
  createTeamInvitation,
  updateTeam,
  deleteTeam,
  removeTeamMember,
} from '@/lib/api';
import { logger, toLogContext } from '@/lib/logger';
import type { Team, TeamMember, TeamMetrics, TeamAdvisor } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Grid,
  Spinner,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Heading,
  Icon,
  Badge,
  Input,
  Alert,
  Toast,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@maatwork/ui';
import { ConfirmDialog } from '@maatwork/ui';
import TeamActivityTable from '../components/TeamActivityTable';
import TeamPerformanceSnapshot from '../components/TeamPerformanceSnapshot';
import { TeamCalendarSection } from '../components/TeamCalendarSection';
import TeamGoalsCard from '../components/TeamGoalsCard';
import LeadDistributionPanel from '../components/LeadDistributionPanel';
import CapacityHeatmap from '../components/CapacityHeatmap';
import TeamHistoryChart from '../components/TeamHistoryChart';

export default function TeamDetailsPage() {
  const { user, loading } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = String(params?.id || '');

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal states
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [removeMemberConfirm, setRemoveMemberConfirm] = useState<{
    open: boolean;
    memberId: string;
    memberName: string;
  }>({
    open: false,
    memberId: '',
    memberName: '',
  });

  // Form states
  const [editTeamName, setEditTeamName] = useState('');
  const [advisorCandidates, setAdvisorCandidates] = useState<TeamAdvisor[]>([]);
  const [inviteLoading, setInviteLoading] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    description?: string;
    variant: 'success' | 'error';
  }>({
    show: false,
    title: '',
    variant: 'success',
  });

  // Check if user can manage this team (admin or manager of this specific team)
  const canManageTeam =
    user &&
    team &&
    (user.role === 'admin' || (user.role === 'manager' && team.managerUserId === user.id));

  useEffect(() => {
    if (!user) return;
    // Strict RBAC: Only managers and admins can view team details page
    // Regular members see their dashboard at /teams
    if (!['manager', 'admin'].includes(user.role)) {
      router.push('/teams');
      return;
    }
    fetchAll();
  }, [user, teamId]);

  const fetchAll = async () => {
    try {
      setLoadingData(true);
      setError(null);

      // Get team detail (team + members + metrics) in a single request
      // Backend validates permission (must be manager of this team or admin)
      const detailRes = await getTeamDetail(teamId);

      if (detailRes.success && detailRes.data) {
        setTeam(detailRes.data.team);
        setEditTeamName(detailRes.data.team.name);
        setMembers(detailRes.data.team.members || []);
        setTeamMetrics(detailRes.data.metrics);
      } else {
        // If backend denies access or fails
        throw new Error('No se pudo cargar la información del equipo o no tienes permisos');
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Error al cargar equipo';
      setError(errMsg);
      // Optional: Redirect if permission error
      if (errMsg.includes('permisos') || errMsg.includes('Access denied')) {
        setTimeout(() => router.push('/teams'), 2000);
      }
    } finally {
      setLoadingData(false);
    }
  };

  const showToast = (
    title: string,
    description?: string,
    variant: 'success' | 'error' = 'success'
  ) => {
    setToast({
      show: true,
      title,
      ...(description && { description }),
      variant,
    });
    setTimeout(() => setToast({ show: false, title: '', variant: 'success' }), 5000);
  };

  const openLinkModal = async () => {
    setLinkModalOpen(true);
    try {
      const res = await getTeamAdvisors(teamId);
      if (res.success && res.data) {
        setAdvisorCandidates((res.data || []) as TeamAdvisor[]);
      } else {
        setAdvisorCandidates([]);
      }
    } catch {
      setAdvisorCandidates([]);
    }
  };

  const inviteAdvisor = async (inviteeId: string) => {
    try {
      setInviteLoading(inviteeId);
      const res = await createTeamInvitation(teamId, { userId: inviteeId });
      if (res.success) {
        setAdvisorCandidates((prev) => prev.filter((a: TeamAdvisor) => String(a.id) !== inviteeId));
        showToast('Invitación enviada', 'El asesor recibirá una notificación', 'success');
      } else {
        showToast('Error', 'No se pudo enviar la invitación', 'error');
      }
    } catch (err) {
      logger.error(toLogContext({ err, teamId, inviteeId }), 'Error inviting advisor');
      showToast('Error', 'No se pudo enviar la invitación', 'error');
    } finally {
      setInviteLoading(null);
    }
  };

  const handleEditTeam = async () => {
    if (!editTeamName.trim()) {
      showToast('Error', 'El nombre del equipo no puede estar vacío', 'error');
      return;
    }

    try {
      setActionLoading('edit');
      const res = await updateTeam(teamId, { name: editTeamName.trim() });
      if (res.success && res.data) {
        setTeam(res.data);
        setEditModalOpen(false);
        showToast(
          'Equipo actualizado',
          'El nombre del equipo se ha actualizado correctamente',
          'success'
        );
        await fetchAll();
      } else {
        showToast('Error', 'No se pudo actualizar el equipo', 'error');
      }
    } catch (err) {
      logger.error(toLogContext({ err, teamId }), 'Error updating team');
      showToast('Error', 'No se pudo actualizar el equipo', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTeam = async () => {
    try {
      setActionLoading('delete');
      const res = await deleteTeam(teamId);
      if (res.success) {
        showToast('Equipo eliminado', 'El equipo se ha eliminado correctamente', 'success');
        setTimeout(() => {
          router.push('/teams');
        }, 1500);
      } else {
        showToast('Error', 'No se pudo eliminar el equipo', 'error');
      }
    } catch (err) {
      logger.error(toLogContext({ err, teamId }), 'Error deleting team');
      showToast('Error', 'No se pudo eliminar el equipo', 'error');
    } finally {
      setActionLoading(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberConfirm.memberId) return;

    try {
      setActionLoading(`remove-${removeMemberConfirm.memberId}`);
      const res = await removeTeamMember(teamId, removeMemberConfirm.memberId);
      if (res.success) {
        showToast('Miembro removido', 'El miembro ha sido removido del equipo', 'success');
        setRemoveMemberConfirm({ open: false, memberId: '', memberName: '' });
        await fetchAll();
      } else {
        showToast('Error', 'No se pudo remover el miembro', 'error');
      }
    } catch (err) {
      logger.error(
        toLogContext({ err, teamId, memberId: removeMemberConfirm.memberId }),
        'Error removing member'
      );
      showToast('Error', 'No se pudo remover el miembro', 'error');
    } finally {
      setActionLoading(null);
    }
  };


  const getRiskLevelLabel = (riskLevel: string) => {
    const labels: Record<string, string> = {
      conservative: 'Conservador',
      moderate: 'Moderado',
      balanced: 'Balanceado',
      growth: 'Crecimiento',
      aggressive: 'Agresivo',
    };
    return labels[riskLevel] || riskLevel;
  };

  if (loading || loadingData) {
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
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => router.push('/teams')} className="mb-2">
              <Icon name="ChevronLeft" size={16} className="mr-2" />
              Volver
            </Button>
            <Heading level={2}>{team?.name || 'Equipo'}</Heading>
          </div>
          {canManageTeam && (
            <Stack direction="row" gap="sm">
              <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
                <Icon name="edit" size={16} className="mr-2" />
                Editar
              </Button>
              <Button variant="secondary" onClick={() => setDeleteConfirmOpen(true)}>
                <Icon name="trash-2" size={16} className="mr-2" />
                Eliminar
              </Button>
              <Button onClick={openLinkModal}>
                <Icon name="plus" size={16} className="mr-2" />
                Agregar miembros
              </Button>
            </Stack>
          )}
        </div>

        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        <Grid cols={{ base: 1, lg: 3 }} gap="lg">
          {/* Left Column: Goals & Metrics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Snapshot */}
            <TeamPerformanceSnapshot teamId={teamId} />

            {/* History Chart */}
            <TeamHistoryChart teamId={teamId} />

            {/* Capacity Heatmap */}
            <CapacityHeatmap teamId={teamId} />

            {/* Risk Distribution */}
            {teamMetrics && teamMetrics.riskDistribution.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Riesgo</CardTitle>
                </CardHeader>
                <CardContent>
                  <Stack direction="column" gap="sm">
                    {teamMetrics.riskDistribution.map((item) => (
                      <div key={item.riskLevel} className="flex items-center justify-between">
                        <Text>{getRiskLevelLabel(item.riskLevel)}</Text>
                        <Badge variant="default">{item.count}</Badge>
                      </div>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Goals & Calendar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Goals Card */}
            <TeamGoalsCard teamId={teamId} />

            {/* Manager Calendar View */}
            {canManageTeam && team && (
              <TeamCalendarSection
                teamId={teamId}
                isManager={true}
                currentCalendarId={(team.calendarId || team.calendarUrl) ?? null}
                members={members}
              />
            )}
          </div>
        </Grid>

        {/* Tabs for Management */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="activity">
              <Icon name="Activity" size={16} className="mr-2" />
              Actividad
            </TabsTrigger>
            <TabsTrigger value="leads">
              <Icon name="Users" size={16} className="mr-2" />
              Gestión de Leads
            </TabsTrigger>
            <TabsTrigger value="members">
              <Icon name="Team" size={16} className="mr-2" />
              Miembros ({members.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <TeamActivityTable teamId={teamId} teamName={team?.name} />
          </TabsContent>

          <TabsContent value="leads">
            <LeadDistributionPanel teamId={teamId} />
          </TabsContent>

          <TabsContent value="members">
            {members.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <Text color="secondary" className="text-center">
                    No hay miembros en este equipo.
                  </Text>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {members.map((member) => (
                  <Card
                    key={member.id}
                    className="rounded-md border border-border hover:border-border-hover hover:shadow-sm transition-all"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Text weight="medium" className="text-sm truncate">
                              {member.fullName ||
                                member.email ||
                                member.user?.fullName ||
                                member.user?.email ||
                                'Miembro'}
                            </Text>
                            <Badge variant="default" className="text-xs px-1.5 py-0.5">
                              {member.role || member.user?.role || 'N/A'}
                            </Badge>
                          </div>
                          <Text size="sm" color="secondary" className="truncate">
                            {member.email || member.user?.email || 'N/A'}
                          </Text>
                        </div>
                      </div>
                      <Stack direction="row" gap="sm" className="mt-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/contacts?advisorId=${member.id}`)}
                        >
                          Ver CRM
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/teams/${teamId}/member/${member.id}`)}
                        >
                          <Icon name="User" size={16} />
                        </Button>
                        {member.role !== 'lead' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setRemoveMemberConfirm({
                                open: true,
                                memberId: member.id,
                                memberName: member.fullName || member.email || 'este miembro',
                              })
                            }
                            className="text-red-600 hover:text-red-700"
                          >
                            <Icon name="trash-2" size={16} />
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal agregar miembros */}
        <Modal open={linkModalOpen} onOpenChange={setLinkModalOpen}>
          <ModalHeader>
            <ModalTitle>Agregar miembros a {team?.name}</ModalTitle>
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
              <Button variant="secondary" onClick={() => setLinkModalOpen(false)}>
                Cerrar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal editar equipo */}
        <Modal open={editModalOpen} onOpenChange={setEditModalOpen}>
          <ModalHeader>
            <ModalTitle>Editar equipo</ModalTitle>
            <ModalDescription>Modifica el nombre del equipo.</ModalDescription>
          </ModalHeader>
          <ModalContent>
            <Stack direction="column" gap="md">
              <Input
                label="Nombre del equipo"
                value={editTeamName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditTeamName(e.target.value)
                }
                placeholder="Ej: Equipo de Ventas Norte"
                required
              />
            </Stack>
            <ModalFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditTeamName(team?.name || '');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEditTeam}
                disabled={actionLoading === 'edit' || !editTeamName.trim()}
              >
                Guardar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Confirm Dialog - Delete Team */}
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={handleDeleteTeam}
          title="Eliminar equipo"
          description="¿Estás seguro de que deseas eliminar este equipo? Esta acción no se puede deshacer y todos los miembros serán removidos del equipo."
          variant="danger"
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
        />

        {/* Confirm Dialog - Remove Member */}
        <ConfirmDialog
          open={removeMemberConfirm.open}
          onOpenChange={(open: boolean) => setRemoveMemberConfirm({ open, memberId: '', memberName: '' })}
          onConfirm={handleRemoveMember}
          title="Remover miembro"
          description={`¿Estás seguro de que deseas remover a ${removeMemberConfirm.memberName} del equipo?`}
          variant="danger"
          confirmLabel="Remover"
          cancelLabel="Cancelar"
        />

        {/* Toast */}
        {toast.show && (
          <Toast
            title={toast.title}
            {...(toast.description && { description: toast.description })}
            variant={toast.variant}
            open={toast.show}
            onOpenChange={(open: boolean) => setToast({ ...toast, show: open })}
          />
        )}
      </Stack>
    </div>
  );
}
