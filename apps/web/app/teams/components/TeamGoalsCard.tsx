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
  Icon,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Input,
  Select,
} from '@maatwork/ui';
import { apiClient } from '@/lib/api-client';
import type { TeamGoal } from '@/types';

interface TeamGoalsCardProps {
  teamId: string;
}

export default function TeamGoalsCard({ teamId }: TeamGoalsCardProps) {
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editType, setEditType] = useState('new_prospects');
  const [editTarget, setEditTarget] = useState('0');

  useEffect(() => {
    fetchGoals();
  }, [teamId]);

  const fetchGoals = async () => {
    try {
      const res = await apiClient.get<TeamGoal[]>(`/v1/teams/${teamId}/goals`);
      if (res.success && res.data) {
        setGoals(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch goals', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async () => {
    try {
      const today = new Date();
      await apiClient.post(`/v1/teams/${teamId}/goals`, {
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        type: editType,
        target: Number(editTarget),
      });
      setIsEditing(false);
      fetchGoals();
    } catch (err) {
      alert('Error updating goal');
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'new_prospects':
        return 'Nuevos Prospectos';
      case 'tasks_completed':
        return 'Tareas Completadas';
      case 'total_aum':
        return 'AUM Total';
      default:
        return type;
    }
  };

  const formatValue = (type: string, val: number) => {
    if (type.includes('aum')) {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(val);
    }
    return val.toString();
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Objetivos del Mes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Icon name="edit" size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Stack direction="column" gap="md">
          {goals.map((goal) => {
            const percent = goal.target > 0 ? Math.min((goal.actual / goal.target) * 100, 100) : 0;
            return (
              <div key={goal.type}>
                <div className="flex justify-between mb-1">
                  <Text size="sm">{getLabel(goal.type)}</Text>
                  <Text size="sm" color="secondary">
                    {formatValue(goal.type, goal.actual)} / {formatValue(goal.type, goal.target)}
                  </Text>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </Stack>
      </CardContent>

      <Modal open={isEditing} onOpenChange={setIsEditing}>
        <ModalHeader>
          <ModalTitle>Editar Objetivo</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <Stack direction="column" gap="md">
            <div>
              <Text className="mb-2 block">Métrica</Text>
              <Select
                value={editType}
                onValueChange={(val) => {
                  setEditType(val);
                  const existing = goals.find((g) => g.type === val);
                  setEditTarget(existing ? String(existing.target) : '0');
                }}
                items={[
                  { label: 'Nuevos Prospectos', value: 'new_prospects' },
                  { label: 'Tareas Completadas', value: 'tasks_completed' },
                  { label: 'AUM Total', value: 'total_aum' },
                ]}
              />
            </div>
            <Input
              label="Objetivo Mensual"
              type="number"
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
            />
          </Stack>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateGoal}>Guardar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
}
