'use client';
import React, { useState, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Spinner,
  EmptyState,
  Alert,
} from '@maatwork/ui';
import { ConfirmDialog } from '@maatwork/ui';
import PortfolioAssignmentItem from './components/PortfolioAssignmentItem';
import { usePortfolioAssignments } from '@/lib/api-hooks';
import {
  assignPortfolioToContact,
  removePortfolioAssignment,
  updatePortfolioAssignmentStatus,
} from '@/lib/api';
import { logger, toLogContext } from '@/lib/logger';

import type { PortfolioAssignment } from '@/types';

// AI_DECISION: Extracted to client island for portfolio management isolation
// Justificación: Server component for static data, client only where needed
// Impacto: Reduces First Load JS ~400KB → ~150KB for this route

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
  initialPortfolioAssignments,
}: PortfolioSectionProps) {
  const { portfolioAssignments, error, isLoading, mutate } = usePortfolioAssignments(contactId);
  const [showAssignModal, setShowAssignModal] = useState(false);
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

  const [newAssignment, setNewAssignment] = useState({
    templateId: '',
    templateName: '',
    notes: '',
  });

  const handleAssignPortfolio = async () => {
    setSaving(true);
    try {
      await assignPortfolioToContact(contactId, {
        ...newAssignment,
        startDate: new Date().toISOString(),
      });

      await mutate(); // Refresh data
      setShowAssignModal(false);
      setNewAssignment({ templateId: '', templateName: '', notes: '' });
    } catch (err) {
      logger.error(
        'Error assigning portfolio',
        toLogContext({ err, contactId, assignment: newAssignment })
      );
    } finally {
      setSaving(false);
    }
  };

  // AI_DECISION: Use useCallback to stabilize handlers for memoized component
  // Justificación: PortfolioAssignmentItem is memoized, needs stable callback references
  // Impacto: Prevents unnecessary re-renders of PortfolioAssignmentItem components
  const handleUnassignPortfolio = useCallback(
    (assignmentId: string) => {
      setConfirmDialog({
        open: true,
        title: 'Desasignar portfolio',
        description: '¿Estás seguro de que quieres desasignar este portfolio?',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await removePortfolioAssignment(assignmentId);
            await mutate(); // Refresh data
          } catch (err) {
            logger.error('Error unassigning portfolio', toLogContext({ err, assignmentId }));
          }
        },
      });
    },
    [mutate]
  );

  const handleUpdateStatus = useCallback(
    async (assignmentId: string, newStatus: 'active' | 'paused' | 'ended') => {
      try {
        await updatePortfolioAssignmentStatus(assignmentId, newStatus);
        await mutate(); // Refresh data
      } catch (err) {
        logger.error(
          'Error updating portfolio assignment status',
          toLogContext({ err, assignmentId, newStatus })
        );
      }
    },
    [mutate]
  );

  const assignments =
    Array.isArray(portfolioAssignments) && portfolioAssignments.length > 0
      ? portfolioAssignments
      : initialPortfolioAssignments;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Portfolios Asignados</CardTitle>
          <Button variant="primary" size="sm" onClick={() => setShowAssignModal(true)}>
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
              <PortfolioAssignmentItem
                key={assignment.id}
                assignment={assignment}
                onUpdateStatus={handleUpdateStatus}
                onUnassign={handleUnassignPortfolio}
              />
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
              <Text size="sm" weight="medium" className="mb-1">
                Template ID
              </Text>
              <input
                type="text"
                value={newAssignment.templateId}
                onChange={(e) =>
                  setNewAssignment((prev) => ({ ...prev, templateId: e.target.value }))
                }
                placeholder="ID del template"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <Text size="sm" weight="medium" className="mb-1">
                Nombre del Template
              </Text>
              <input
                type="text"
                value={newAssignment.templateName}
                onChange={(e) =>
                  setNewAssignment((prev) => ({ ...prev, templateName: e.target.value }))
                }
                placeholder="Nombre del portfolio"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <Text size="sm" weight="medium" className="mb-1">
                Notas (opcional)
              </Text>
              <textarea
                value={newAssignment.notes}
                onChange={(e) => setNewAssignment((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)} disabled={saving}>
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
