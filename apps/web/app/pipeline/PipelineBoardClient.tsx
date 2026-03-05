'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { moveContactToStage } from '@/lib/api';
import { usePageTitle } from '../components/PageTitleContext';
import { usePipelineBoard } from '../../lib/api-hooks';
import { logger, toLogContext } from '../../lib/logger';
import type { ApiResponse } from '../../lib/api-client';
import type { PipelineStageWithContacts } from '@/types';
import { ConfirmDialog } from '@maatwork/ui';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Badge,
  EmptyState,
  Alert,
  Spinner,
  Icon,
} from '@maatwork/ui';

// Alias para simplificar el código
type PipelineStage = PipelineStageWithContacts;

interface PipelineBoardClientProps {
  initialStages?: PipelineStageWithContacts[];
  initialError?: string | null;
}

function PipelineBoardClient({ initialStages, initialError }: PipelineBoardClientProps) {
  usePageTitle('Pipeline de Ventas');
  const router = useRouter();

  // AI_DECISION: Use SWR with fallbackData for server-side initial data
  // Justificación: Maintains revalidation after mutations while using server-fetched initial data
  // Impacto: Faster initial load with server data, automatic revalidation for updates
  const {
    stages,
    error,
    isLoading: dataLoading,
    mutate: mutateBoard,
  } = usePipelineBoard(
    initialStages
      ? ({ data: initialStages, success: true } as ApiResponse<PipelineStageWithContacts[]>)
      : undefined
  );

  // Animation state for page transitions
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const [draggingOverStageId, setDraggingOverStageId] = useState<string | null>(null);
  const [movingContactId, setMovingContactId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    contactId: string | null;
    contactName: string | null;
    targetStageId: string | null;
  }>({ open: false, contactId: null, contactName: null, targetStageId: null });

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    e.dataTransfer.setData('text/plain', contactId);
    setMovingContactId(contactId);
    setMoveError(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDraggingOverStageId(stageId);
  };

  const handleDragLeave = () => {
    setDraggingOverStageId(null);
  };

  const performMove = useCallback(
    async (contactId: string, targetStageId: string) => {
      if (!Array.isArray(stages)) {
        setMovingContactId(null);
        return;
      }

      // Encontrar el contacto y su etapa actual
      const sourceStage = (stages as PipelineStage[]).find(
        (stage: PipelineStage) =>
          Array.isArray(stage.contacts) &&
          stage.contacts.some((contact: { id: string }) => contact.id === contactId)
      );

      if (!sourceStage || sourceStage.id === targetStageId) {
        setMovingContactId(null);
        return;
      }

      try {
        await moveContactToStage(contactId, targetStageId);

        // Optimistic update: actualizar el estado local inmediatamente
        const movedContact = Array.isArray(sourceStage.contacts)
          ? sourceStage.contacts.find((contact: { id: string }) => contact.id === contactId)
          : null;
        const updatedStages = (stages as PipelineStage[]).map((stage: PipelineStage) => {
          if (stage.id === sourceStage.id) {
            return {
              ...stage,
              contacts: stage.contacts.filter(
                (contact: { id: string }) => contact.id !== contactId
              ),
              currentCount: stage.currentCount - 1,
            };
          } else if (stage.id === targetStageId) {
            return {
              ...stage,
              contacts: [...stage.contacts, movedContact!],
              currentCount: stage.currentCount + 1,
            };
          }
          return stage;
        });

        // Actualizar cache de SWR optimistically
        mutateBoard({ data: updatedStages } as ApiResponse<PipelineStage[]>, false);

        // Revalidar en background para asegurar consistencia
        mutateBoard();
      } catch (err) {
        logger.error(
          toLogContext({
            err: err instanceof Error ? err.message : String(err),
            contactId,
            targetStageId,
          }),
          'Error moving contact'
        );
        setMoveError(err instanceof Error ? err.message : 'Error al mover contacto');
        // Revalidar en caso de error para restaurar estado correcto
        mutateBoard();
      } finally {
        setMovingContactId(null);
      }
    },
    [stages, mutateBoard]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStageId: string) => {
      e.preventDefault();
      setDraggingOverStageId(null);

      const contactId = e.dataTransfer.getData('text/plain');
      if (!contactId) return;

      if (!Array.isArray(stages)) {
        setMovingContactId(null);
        return;
      }

      // Encontrar el contacto y su etapa actual
      const sourceStage = (stages as PipelineStage[]).find(
        (stage: PipelineStage) =>
          Array.isArray(stage.contacts) &&
          stage.contacts.some((contact: { id: string }) => contact.id === contactId)
      );

      if (!sourceStage || sourceStage.id === targetStageId) {
        setMovingContactId(null);
        return;
      }

      // Verificar límite WIP
      const targetStage = (stages as PipelineStage[]).find(
        (stage: PipelineStage) => stage.id === targetStageId
      );
      if (targetStage?.wipLimit && targetStage.currentCount >= targetStage.wipLimit) {
        setMoveError(
          `No se puede mover el contacto. El límite WIP de "${targetStage.name}" ha sido alcanzado (${targetStage.wipLimit}).`
        );
        setMovingContactId(null);
        return;
      }

      // Verificar si la etapa destino es "Cliente"
      if (targetStage && targetStage.name === 'Cliente') {
        // Encontrar el contacto para obtener su nombre
        const contact = Array.isArray(sourceStage.contacts)
          ? sourceStage.contacts.find((c: { id: string; fullName?: string }) => c.id === contactId)
          : null;

        const contactName =
          contact && 'fullName' in contact && contact.fullName ? contact.fullName : 'este contacto';

        // Mostrar confirmación antes de mover a Cliente
        setConfirmDialog({
          open: true,
          contactId,
          contactName,
          targetStageId,
        });
        return;
      }

      // Movimiento normal sin confirmación
      await performMove(contactId, targetStageId);
    },
    [stages, performMove]
  );

  const handleConfirmMove = useCallback(async () => {
    if (!confirmDialog.contactId || !confirmDialog.targetStageId) return;

    const { contactId, targetStageId } = confirmDialog;
    setConfirmDialog({ open: false, contactId: null, contactName: null, targetStageId: null });

    await performMove(contactId, targetStageId);
  }, [confirmDialog, performMove]);

  const getWipLimitStatus = (stage: PipelineStage) => {
    if (!stage.wipLimit) return null;

    const percentage = (stage.currentCount / stage.wipLimit) * 100;
    if (percentage >= 100) return 'error';
    if (percentage >= 80) return 'warning';
    return 'success';
  };

  // Use initialError if available, otherwise use SWR error
  const displayError =
    initialError || (error instanceof Error ? error.message : error ? String(error) : null);

  if (dataLoading && !initialStages) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Stack direction="column" gap="md" align="center">
          <Spinner size="lg" />
          <Text color="secondary">Cargando pipeline...</Text>
        </Stack>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
      <Stack direction="column" gap="lg">
        {/* Alerts */}
        {displayError && (
          <Alert variant="error" title="Error">
            {displayError}
          </Alert>
        )}

        {moveError && (
          <Alert variant="error" title="Error al mover contacto">
            {moveError}
            <Button variant="ghost" size="sm" onClick={() => setMoveError(null)} className="ml-2">
              <Icon name="X" size={16} />
            </Button>
          </Alert>
        )}

        {/* Help text for drag & drop */}
        {Array.isArray(stages) && stages.length > 0 && (
          <div className="bg-info-subtle border border-info/20 rounded-lg p-3 animate-enter">
            <Stack direction="row" gap="sm" align="center">
              <Icon name="Info" size={16} className="text-info shrink-0" />
              <Text size="sm" color="secondary">
                <strong>Tip:</strong> Arrastra contactos entre columnas para cambiar su etapa en el
                pipeline
              </Text>
            </Stack>
          </div>
        )}

        {/* Funnel de conversión */}
        {Array.isArray(stages) && stages.length > 0 && (
          <Card className="animate-enter" style={{ transitionDelay: '50ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Text size="sm" weight="medium" color="secondary" className="shrink-0">
                  Funnel:
                </Text>
                {(stages as PipelineStage[])
                  .sort((a: PipelineStage, b: PipelineStage) => a.order - b.order)
                  .map((stage: PipelineStage, index: number) => (
                    <React.Fragment key={stage.id}>
                      <div className="text-center">
                        <Text size="lg" weight="bold" style={{ color: stage.color }}>
                          {stage.currentCount}
                        </Text>
                        <Text size="xs" color="secondary" className="block">
                          {stage.name}
                        </Text>
                      </div>
                      {index < (stages as PipelineStage[]).length - 1 && (
                        <Icon name="ChevronRight" size={16} className="text-text-muted shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pipeline Board */}
        {!Array.isArray(stages) || stages.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                title="No hay etapas configuradas"
                description="Configura las etapas del pipeline para comenzar a organizar tus contactos."
                animated
                floatingIcon
              />
            </CardContent>
          </Card>
        ) : (
          <div
            className={`flex gap-6 overflow-x-auto pb-4 transition-all duration-500 ease-out ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            {Array.isArray(stages) &&
              (stages as PipelineStage[])
                .sort((a: PipelineStage, b: PipelineStage) => a.order - b.order)
                .map((stage: PipelineStage, stageIndex: number) => (
                  <div
                    key={stage.id}
                    className={`transition-all duration-500 ease-out ${
                      mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                    style={{ transitionDelay: `${150 + stageIndex * 75}ms` }}
                  >
                    <Card
                      className={`min-w-[280px] flex-shrink-0 hover-lift-glow transition-all duration-200 ${
                        draggingOverStageId === stage.id
                          ? 'ring-4 ring-primary/50 ring-dashed bg-primary/10 border-2 border-primary border-dashed scale-[1.02]'
                          : ''
                      }`}
                      onDragOver={(e: React.DragEvent) => handleDragOver(e, stage.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e: React.DragEvent) => handleDrop(e, stage.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
                          {stage.wipLimit && (
                            <Badge
                              variant={
                                getWipLimitStatus(stage) === 'error'
                                  ? 'error'
                                  : getWipLimitStatus(stage) === 'warning'
                                    ? 'warning'
                                    : 'default'
                              }
                            >
                              {stage.currentCount}/{stage.wipLimit}
                            </Badge>
                          )}
                        </div>
                        {stage.description && (
                          <Text size="sm" color="secondary">
                            {stage.description}
                          </Text>
                        )}
                      </CardHeader>

                      <CardContent className="pt-0">
                        <Stack direction="column" gap="sm" className="min-h-[200px]">
                          {!Array.isArray(stage.contacts) || stage.contacts.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-center p-4">
                              <Stack direction="column" gap="xs" align="center">
                                <Text size="sm" color="secondary">
                                  {stage.currentCount === 0 && stage.wipLimit
                                    ? `Arrastra contactos aquí (${stage.currentCount}/${stage.wipLimit})`
                                    : 'Arrastra contactos aquí'}
                                </Text>
                                {stage.wipLimit && stage.currentCount >= stage.wipLimit && (
                                  <Text size="xs" color="secondary">
                                    Límite WIP alcanzado
                                  </Text>
                                )}
                              </Stack>
                            </div>
                          ) : (
                            (
                              stage.contacts as Array<{
                                id: string;
                                fullName: string;
                                email?: string;
                                nextStep?: string;
                                tags?: Array<{ id: string; name: string; color: string }>;
                              }>
                            ).map(
                              (contact: {
                                id: string;
                                fullName: string;
                                email?: string;
                                nextStep?: string;
                                tags?: Array<{ id: string; name: string; color: string }>;
                              }) => (
                                <Card
                                  key={contact.id}
                                  variant="interactive"
                                  className={`cursor-move transition-all hover:shadow-md ${
                                    movingContactId === contact.id ? 'opacity-50' : ''
                                  }`}
                                  draggable
                                  onDragStart={(e: React.DragEvent) =>
                                    handleDragStart(e, contact.id)
                                  }
                                >
                                  <CardContent className="p-3">
                                    <Stack direction="column" gap="sm">
                                      <div className="min-w-0">
                                        <Text weight="medium" size="sm" className="truncate block">
                                          {contact.fullName}
                                        </Text>

                                        {contact.email && (
                                          <Text size="xs" color="secondary" className="truncate block">
                                            {contact.email}
                                          </Text>
                                        )}

                                        {contact.nextStep && (
                                          <Text size="xs" color="secondary" className="truncate block mt-1">
                                            {contact.nextStep}
                                          </Text>
                                        )}
                                      </div>

                                      {contact.tags && contact.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {contact.tags
                                            .slice(0, 2)
                                            .map(
                                              (tag: {
                                                id: string;
                                                name: string;
                                                color: string;
                                              }) => (
                                                <Badge
                                                  key={tag.id}
                                                  variant="default"
                                                  className="text-xs"
                                                  style={{
                                                    backgroundColor: tag.color,
                                                    color: 'white',
                                                  }}
                                                >
                                                  {tag.name}
                                                </Badge>
                                              )
                                            )}
                                          {contact.tags.length > 2 && (
                                            <Badge variant="default" className="text-xs">
                                              +{contact.tags.length - 2}
                                            </Badge>
                                          )}
                                        </div>
                                      )}

                                      <div className="flex justify-end mt-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => router.push(`/contacts/${contact.id}`)}
                                        >
                                          <Icon name="ChevronRight" size={12} />
                                        </Button>
                                      </div>
                                    </Stack>
                                  </CardContent>
                                </Card>
                              )
                            )
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </div>
                ))}
          </div>
        )}

        {/* Stats */}
        {Array.isArray(stages) && stages.length > 0 && (
          <div
            className={`transition-all duration-500 ease-out ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas del Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(stages as PipelineStage[]).map((stage: PipelineStage) => (
                    <div key={stage.id} className="text-center">
                      <Text size="lg" weight="bold" style={{ color: stage.color }}>
                        {stage.currentCount}
                      </Text>
                      <Text size="sm" color="secondary">
                        {stage.name}
                      </Text>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Stack>

      {/* Diálogo de confirmación para etapa Cliente */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open: boolean) =>
          setConfirmDialog({
            open,
            contactId: confirmDialog.contactId,
            contactName: confirmDialog.contactName,
            targetStageId: confirmDialog.targetStageId,
          })
        }
        onConfirm={handleConfirmMove}
        title="Confirmar cambio a Cliente"
        description={
          confirmDialog.contactName
            ? `¿Estás seguro de que deseas mover a "${confirmDialog.contactName}" a la etapa Cliente? Se enviará un webhook de bienvenida automáticamente.`
            : '¿Estás seguro de que deseas mover este contacto a la etapa Cliente? Se enviará un webhook de bienvenida automáticamente.'
        }
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        variant="default"
      />
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
// This is important because this component renders many items and can re-render frequently
const MemoizedPipelineBoardClient = React.memo(PipelineBoardClient);

export default MemoizedPipelineBoardClient;
