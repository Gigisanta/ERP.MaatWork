"use client";
import { useRequireAuth } from '../../auth/useRequireAuth';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
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
} from '@cactus/ui';

interface Member { id: string; email: string; fullName: string; role: string }

export default function TeamDetailsPage() {
  const { user, token, loading } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = String(params?.id || '');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [members, setMembers] = useState<Member[]>([]);
  const [teamName, setTeamName] = useState<string>('Equipo');
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [advisorCandidates, setAdvisorCandidates] = useState<Array<{ id: string; email: string; fullName: string }>>([]);
  const [inviteLoading, setInviteLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) return;
    if (!['manager', 'admin'].includes(user.role)) {
      router.push('/');
      return;
    }
    fetchAll();
  }, [user, token]);

  const fetchAll = async () => {
    try {
      setLoadingData(true);
      setError(null);

      // Get my teams then derive name of this team
      const teamsRes = await fetch(`${apiUrl}/teams`, { headers: { Authorization: `Bearer ${token}` } });
      if (teamsRes.ok) {
        const tjson = await teamsRes.json();
        const t = (tjson.data || []).find((x: any) => x.id === teamId);
        if (t && t.name) setTeamName(t.name);
      }

      const memRes = await fetch(`${apiUrl}/teams/${teamId}/members`, { headers: { Authorization: `Bearer ${token}` } });
      if (!memRes.ok) throw new Error('No se pudieron cargar los miembros');
      const mjson = await memRes.json();
      setMembers(mjson.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar equipo');
    } finally {
      setLoadingData(false);
    }
  };

  const openLinkModal = async () => {
    if (!token) return;
    setLinkModalOpen(true);
    try {
      const res = await fetch(`${apiUrl}/teams/${teamId}/advisors`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdvisorCandidates(data.data || []);
      } else {
        setAdvisorCandidates([]);
      }
    } catch {
      setAdvisorCandidates([]);
    }
  };

  const inviteAdvisor = async (inviteeId: string) => {
    if (!token) return;
    try {
      setInviteLoading(inviteeId);
      const res = await fetch(`${apiUrl}/teams/${teamId}/invitations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: inviteeId })
      });
      if (res.ok) {
        setAdvisorCandidates(prev => prev.filter(a => a.id !== inviteeId));
      }
    } finally {
      setInviteLoading(null);
    }
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
        <div className="flex items-center justify-between">
          <Text weight="medium" className="text-xl">{teamName}</Text>
          <Stack direction="row" gap="sm">
            <Button variant="secondary" onClick={() => router.push('/teams')}>Volver</Button>
            <Button onClick={openLinkModal}>Vincular asesores</Button>
          </Stack>
        </div>

        {error && (
          <Card>
            <CardContent>
              <Text color="danger">{error}</Text>
            </CardContent>
          </Card>
        )}

        <div>
          <Heading level={3} className="mb-4">Miembros del Equipo</Heading>
          {members.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <Text color="secondary" className="text-center">No hay miembros en este equipo.</Text>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((member) => (
                <Card 
                  key={member.id} 
                  className="rounded-md border border-border hover:border-border-hover hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => router.push(`/teams/${teamId}/member/${member.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Text weight="medium" className="text-sm truncate">
                            {member.fullName || member.email}
                          </Text>
                          <Badge variant="default" className="text-xs px-1.5 py-0.5">
                            {member.role}
                          </Badge>
                        </div>
                        <Text size="sm" color="secondary" className="truncate">
                          {member.email}
                        </Text>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-shrink-0 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/contacts?advisorId=${member.id}`);
                        }}
                      >
                        Ver CRM
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Modal vincular asesores */}
        <Modal open={linkModalOpen} onOpenChange={setLinkModalOpen}>
          <ModalHeader>
            <ModalTitle>Vincular asesores a {teamName}</ModalTitle>
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
              <Button variant="secondary" onClick={() => setLinkModalOpen(false)}>Cerrar</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Stack>
    </div>
  );
}


