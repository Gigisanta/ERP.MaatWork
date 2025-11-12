'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRequireAuth } from '../auth/useRequireAuth';
import { getCurrentUser, getTeams, getAllTeamMembers, getPendingInvitations, respondToInvitation, createTeam, inviteTeamMember, removeTeamMember, changePassword, updateUserProfile } from '@/lib/api';
import { updateTeam } from '@/lib/api/teams';
import { logger, toLogContext } from '../../lib/logger';
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
  Tooltip,
  Icon
} from '@cactus/ui';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../../lib/hooks/useToast';

export default function ProfilePage() {
  const { user, loading } = useRequireAuth();
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
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  // AI_DECISION: Use centralized toast system
  // Justificación: Consistent UX, reduces code duplication
  // Impacto: Better maintainability
  const { showToast } = useToast();

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

  // AUM Advisor Aliases (self-service)
  const [aliases, setAliases] = useState<Array<{ id: string; aliasRaw: string; aliasNormalized: string; userId: string }>>([]);
  const [newAlias, setNewAlias] = useState('');
  const [aliasLoading, setAliasLoading] = useState(false);
  
  // Usar refs para mantener referencias estables - definidos ANTES de las funciones que los usan
  const userIdRef = useRef(user?.id);
  const loadAliasesRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const showToastRef = useRef(showToast);
  // deleteAliasRef se inicializará después de definir deleteAlias
  const deleteAliasRef = useRef<((id: string) => Promise<void>) | null>(null);
  const aliasLoadingRef = useRef(aliasLoading);
  
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);
  
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);
  
  useEffect(() => {
    aliasLoadingRef.current = aliasLoading;
  }, [aliasLoading]);
  
  const loadAliases = useCallback(async () => {
    try {
      const m = await import('@/lib/api/settings');
      const resp = await m.listAdvisorAliases();
      if (resp.success && resp.data) {
        const mine = (resp.data.aliases || []).filter(a => a.userId === userIdRef.current);
        setAliases(mine);
      }
    } catch (e) {
      logger.warn('No se pudieron obtener aliases', toLogContext({ e }));
    }
  }, []); // Sin dependencias - completamente estable
  
  useEffect(() => {
    loadAliasesRef.current = loadAliases;
  }, [loadAliases]);
  
  useEffect(() => { if (user) { void loadAliases(); } }, [user, loadAliases]);
  
  const addAlias = async () => {
    if (!newAlias.trim() || !user) return;
    try {
      setAliasLoading(true);
      const m = await import('@/lib/api/settings');
      await m.createAdvisorAlias({ alias: newAlias, userId: user.id });
      setNewAlias('');
      if (loadAliasesRef.current) {
        await loadAliasesRef.current();
      }
      showToastRef.current('Alias agregado', undefined, 'success');
    } catch (e) {
      const err = e as { userMessage?: string; message?: string };
      const msg = err.userMessage || err.message || 'Error creando alias';
      setError(msg);
      showToastRef.current('Error', msg, 'error');
    } finally {
      setAliasLoading(false);
    }
  };
  
  const deleteAlias = useCallback(async (id: string) => {
    try {
      setAliasLoading(true);
      const m = await import('@/lib/api/settings');
      await m.deleteAdvisorAlias(id);
      if (loadAliasesRef.current) {
        await loadAliasesRef.current();
      }
      showToastRef.current('Alias eliminado', undefined, 'success');
    } catch (e) {
      const err = e as { userMessage?: string; message?: string };
      const msg = err.userMessage || err.message || 'Error eliminando alias';
      setError(msg);
      showToastRef.current('Error', msg, 'error');
    } finally {
      setAliasLoading(false);
    }
  }, []); // Sin dependencias - completamente estable

  // Actualizar ref inmediatamente después de definir deleteAlias
  deleteAliasRef.current = deleteAlias;
  
  useEffect(() => {
    deleteAliasRef.current = deleteAlias;
  }, [deleteAlias]);

  // Estados de loading para acciones
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Estados para configuración de calendario
  const [calendarUrls, setCalendarUrls] = useState<Record<string, string>>({});
  const [calendarLoading, setCalendarLoading] = useState<Record<string, boolean>>({});

  // Cargar información del usuario
  useEffect(() => {
    if (user) {
      fetchUserInfo();
    }
  }, [user]);

  // Initialize calendar URLs from teams
  useEffect(() => {
    const initialUrls: Record<string, string> = {};
    teams.forEach(team => {
      if (team.calendarUrl) {
        initialUrls[team.id] = team.calendarUrl;
      }
    });
    setCalendarUrls(initialUrls);
  }, [teams]);

  const fetchUserInfo = async () => {
    try {
      setDataLoading(true);
      
      // Fetch user info
      const userResponse = await getCurrentUser();
      if (userResponse.success && userResponse.data) {
        setUserInfo(userResponse.data);
        // Inicializar phoneValue con el valor del usuario o cadena vacía
        setPhoneValue(userResponse.data.phone ?? '');
        // Si no hay teléfono, no abrir automáticamente el modo edición
        // pero permitir que el usuario lo haga cuando quiera
      }

      // Fetch teams if user is manager or admin
      if (user?.role === 'manager' || user?.role === 'admin') {
        const teamsResponse = await getTeams();
        if (teamsResponse.success && teamsResponse.data) {
          setTeams(teamsResponse.data || []);

          // Fetch team members (tolerar 404 como "sin miembros")
          try {
            const membersResponse = await getAllTeamMembers();
            if (membersResponse.success && membersResponse.data) {
              setTeamMembers(membersResponse.data || []);
            }
          } catch (err) {
            logger.warn('No se pudo obtener miembros del equipo (continuando)', toLogContext({ err }));
            setTeamMembers([]);
          }
        }
      }

      // Fetch pending team invitations for current user
      const invitationsResponse = await getPendingInvitations();
      if (invitationsResponse.success && invitationsResponse.data) {
        setInvitations(invitationsResponse.data || []);
      }
    } catch (err) {
      logger.error('Error fetching user info', toLogContext({ err }));
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
      logger.error('Error responding to invitation', toLogContext({ err, invitationId: id, action }));
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
      logger.error('Error changing password', toLogContext({ err }));
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
      logger.error('Error creating team', toLogContext({ err, teamForm }));
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
      logger.error('Error inviting member', toLogContext({ err, memberForm }));
      setError(err instanceof Error ? err.message : 'Error al invitar miembro');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveTeam = (teamId: string) => {
    if (!user) return;
    
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
          logger.error('Error leaving team', toLogContext({ err, teamId, userId: user?.id }));
          setError(err instanceof Error ? err.message : 'Error al abandonar equipo');
          showToast('Error al abandonar equipo', err instanceof Error ? err.message : 'Error desconocido', 'error');
        } finally {
          setActionLoading(null);
        }
      }
    });
  };

  const handleUpdateCalendarUrl = async (teamId: string) => {
    try {
      setCalendarLoading(prev => ({ ...prev, [teamId]: true }));
      setError(null);

      const calendarUrl = calendarUrls[teamId]?.trim() || null;
      
      await updateTeam(teamId, { calendarUrl });
      
      // Update local teams state
      setTeams(prev => prev.map(team => 
        team.id === teamId ? { ...team, calendarUrl } : team
      ));
      
      showToast('URL del calendario actualizada', undefined, 'success');
    } catch (err) {
      logger.error('Error updating calendar URL', toLogContext({ err, teamId }));
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar URL del calendario';
      setError(errorMessage);
      showToast('Error', errorMessage, 'error');
    } finally {
      setCalendarLoading(prev => ({ ...prev, [teamId]: false }));
    }
  };

  const handleSavePhone = async () => {
    setPhoneError(null);
    
    if (!phoneValue.trim()) {
      setPhoneError('El número de teléfono es obligatorio');
      return;
    }

    if (phoneValue.length > 50) {
      setPhoneError('El número de teléfono no puede exceder 50 caracteres');
      return;
    }

    try {
      setActionLoading('phone');
      setError(null);

      const response = await updateUserProfile({ phone: phoneValue.trim() });
      
      if (response.success && response.data) {
        setUserInfo(response.data);
        setIsEditingPhone(false);
        showToast('Teléfono actualizado exitosamente', undefined, 'success');
      }
    } catch (err) {
      logger.error('Error updating phone', toLogContext({ err }));
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar teléfono';
      setPhoneError(errorMessage);
      showToast('Error', errorMessage, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelEditPhone = () => {
    setIsEditingPhone(false);
    setPhoneValue(userInfo?.phone || '');
    setPhoneError(null);
  };

  // Columnas para la tabla de miembros
  const memberColumns: Column<TeamMember>[] = useMemo(() => [
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
  ], []);

  // Columnas para la tabla de aliases
  // Completamente estables - sin dependencias, usan refs para valores actuales
  const aliasColumns: Column<{ id: string; aliasRaw: string; aliasNormalized: string; userId: string }>[] = useMemo(() => [
    {
      key: 'aliasRaw',
      header: 'Alias',
      sortable: true,
    },
    {
      key: 'aliasNormalized',
      header: 'Normalizado',
      sortable: true,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      align: 'right',
      render: (alias) => {
        // Función wrapper para evitar recreación de la función render
        const handleDelete = () => {
          if (deleteAliasRef.current) {
            deleteAliasRef.current(alias.id);
          }
        };
        return (
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={aliasLoadingRef.current} 
              onClick={handleDelete}
              className="px-1.5 py-1 min-w-0 text-error hover:bg-error/10 hover:border-error"
              title="Eliminar alias"
            >
              <Icon name="x" size={14} />
            </Button>
          </div>
        );
      },
    },
  ], []); // Sin dependencias - completamente estable

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <Text>Cargando información del perfil...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Stack direction="column" gap="md">
        <div>
          <Heading level={2}>Mi Perfil</Heading>
          <Text size="sm" color="secondary">
            Gestiona tu información personal y equipos
          </Text>
        </div>

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        <Grid cols={1} gap="md">
          {/* Información del Usuario */}
          <Card padding="sm" className="p-2">
            <CardHeader className="mb-1.5">
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent>
              <Stack direction="column" gap="sm">
                <Grid cols={{ base: 1, md: 2 }} gap="sm">
                  <div className="space-y-1">
                    <Text weight="medium" size="xs" color="secondary">Nombre completo</Text>
                    <Text size="sm" className="text-text">{userInfo?.fullName || 'No disponible'}</Text>
                  </div>
                  <div className="space-y-1">
                    <Text weight="medium" size="xs" color="secondary">Email</Text>
                    <Text size="sm" className="text-text">{userInfo?.email || 'No disponible'}</Text>
                  </div>
                  <div className="space-y-1">
                    <Text weight="medium" size="xs" color="secondary">Teléfono</Text>
                    {isEditingPhone ? (
                      <Stack direction="column" gap="xs">
                        <Input
                          type="tel"
                          value={phoneValue}
                          onChange={(e) => {
                            setPhoneValue(e.target.value);
                            setPhoneError(null);
                          }}
                          placeholder="Ingrese su número de teléfono"
                          required
                          maxLength={50}
                          error={phoneError || undefined}
                          size="sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSavePhone}
                            disabled={actionLoading === 'phone'}
                          >
                            {actionLoading === 'phone' ? 'Guardando...' : 'Guardar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEditPhone}
                            disabled={actionLoading === 'phone'}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </Stack>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Text size="sm" className="text-text">{userInfo?.phone || 'No configurado'}</Text>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditingPhone(true)}
                        >
                          {userInfo?.phone ? 'Editar' : 'Agregar'}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Text weight="medium" size="xs" color="secondary">Rol</Text>
                    <div>
                      <Badge variant={userInfo?.role === 'admin' ? 'brand' : 'default'}>
                        {userInfo?.role || 'No disponible'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Text weight="medium" size="xs" color="secondary">Estado</Text>
                    <div>
                      <Badge variant={userInfo?.isActive ? 'success' : 'error'}>
                        {userInfo?.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                </Grid>
                {!userInfo?.phone && !isEditingPhone && (
                  <Alert variant="error" className="mt-1">
                    <Text size="xs">El número de teléfono es obligatorio para utilizar las automatizaciones del sistema. Por favor, agregue su número de teléfono.</Text>
                  </Alert>
                )}
                
                {/* Separador visual */}
                <div className="border-t border-border my-3" />
                
                {/* Secciones integradas en Grid */}
                <Grid cols={{ base: 1, md: 2 }} gap="sm">
                  {/* Aliases AUM */}
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Text weight="semibold" size="sm" className="text-text">Mi alias de AUM (asesor)</Text>
                      <Tooltip
                        content={
                          <div className="max-w-xs">
                            <Text size="xs">Este alias se usará para matchear el campo &quot;Asesor&quot; en los CSV de AUM. Coincidencia exacta tras trim + lowercase.</Text>
                          </div>
                        }
                      >
                        <button type="button" className="text-text-muted hover:text-text transition-colors flex-shrink-0">
                          <Icon name="info" size={14} />
                        </button>
                      </Tooltip>
                    </div>
                    <Stack direction="column" gap="sm" className="flex-1">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Ej: Juan Pérez"
                          value={newAlias}
                          onChange={(e) => setNewAlias(e.target.value)}
                          className="flex-1"
                          size="sm"
                        />
                        <Button size="sm" onClick={addAlias} disabled={aliasLoading || !newAlias.trim()}>
                          Agregar
                        </Button>
                      </div>
                      <div className="flex-1 min-h-[100px]">
                        <div className="[&_table]:text-xs [&_th]:px-2 [&_th]:py-1.5 [&_td]:px-2 [&_td]:py-1.5">
                          <DataTable<{ id: string; aliasRaw: string; aliasNormalized: string; userId: string } & Record<string, unknown>>
                            data={aliases as ({ id: string; aliasRaw: string; aliasNormalized: string; userId: string } & Record<string, unknown>)[]}
                            columns={aliasColumns as Column<{ id: string; aliasRaw: string; aliasNormalized: string; userId: string } & Record<string, unknown>>[]}
                            keyField="id"
                            emptyMessage="Sin alias"
                          />
                        </div>
                      </div>
                    </Stack>
                  </div>

                  {/* Equipos y Calendario combinados en una sola columna */}
                  {(user?.role === 'manager' || user?.role === 'admin' || teams.length > 0) && (
                    <div className="flex flex-col h-full">
                      {/* Equipos - Simplificado */}
                      <div className="mb-3">
                        <Text weight="semibold" size="sm" className="text-text mb-2 block">Mis Equipos</Text>
                        {teams.length === 0 ? (
                          <div className="flex items-center gap-2">
                            <Text size="sm" color="secondary">No tienes equipos asignados</Text>
                            {(user?.role === 'manager' || user?.role === 'admin') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTeamForm(true)}
                              >
                                Crear
                              </Button>
                            )}
                          </div>
                        ) : (
                          teams.map((team) => (
                            <div key={team.id} className="flex items-center gap-2">
                              <Text weight="medium" size="sm" className="text-text">{team.name}</Text>
                              <Badge variant={team.role === 'manager' ? 'brand' : 'default'}>
                                {team.role}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Calendario del Equipo - Debajo de Equipos */}
                      {(user?.role === 'manager' || user?.role === 'admin') && teams.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Text weight="semibold" size="sm" className="text-text">Calendario del Equipo</Text>
                            <Tooltip
                              content={
                                <div className="max-w-xs">
                                  <div className="font-semibold mb-1">Para obtener la URL correcta:</div>
                                  <ol className="list-decimal list-inside space-y-1 text-xs">
                                    <li>Ve a Google Calendar → Configuración del calendario</li>
                                    <li>En &quot;Compartir este calendario&quot;, marca &quot;Hacer público este calendario&quot;</li>
                                    <li>En &quot;Integrar calendario&quot;, copia la URL que aparece en &quot;Código para incrustar&quot;</li>
                                    <li>La URL debe tener el formato: https://calendar.google.com/calendar/embed?src=...</li>
                                  </ol>
                                </div>
                              }
                            >
                              <button type="button" className="text-text-muted hover:text-text transition-colors flex-shrink-0">
                                <Icon name="info" size={14} />
                              </button>
                            </Tooltip>
                          </div>
                          <Stack direction="column" gap="xs">
                            {teams
                              .filter(team => team.role === 'manager' || user?.role === 'admin')
                              .map((team) => (
                                <div key={team.id}>
                                  <div className="flex gap-2 mb-1">
                                    <Input
                                      type="url"
                                      placeholder="URL del calendario"
                                      value={calendarUrls[team.id] || ''}
                                      onChange={(e) => setCalendarUrls(prev => ({ ...prev, [team.id]: e.target.value }))}
                                      className="flex-1"
                                      size="sm"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateCalendarUrl(team.id)}
                                      disabled={calendarLoading[team.id]}
                                      className="flex-shrink-0"
                                    >
                                      {calendarLoading[team.id] ? '...' : 'Guardar'}
                                    </Button>
                                  </div>
                                  {team.calendarUrl && (
                                    <Tooltip content={team.calendarUrl}>
                                      <Text size="xs" color="secondary" className="truncate">
                                        URL: {team.calendarUrl}
                                      </Text>
                                    </Tooltip>
                                  )}
                                </div>
                              ))}
                          </Stack>
                        </div>
                      )}
                    </div>
                  )}
                </Grid>
                
                <div className="mt-2 flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordForm(true)}
                    className="w-fit"
                  >
                    Cambiar Contraseña
                  </Button>
                  {user?.role === 'admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/plandecarrera')}
                      className="w-fit"
                    >
                      Configurar Plan de Carrera
                    </Button>
                  )}
                </div>
              </Stack>
            </CardContent>
          </Card>

          {/* Invitaciones a equipos */}
          {invitations.length > 0 && (
            <Card padding="sm">
              <CardHeader className="mb-2">
                <CardTitle>Invitaciones a equipos</CardTitle>
              </CardHeader>
              <CardContent>
                <Stack direction="column" gap="xs">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <Text weight="medium" size="sm">Invitación de {inv.team?.name || 'Equipo'}</Text>
                        <Text size="xs" color="secondary">{new Date(inv.createdAt).toLocaleString('es-ES')}</Text>
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
          <Card padding="sm">
            <CardHeader className="mb-2">
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
              <DataTable<TeamMember & Record<string, unknown>>
                data={teamMembers as (TeamMember & Record<string, unknown>)[]}
                columns={memberColumns as Column<TeamMember & Record<string, unknown>>[]}
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
        <Stack direction="column" gap="sm">
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
        <Stack direction="column" gap="sm">
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
        <Stack direction="column" gap="sm">
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