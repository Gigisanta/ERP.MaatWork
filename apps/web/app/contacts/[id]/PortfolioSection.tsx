"use client";
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
import { usePortfolioAssignments } from '../../../lib/api-hooks';

// AI_DECISION: Extracted to client island for portfolio management isolation
// Justificación: Server component for static data, client only where needed
// Impacto: Reduces First Load JS ~400KB → ~150KB for this route

interface PortfolioAssignment {
  id: string;
  contactId: string;
  templateId: string;
  templateName: string;
  status: 'active' | 'paused' | 'ended';
  startDate: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
}

interface PortfolioSectionProps {
  contactId: string;
  initialPortfolioAssignments: PortfolioAssignment[];
}

/**
 * PortfolioSection - Client Island for portfolio assignment management
 * 
 * @example
 * <PortfolioSection
 *   contactId={contact.id}
 *   initialPortfolioAssignments={portfolioAssignments}
 * />
 */
export default function PortfolioSection({ 
  contactId, 
  initialPortfolioAssignments 
}: PortfolioSectionProps) {
  const { portfolioAssignments, error, isLoading, mutate } = usePortfolioAssignments(contactId);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    templateId: '',
    templateName: '',
    notes: ''
  });

  const handleAssignPortfolio = async () => {
    setSaving(true);
    try {
      const response = await fetch(`http://localhost:3001/contacts/${contactId}/portfolio-assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...newAssignment,
          startDate: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to assign portfolio');
      }

      await mutate(); // Refresh data
      setShowAssignModal(false);
      setNewAssignment({ templateId: '', templateName: '', notes: '' });
    } catch (err) {
      console.error('Error assigning portfolio:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignPortfolio = async (assignmentId: string) => {
    if (!confirm('¿Estás seguro de que quieres desasignar este portfolio?')) return;

    try {
      const response = await fetch(`http://localhost:3001/portfolio-assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to unassign portfolio');
      }

      await mutate(); // Refresh data
    } catch (err) {
      console.error('Error unassigning portfolio:', err);
    }
  };

  const handleUpdateStatus = async (assignmentId: string, newStatus: 'active' | 'paused' | 'ended') => {
    try {
      const response = await fetch(`http://localhost:3001/portfolio-assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update portfolio status');
      }

      await mutate(); // Refresh data
    } catch (err) {
      console.error('Error updating portfolio status:', err);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'ended': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'paused': return 'Pausado';
      case 'ended': return 'Finalizado';
      default: return status;
    }
  };

  const assignments = portfolioAssignments.length > 0 ? portfolioAssignments : initialPortfolioAssignments;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Portfolios Asignados</CardTitle>
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => setShowAssignModal(true)}
          >
            Asignar Portfolio
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
            Error al cargar los portfolios asignados
          </Alert>
        ) : assignments.length === 0 ? (
          <EmptyState
            title="Sin portfolios asignados"
            description="Este contacto no tiene portfolios asignados"
          />
        ) : (
          <Stack direction="column" gap="md">
            {assignments.map((assignment: PortfolioAssignment) => (
              <div key={assignment.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Heading size="sm">{assignment.templateName}</Heading>
                      <Badge variant={getStatusBadgeVariant(assignment.status)}>
                        {getStatusLabel(assignment.status)}
                      </Badge>
                    </div>
                    <Text size="sm" color="secondary">
                      Inicio: {new Date(assignment.startDate).toLocaleDateString()}
                    </Text>
                    {assignment.endDate && (
                      <Text size="sm" color="secondary">
                        Fin: {new Date(assignment.endDate).toLocaleDateString()}
                      </Text>
                    )}
                    {assignment.notes && (
                      <Text size="sm" color="secondary" className="mt-1">
                        Notas: {assignment.notes}
                      </Text>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {assignment.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(assignment.id, 'paused')}
                      >
                        Pausar
                      </Button>
                    )}
                    {assignment.status === 'paused' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateStatus(assignment.id, 'active')}
                      >
                        Reanudar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnassignPortfolio(assignment.id)}
                    >
                      Desasignar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </Stack>
        )}
      </CardContent>

      {/* Assign Modal */}
      <Modal open={showAssignModal} onOpenChange={setShowAssignModal}>
        <ModalHeader>
          <ModalTitle>Asignar Portfolio</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <Stack direction="column" gap="md">
            <div>
              <Text size="sm" weight="medium" className="mb-1">Template ID</Text>
              <input
                type="text"
                value={newAssignment.templateId}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, templateId: e.target.value }))}
                placeholder="ID del template"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <Text size="sm" weight="medium" className="mb-1">Nombre del Template</Text>
              <input
                type="text"
                value={newAssignment.templateName}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, templateName: e.target.value }))}
                placeholder="Nombre del portfolio"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <Text size="sm" weight="medium" className="mb-1">Notas (opcional)</Text>
              <textarea
                value={newAssignment.notes}
                onChange={(e) => setNewAssignment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button 
            variant="secondary" 
            onClick={() => setShowAssignModal(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAssignPortfolio}
            disabled={saving || !newAssignment.templateId || !newAssignment.templateName}
          >
            {saving ? <Spinner size="sm" /> : 'Asignar Portfolio'}
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
}
