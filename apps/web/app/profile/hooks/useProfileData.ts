'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentUser, getTeams, getAllTeamMembers, getPendingInvitations } from '@/lib/api';
import { logger, toLogContext } from '@/lib/logger';
import type { UserApiResponse as User, Team, TeamMember, TeamInvitation } from '@/types';
import type { AuthUser } from '@/app/auth/AuthContext';

// AI_DECISION: Usar AuthUser en props porque viene del contexto de autenticación
// Justificación: El hook recibe user del AuthContext que devuelve AuthUser, no UserApiResponse
// Impacto: Compatibilidad correcta de tipos entre AuthContext y hooks del perfil
interface UseProfileDataProps {
  user: AuthUser | null;
}

interface UseProfileDataReturn {
  userInfo: User | null;
  setUserInfo: React.Dispatch<React.SetStateAction<User | null>>;
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  teamMembers: TeamMember[];
  invitations: TeamInvitation[];
  setInvitations: React.Dispatch<React.SetStateAction<TeamInvitation[]>>;
  dataLoading: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  fetchUserInfo: () => Promise<void>;
}

/**
 * Hook para cargar y gestionar datos del perfil de usuario
 */
export function useProfileData({ user }: UseProfileDataProps): UseProfileDataReturn {
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserInfo = useCallback(async () => {
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

          // Fetch team members (tolerar 404 como "sin miembros")
          try {
            const membersResponse = await getAllTeamMembers();
            if (membersResponse.success && membersResponse.data) {
              setTeamMembers(membersResponse.data || []);
            }
          } catch (err) {
            logger.warn(
              'No se pudo obtener miembros del equipo (continuando)',
              toLogContext({ err })
            );
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
  }, [user?.role]);

  useEffect(() => {
    if (user) {
      void fetchUserInfo();
    }
  }, [user, fetchUserInfo]);

  return {
    userInfo,
    setUserInfo,
    teams,
    setTeams,
    teamMembers,
    invitations,
    setInvitations,
    dataLoading,
    error,
    setError,
    fetchUserInfo,
  };
}
