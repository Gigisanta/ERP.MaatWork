'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  DataTable,
  type Column,
  Select,
} from '@cactus/ui';
import { apiClient } from '@/lib/api-client';
import { getTeamMembers } from '@/lib/api/teams';
import type { TeamMember, StalledLead } from '@/types/team';

interface LeadDistributionPanelProps {
  teamId: string;
}

export default function LeadDistributionPanel({ teamId }: LeadDistributionPanelProps) {
  const [stalledLeads, setStalledLeads] = useState<StalledLead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [targetAdvisor, setTargetAdvisor] = useState<string>('');

  useEffect(() => {
    Promise.all([fetchStalledLeads(), fetchMembers()]).finally(() => setLoading(false));
  }, [teamId]);

  const fetchStalledLeads = async () => {
    try {
      const res = await apiClient.get<StalledLead[]>(
        `/v1/teams/${teamId}/leads/unassigned?type=stalled`
      );
      setStalledLeads(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMembers = async () => {
    const res = await getTeamMembers(teamId);
    if (res.success) setTeamMembers(res.data || []);
  };

  const handleReassign = async () => {
    if (!targetAdvisor || selectedLeads.length === 0) return;
    try {
      await apiClient.post(`/v1/teams/${teamId}/leads/reassign`, {
        contactIds: selectedLeads,
        newAdvisorId: targetAdvisor,
      });
      alert('Reassigned successfully');
      setSelectedLeads([]);
      fetchStalledLeads();
    } catch (err) {
      alert('Error reassigning');
    }
  };

  const columns: Column<StalledLead>[] = [
    {
      key: 'select',
      header: '',
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedLeads.includes(item.id)}
          onChange={(e) => {
            if (e.target.checked) setSelectedLeads([...selectedLeads, item.id]);
            else setSelectedLeads(selectedLeads.filter((id) => id !== item.id));
          }}
        />
      ),
    },
    { key: 'fullName', header: 'Nombre' },
    {
      key: 'contactLastTouchAt',
      header: 'Último Contacto',
      render: (item) =>
        item.contactLastTouchAt ? new Date(item.contactLastTouchAt).toLocaleDateString() : 'N/A',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Leads</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="stalled">
          <TabsList>
            <TabsTrigger value="stalled">Leads Estancados ({stalledLeads.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="stalled">
            <Stack direction="column" gap="md">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Text className="mb-1 block">Reasignar seleccionados a:</Text>
                  <Select
                    value={targetAdvisor}
                    onValueChange={(val) => setTargetAdvisor(val)}
                    items={teamMembers.map((m) => ({
                      label: m.fullName || m.email || 'Unknown',
                      value: m.userId,
                    }))}
                    placeholder="Seleccionar Asesor"
                  />
                </div>
                <Button
                  onClick={handleReassign}
                  disabled={!targetAdvisor || selectedLeads.length === 0}
                >
                  Reasignar
                </Button>
              </div>
              <DataTable
                data={stalledLeads as unknown as Record<string, unknown>[]}
                columns={columns as unknown as Column<Record<string, unknown>>[]}
                keyField="id"
              />
            </Stack>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
