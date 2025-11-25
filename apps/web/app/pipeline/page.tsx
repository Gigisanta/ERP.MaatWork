"use client";
import { useRequireAuth } from '../auth/useRequireAuth';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { moveContactToStage } from '@/lib/api';
import { usePipelineBoard } from '../../lib/api-hooks';
import { logger } from '../../lib/logger';
import { usePageTitle } from '../components/PageTitleContext';
import type { ApiResponse } from '../../lib/api-client';
import type { PipelineStageWithContacts } from '@/types';
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
  EmptyState,
  Alert,
  Spinner,
  Icon,
} from '@cactus/ui';

// Alias para simplificar el código
type PipelineStage = PipelineStageWithContacts;

export default function PipelinePage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  
  // Set page title in header
  usePageTitle('Pipeline de Ventas');
  
  // AI_DECISION: Migrate from useState+useEffect to SWR hook
  // Justificación: Eliminates redundant requests, provides automatic caching and revalidation
  // Impacto: Reduces API load, improves perceived performance with instant cache hits
  const { stages, error, isLoading: dataLoading, mutate: mutateBoard } = usePipelineBoard();
  const [draggingOverStageId, setDraggingOverStageId] = useState<string | null>(null);
  const [movingContactId, setMovingContactId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

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

  const handleDrop = useCallback(async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDraggingOverStageId(null);
    
    const contactId = e.dataTransfer.getData('text/plain');
    if (!contactId) return;

    if (!Array.isArray(stages)) {
      setMovingContactId(null);
      return;
    }

    // Encontrar el contacto y su etapa actual
    const sourceStage = (stages as PipelineStage[]).find((stage: PipelineStage) => 
      Array.isArray(stage.contacts) && stage.contacts.some((contact: { id: string }) => contact.id === contactId)
    );
    
    if (!sourceStage || sourceStage.id === targetStageId) {
      setMovingContactId(null);
      return;
    }

    // Verificar límite WIP
    const targetStage = (stages as PipelineStage[]).find((stage: PipelineStage) => stage.id === targetStageId);
    if (targetStage?.wipLimit && targetStage.currentCount >= targetStage.wipLimit) {
      setMoveError(`No se puede mover el contacto. El límite WIP de "${targetStage.name}" ha sido alcanzado (${targetStage.wipLimit}).`);
      setMovingContactId(null);
      return;
    }

    try {
      await moveContactToStage(contactId, targetStageId);

      // Optimistic update: actualizar el estado local inmediatamente
      const movedContact = Array.isArray(sourceStage.contacts) ? sourceStage.contacts.find((contact: { id: string }) => contact.id === contactId) : null;
      const updatedStages = (stages as PipelineStage[]).map((stage: PipelineStage) => {
        if (stage.id === sourceStage.id) {
          return {
            ...stage,
            contacts: stage.contacts.filter((contact: { id: string }) => contact.id !== contactId),
            currentCount: stage.currentCount - 1
          };
        } else if (stage.id === targetStageId) {
          return {
            ...stage,
            contacts: [...stage.contacts, movedContact!],
            currentCount: stage.currentCount + 1
          };
        }
        return stage;
      });
      
      // Actualizar cache de SWR optimistically
      mutateBoard({ data: updatedStages } as ApiResponse<PipelineStage[]>, false);
      
      // Revalidar en background para asegurar consistencia
      mutateBoard();
    } catch (err) {
      logger.error('Error moving contact', { err: err instanceof Error ? err.message : String(err), contactId, targetStageId });
      setMoveError(err instanceof Error ? err.message : 'Error al mover contacto');
      // Revalidar en caso de error para restaurar estado correcto
      mutateBoard();
    } finally {
      setMovingContactId(null);
    }
  }, [stages, mutateBoard]);

  const getWipLimitStatus = (stage: PipelineStage) => {
    if (!stage.wipLimit) return null;
    
    const percentage = (stage.currentCount / stage.wipLimit) * 100;
    if (percentage >= 100) return 'error';
    if (percentage >= 80) return 'warning';
    return 'success';
  };

  if (loading) {
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
    <div className="p-4 md:p-8">
      <Stack direction="column" gap="lg">
        {/* Alerts */}
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}
        
        {moveError && (
          <Alert variant="error" title="Error al mover contacto">
            {moveError}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMoveError(null)}
              className="ml-2"
            >
              <Icon name="X" size={16} />
            </Button>
          </Alert>
        )}

        {/* Pipeline Board */}
        {!Array.isArray(stages) || stages.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState 
                title="No hay etapas configuradas"
                description="Configura las etapas del pipeline para comenzar a organizar tus contactos."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {Array.isArray(stages) && (stages as PipelineStage[])
              .sort((a: PipelineStage, b: PipelineStage) => a.order - b.order)
              .map((stage: PipelineStage) => (
                <Card 
                  key={stage.id}
                  className={`min-w-[280px] flex-shrink-0 ${
                    draggingOverStageId === stage.id 
                      ? 'ring-2 ring-accent-base bg-accent-subtle' 
                      : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {stage.name}
                      </CardTitle>
                      {stage.wipLimit && (
                        <Badge 
                          variant={getWipLimitStatus(stage) === 'error' ? 'error' : 
                                  getWipLimitStatus(stage) === 'warning' ? 'warning' : 'default'}
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
                                : "Arrastra contactos aquí"}
                            </Text>
                            {stage.wipLimit && stage.currentCount >= stage.wipLimit && (
                              <Text size="xs" color="error">
                                Límite WIP alcanzado
                              </Text>
                            )}
                          </Stack>
                        </div>
                      ) : (
                        (stage.contacts as Array<{ id: string; fullName: string; email?: string; nextStep?: string; tags?: Array<{ id: string; name: string; color: string }> }>).map((contact: { id: string; fullName: string; email?: string; nextStep?: string; tags?: Array<{ id: string; name: string; color: string }> }) => (
                          <Card 
                            key={contact.id}
                            variant="interactive"
                            className={`cursor-move transition-all hover:shadow-md ${
                              movingContactId === contact.id ? 'opacity-50' : ''
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, contact.id)}
                          >
                            <CardContent className="p-3">
                              <Stack direction="column" gap="sm">
                                <Text weight="medium" size="sm">
                                  {contact.fullName}
                                </Text>
                                
                                {contact.email && (
                                  <Text size="xs" color="secondary">
                                    {contact.email}
                                  </Text>
                                )}
                                
                                {contact.nextStep && (
                                  <Text size="xs" color="secondary">
                                    {contact.nextStep}
                                  </Text>
                                )}
                                
                                    {contact.tags && contact.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {contact.tags.slice(0, 2).map((tag: { id: string; name: string; color: string }) => (
                                      <Badge 
                                        key={tag.id} 
                                        variant="default" 
                                        className="text-xs"
                                        style={{ backgroundColor: tag.color, color: 'white' }}
                                      >
                                        {tag.name}
                                      </Badge>
                                    ))}
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
                        ))
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Stats */}
        {Array.isArray(stages) && stages.length > 0 && (
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
        )}
      </Stack>
    </div>
  );
}