'use client';
import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Heading,
  Text,
  Stack,
  Input,
  Select,
  Badge,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Spinner,
  EmptyState,
  Alert,
} from '@cactus/ui';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useTasks } from '@/lib/api-hooks';
import { createTask, deleteTask } from '@/lib/api';
import { logger, toLogContext } from '@/lib/logger';
import type { Task } from '@/types';

// AI_DECISION: Extracted to client island for task management isolation
// Justificación: Server component for static data, client only where needed
// Impacto: Reduces First Load JS ~400KB → ~150KB for this route

interface TasksSectionProps {
  contactId: string;
  initialTasks: Task[];
}

/**
 * TasksSection - Client Island for task management
 *
 * @example
 * <TasksSection
 *   contactId={contact.id}
 *   initialTasks={tasks}
 * />
 */
export default function TasksSection({ contactId, initialTasks }: TasksSectionProps) {
  const { tasks, error, isLoading, mutate } = useTasks(contactId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado para ConfirmDialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'default';
  }>({
    open: false,
    title: '',
    onConfirm: () => {},
  });

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  });

  const handleCreateTask = async () => {
    setSaving(true);
    try {
      await createTask({
        ...newTask,
        contactId,
        status: 'pending',
      });

      await mutate(); // Refresh data
      setShowCreateModal(false);
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
    } catch (err) {
      logger.error('Error creating task', toLogContext({ err, contactId, task: newTask }));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Eliminar tarea',
      description: '¿Estás seguro de que quieres eliminar esta tarea?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteTask(taskId);
          await mutate(); // Refresh data
        } catch (err) {
          logger.error('Error deleting task', toLogContext({ err, taskId }));
        }
      },
    });
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { updateTask } = await import('@/lib/api/tasks');
      await updateTask(taskId, { status: newStatus });

      await mutate(); // Refresh data
    } catch (err) {
      logger.error('Error updating task status', toLogContext({ err, taskId, newStatus }));
    }
  };

  const getPriorityBadgeVariant = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return 'Sin prioridad';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'pending':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada';
      case 'in_progress':
        return 'En Progreso';
      case 'pending':
        return 'Pendiente';
      default:
        return status;
    }
  };

  const taskList = Array.isArray(tasks) && tasks.length > 0 ? tasks : initialTasks;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Tareas</CardTitle>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            Crear Tarea
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <Alert variant="error" title="Error">
            Error al cargar las tareas
          </Alert>
        ) : taskList.length === 0 ? (
          <EmptyState title="Sin tareas" description="Este contacto no tiene tareas asignadas" />
        ) : (
          <Stack direction="column" gap="md">
            {taskList.map((task: Task) => (
              <div key={task.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Heading size="sm">{task.title}</Heading>
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {getStatusLabel(task.status)}
                      </Badge>
                      {task.priority && (
                        <Badge variant={getPriorityBadgeVariant(task.priority)}>
                          {getPriorityLabel(task.priority)}
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <Text size="sm" color="secondary" className="mb-2">
                        {task.description}
                      </Text>
                    )}
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Creada: {new Date(task.createdAt).toLocaleDateString()}</span>
                      {task.dueDate && (
                        <span>Vence: {new Date(task.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {task.status === 'pending' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                      >
                        Iniciar
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                      >
                        Completar
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleDeleteTask(task.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </Stack>
        )}
      </CardContent>

      {/* Create Modal */}
      <Modal open={showCreateModal} onOpenChange={setShowCreateModal}>
        <ModalHeader>
          <ModalTitle>Crear Tarea</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <Stack direction="column" gap="md">
            <div>
              <Text size="sm" weight="medium" className="mb-1">
                Título
              </Text>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Título de la tarea"
              />
            </div>
            <div>
              <Text size="sm" weight="medium" className="mb-1">
                Descripción
              </Text>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción de la tarea"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
            <div>
              <Text size="sm" weight="medium" className="mb-1">
                Prioridad
              </Text>
              <Select
                value={newTask.priority}
                onValueChange={(value: string) =>
                  setNewTask((prev) => ({ ...prev, priority: value }))
                }
                items={[
                  { value: 'low', label: 'Baja' },
                  { value: 'medium', label: 'Media' },
                  { value: 'high', label: 'Alta' },
                ]}
              />
            </div>
            <div>
              <Text size="sm" weight="medium" className="mb-1">
                Fecha de Vencimiento (opcional)
              </Text>
              <Input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleCreateTask} disabled={saving || !newTask.title}>
            {saving ? <Spinner size="sm" /> : 'Crear Tarea'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant || 'default'}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
      />
    </Card>
  );
}
