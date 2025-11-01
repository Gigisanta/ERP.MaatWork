"use client";
import { useRequireAuth } from '../../../../auth/useRequireAuth';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

interface Member {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
}

export default function TeamMemberPage() {
  const { user, token, loading } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = String(params?.id || '');
  const memberId = String(params?.memberId || '');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [member, setMember] = useState<Member | null>(null);
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
      const teamsRes = await fetch(`${apiUrl}/teams`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (teamsRes.ok) {
        const tjson = await teamsRes.json();
        const foundTeam = (tjson.data || []).find((t: any) => t.id === teamId);
        if (foundTeam) setTeam({ id: foundTeam.id, name: foundTeam.name });
      }

      // Get member info from team members
      const memRes = await fetch(`${apiUrl}/teams/${teamId}/members`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (!memRes.ok) throw new Error('No se pudieron cargar los miembros');
      const mjson = await memRes.json();
      const foundMember = (mjson.data || []).find((m: Member) => m.id === memberId);
      if (foundMember) {
        setMember(foundMember);
      } else {
        setError('Miembro no encontrado en este equipo');
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
            <Icon name="arrow-left" size={16} className="mr-2" />
            Volver al equipo
          </Button>
          <Card>
            <CardContent className="p-6">
              <Text color="danger">{error || 'Miembro no encontrado'}</Text>
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
              <Icon name="arrow-left" size={16} className="mr-2" />
              Volver al equipo
            </Button>
            <Heading level={2}>{member.fullName || member.email}</Heading>
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
                <Text>{member.email}</Text>
              </div>
              <div>
                <Text size="sm" weight="medium" color="secondary">Rol</Text>
                <Text>{member.role}</Text>
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
                  <Icon name="user" size={16} className="mr-2" />
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

