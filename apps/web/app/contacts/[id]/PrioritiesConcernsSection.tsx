"use client";
import React, { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Text, Button, Input, Modal, ModalHeader, ModalContent, ModalTitle, ModalFooter } from '@cactus/ui';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import SortableList from './SortableList';

interface PrioritiesConcernsSectionProps {
  contactId: string;
  prioridades: string[];
  preocupaciones: string[];
}

/**
 * PrioritiesConcernsSection - Sección para gestionar prioridades y preocupaciones ordenables
 */
export default function PrioritiesConcernsSection({
  contactId,
  prioridades,
  preocupaciones
}: PrioritiesConcernsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localPrioridades, setLocalPrioridades] = useState<string[]>(prioridades || []);
  const [localPreocupaciones, setLocalPreocupaciones] = useState<string[]>(preocupaciones || []);
  
  const [showAddPriorityModal, setShowAddPriorityModal] = useState(false);
  const [showAddConcernModal, setShowAddConcernModal] = useState(false);
  const [newPriority, setNewPriority] = useState('');
  const [newConcern, setNewConcern] = useState('');

  const updateField = async (field: 'prioridades' | 'preocupaciones', value: string[]) => {
    startTransition(async () => {
      try {
        const { updateContactField } = await import('./actions');
        await updateContactField(contactId, field, value);
        router.refresh();
      } catch (err) {
        logger.error('Error updating priorities/concerns', { err, contactId, field, value });
      }
    });
  };

  const handleAddPriority = () => {
    if (newPriority.trim()) {
      const updated = [...localPrioridades, newPriority.trim()];
      setLocalPrioridades(updated);
      updateField('prioridades', updated);
      setNewPriority('');
      setShowAddPriorityModal(false);
    }
  };

  const handleAddConcern = () => {
    if (newConcern.trim()) {
      const updated = [...localPreocupaciones, newConcern.trim()];
      setLocalPreocupaciones(updated);
      updateField('preocupaciones', updated);
      setNewConcern('');
      setShowAddConcernModal(false);
    }
  };

  const handleEditPriority = (index: number, value: string) => {
    const updated = [...localPrioridades];
    updated[index] = value;
    setLocalPrioridades(updated);
    updateField('prioridades', updated);
  };

  const handleEditConcern = (index: number, value: string) => {
    const updated = [...localPreocupaciones];
    updated[index] = value;
    setLocalPreocupaciones(updated);
    updateField('preocupaciones', updated);
  };

  const handleDeletePriority = (index: number) => {
    const updated = localPrioridades.filter((_, i) => i !== index);
    setLocalPrioridades(updated);
    updateField('prioridades', updated);
  };

  const handleDeleteConcern = (index: number) => {
    const updated = localPreocupaciones.filter((_, i) => i !== index);
    setLocalPreocupaciones(updated);
    updateField('preocupaciones', updated);
  };

  const handlePrioritiesReorder = (items: string[]) => {
    setLocalPrioridades(items);
    updateField('prioridades', items);
  };

  const handleConcernsReorder = (items: string[]) => {
    setLocalPreocupaciones(items);
    updateField('preocupaciones', items);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Prioridades y Preocupaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Prioridades */}
            <div>
              <Text size="sm" weight="medium" color="secondary" className="mb-3 block">
                Prioridades
              </Text>
              <SortableList
                items={localPrioridades}
                onItemsChange={handlePrioritiesReorder}
                onAdd={() => setShowAddPriorityModal(true)}
                onEdit={handleEditPriority}
                onDelete={handleDeletePriority}
                placeholder="Agregar prioridad..."
                emptyMessage="No hay prioridades"
              />
            </div>

            {/* Preocupaciones */}
            <div>
              <Text size="sm" weight="medium" color="secondary" className="mb-3 block">
                Preocupaciones
              </Text>
              <SortableList
                items={localPreocupaciones}
                onItemsChange={handleConcernsReorder}
                onAdd={() => setShowAddConcernModal(true)}
                onEdit={handleEditConcern}
                onDelete={handleDeleteConcern}
                placeholder="Agregar preocupación..."
                emptyMessage="No hay preocupaciones"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal para agregar prioridad */}
      <Modal
        open={showAddPriorityModal}
        onOpenChange={setShowAddPriorityModal}
      >
        <ModalHeader>
          <ModalTitle>Agregar Prioridad</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <Input
              label="Prioridad"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              placeholder="Ingresa una prioridad..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddPriority();
                }
              }}
              autoFocus
            />
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setShowAddPriorityModal(false);
              setNewPriority('');
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddPriority}
            disabled={!newPriority.trim()}
          >
            Agregar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal para agregar preocupación */}
      <Modal
        open={showAddConcernModal}
        onOpenChange={setShowAddConcernModal}
      >
        <ModalHeader>
          <ModalTitle>Agregar Preocupación</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <Input
              label="Preocupación"
              value={newConcern}
              onChange={(e) => setNewConcern(e.target.value)}
              placeholder="Ingresa una preocupación..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddConcern();
                }
              }}
              autoFocus
            />
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setShowAddConcernModal(false);
              setNewConcern('');
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddConcern}
            disabled={!newConcern.trim()}
          >
            Agregar
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

