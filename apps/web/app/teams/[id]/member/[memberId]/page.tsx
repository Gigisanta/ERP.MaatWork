"use client";
import { useRequireAuth } from '../../../../auth/useRequireAuth';
import { getTeams, getTeamMembers } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Team, TeamMember } from '@/types';
import { 
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Spinner,
  Heading,
  Icon,
} from '@cactus/ui';
import Link from 'next/link';

export default function TeamMemberPage() {
  const { user, token, loading } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = String(params?.id || '');
  const memberId = String(params?.memberId || '');

  const [member, setMember] = useState<TeamMember | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) return;
    if (!['manager', 'admin'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchData();
  }, [user, token, teamId, memberId]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      setError(null);

      // Get team info
      const teamsRes = await getTeams();
      if (teamsRes.success && teamsRes.data) {
        const foundTeam = teamsRes.data.find((t: Team) => t.id === teamId);
        if (foundTeam) setTeam({
          id: foundTeam.id,
          name: foundTeam.name,
          managerUserId: foundTeam.managerUserId,
          createdAt: foundTeam.createdAt
        });
      }

      // Get member info from team members
      const memRes = await getTeamMembers(teamId);
      if (memRes.success && memRes.data) {
        const foundMember = memRes.data.find((m: TeamMember) => m.id === memberId);
        if (foundMember) {
          setMember(foundMember);
        } else {
          setError('Miembro no encontrado en este equipo');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar información');
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-4 md:p-6">
        <Stack direction="column" gap="lg">
          <Button variant="secondary" onClick={() => router.push(`/teams/${teamId}`)}>
            <Icon name="ChevronLeft" size={16} className="mr-2" />
            Volver al equipo
          </Button>
          <Card>
            <CardContent className="p-6">
              <Text color="secondary">{error || 'Miembro no encontrado'}</Text>
            </CardContent>
          </Card>
        </Stack>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <Stack direction="column" gap="lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              onClick={() => router.push(`/teams/${teamId}`)}
              className="mb-2"
            >
              <Icon name="ChevronLeft" size={16} className="mr-2" />
              Volver al equipo
            </Button>
            <Heading level={2}>{member.fullName || member.email || member.user?.fullName || member.user?.email || 'Miembro'}</Heading>
            <Text color="secondary">{team?.name || 'Equipo'}</Text>
          </div>
        </div>

        {/* Member Info Card */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Información del Asesor</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Stack direction="column" gap="md">
              <div>
                <Text size="sm" weight="medium" color="secondary">Email</Text>
                <Text>{member.email || member.user?.email || 'N/A'}</Text>
              </div>
              <div>
                <Text size="sm" weight="medium" color="secondary">Rol</Text>
                <Text>{member.role || member.user?.role || 'N/A'}</Text>
              </div>
            </Stack>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Acciones</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Stack direction="column" gap="sm">
              <Link href={`/contacts?advisorId=${member.id}`}>
                <Button variant="primary" className="w-full">
                  <Icon name="User" size={16} className="mr-2" />
                  Ver CRM del Asesor
                </Button>
              </Link>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </div>
  );
}

