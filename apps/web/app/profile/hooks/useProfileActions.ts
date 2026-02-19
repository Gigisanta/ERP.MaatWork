'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  respondToInvitation,
  createTeam,
  inviteTeamMember,
  removeTeamMember,
  changePassword,
  updateUserProfile,
} from '@/lib/api';
import { getTeams } from '@/lib/api/teams';
import { logger, toLogContext } from '@/lib/logger';
import type { UserApiResponse as User, Team, TeamInvitation } from '@/types';
import type { AuthUser } from '@/app/auth/AuthContext';

// AI_DECISION: Usar AuthUser en props porque viene del contexto de autenticación
// Justificación: El hook recibe user del AuthContext que devuelve AuthUser, no UserApiResponse
// Impacto: Compatibilidad correcta de tipos entre AuthContext y hooks del perfil
interface UseProfileActionsProps {
  user: AuthUser | null;
  showToast: (
    title: string,
    description?: string,
    variant?: 'success' | 'error' | 'warning' | 'info'
  ) => void;
  setError: (error: string | null) => void;
  setInvitations: React.Dispatch<React.SetStateAction<TeamInvitation[]>>;
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  setUserInfo: React.Dispatch<React.SetStateAction<User | null>>;
  fetchUserInfo: () => Promise<void>;
  router?: ReturnType<typeof useRouter>;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface TeamForm {
  name: string;
}

interface MemberForm {
  email: string;
  teamId?: string;
}

/**
 * Hook para manejar acciones del perfil de usuario
 */
export function useProfileActions({
  user,
  showToast,
  setError,
  setInvitations,
  setTeams,
  setUserInfo,
  fetchUserInfo,
  router,
}: UseProfileActionsProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form states
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [teamForm, setTeamForm] = useState<TeamForm>({
    name: '',
  });

  const [memberForm, setMemberForm] = useState<MemberForm>({
    email: '',
  });

  // Phone editing state
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handleInvitation = async (id: string, action: 'accept' | 'reject') => {
    try {
      setActionLoading(`inv-${id}`);
      setError(null);
      await respondToInvitation(id, action);
      setInvitations((prev) => prev.filter((r) => r.id !== id));

      // Si se acepta la invitación, actualizar la lista de equipos y mostrar toast
      if (action === 'accept') {
        showToast(
          'Invitación aceptada',
          'Ahora eres miembro del equipo. Puedes verlo en la página de equipos.',
          'success'
        );

        // Actualizar la lista de equipos para reflejar el cambio
        try {
          const teamsResponse = await getTeams();
          if (teamsResponse.success && teamsResponse.data) {
            setTeams(teamsResponse.data || []);
          }
        } catch (teamsErr) {
          logger.warn(
            toLogContext({ err: teamsErr }),
            'Error refreshing teams after accepting invitation'
          );
          // No es crítico, el usuario puede refrescar manualmente
        }

        // Invalidar el cache del router para que /teams se actualice automáticamente
        if (router) {
          router.refresh();
        }
      } else {
        showToast('Invitación rechazada', undefined, 'info');
      }
    } catch (err) {
      logger.error(
        toLogContext({ err, invitationId: id, action }),
        'Error responding to invitation'
      );
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar invitación';
      setError(errorMessage);
      showToast('Error', errorMessage, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePasswordChange = async (onSuccess: () => void) => {
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
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onSuccess();
      showToast('Contraseña cambiada exitosamente', undefined, 'success');
    } catch (err) {
      logger.error(toLogContext({ err }), 'Error changing password');
      setError(err instanceof Error ? err.message : 'Error al cambiar contraseña');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateTeam = async (onSuccess: () => void) => {
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
        managerUserId: user.id,
      });

      setTeamForm({ name: '' });
      onSuccess();
      await fetchUserInfo();
      showToast('Equipo creado exitosamente', undefined, 'success');
    } catch (err) {
      logger.error(toLogContext({ err, teamForm }), 'Error creating team');
      setError(err instanceof Error ? err.message : 'Error al crear equipo');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddMember = async (onSuccess: () => void) => {
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
        email: memberForm.email.trim(),
      });

      setMemberForm({ email: '' });
      onSuccess();
      await fetchUserInfo();
      showToast('Invitación enviada exitosamente', undefined, 'success');
    } catch (err) {
      logger.error(toLogContext({ err, memberForm }), 'Error inviting member');
      setError(err instanceof Error ? err.message : 'Error al invitar miembro');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    try {
      setActionLoading(`leave-${teamId}`);
      if (!user) throw new Error('Usuario no autenticado');

      await removeTeamMember(teamId, user.id);
      await fetchUserInfo();
      showToast('Has abandonado el equipo', undefined, 'success');
    } catch (err) {
      logger.error(toLogContext({ err, teamId, userId: user?.id }), 'Error leaving team');
      setError(err instanceof Error ? err.message : 'Error al abandonar equipo');
      showToast(
        'Error al abandonar equipo',
        err instanceof Error ? err.message : 'Error desconocido',
        'error'
      );
    } finally {
      setActionLoading(null);
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
      logger.error(toLogContext({ err }), 'Error updating phone');
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar teléfono';
      setPhoneError(errorMessage);
      showToast('Error', errorMessage, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelEditPhone = (currentPhone: string | null | undefined) => {
    setIsEditingPhone(false);
    setPhoneValue(currentPhone || '');
    setPhoneError(null);
  };

  return {
    actionLoading,
    passwordForm,
    setPasswordForm,
    teamForm,
    setTeamForm,
    memberForm,
    setMemberForm,
    isEditingPhone,
    setIsEditingPhone,
    phoneValue,
    setPhoneValue,
    phoneError,
    setPhoneError,
    handleInvitation,
    handlePasswordChange,
    handleCreateTeam,
    handleAddMember,
    handleLeaveTeam,
    handleSavePhone,
    handleCancelEditPhone,
  };
}
