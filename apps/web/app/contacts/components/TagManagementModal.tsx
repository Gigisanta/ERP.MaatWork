/**
 * Tag Management Modal
 *
 * Modal for creating, editing, and deleting tags
 */

import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Button,
  Stack,
  Input,
  Select,
  Text,
  Spinner,
  Icon,
} from '@cactus/ui';
import type { Tag } from '@/types';

export interface TagManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allTags: Tag[];
  // Create tag state
  isCreatingTag: boolean;
  newTagName: string;
  newTagColor: string;
  newTagBusinessLine: 'inversiones' | 'zurich' | 'patrimonial' | null;
  onNewTagNameChange: (name: string) => void;
  onNewTagColorChange: (color: string) => void;
  onNewTagBusinessLineChange: (line: 'inversiones' | 'zurich' | 'patrimonial' | null) => void;
  onCreateTag: () => void;
  onStartCreating: () => void;
  onCancelCreating: () => void;
  // Edit tag state
  tagToEdit: Tag | null;
  editedTagName: string;
  editedTagColor: string;
  editedTagBusinessLine: 'inversiones' | 'zurich' | 'patrimonial' | null;
  isAutoSavingTag: boolean;
  onEditedTagNameChange: (name: string) => void;
  onEditedTagColorChange: (color: string) => void;
  onEditedTagBusinessLineChange: (line: 'inversiones' | 'zurich' | 'patrimonial' | null) => void;
  onEditTag: () => void;
  onOpenEditTag: (tag: Tag) => void;
  onCancelEdit: () => void;
  // Delete
  onDeleteTag: (tagId: string) => void;
}

export default function TagManagementModal({
  open,
  onOpenChange,
  allTags,
  isCreatingTag,
  newTagName,
  newTagColor,
  newTagBusinessLine,
  onNewTagNameChange,
  onNewTagColorChange,
  onNewTagBusinessLineChange,
  onCreateTag,
  onStartCreating,
  onCancelCreating,
  tagToEdit,
  editedTagName,
  editedTagColor,
  editedTagBusinessLine,
  isAutoSavingTag,
  onEditedTagNameChange,
  onEditedTagColorChange,
  onEditedTagBusinessLineChange,
  onEditTag,
  onOpenEditTag,
  onCancelEdit,
  onDeleteTag,
}: TagManagementModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalHeader>
        <ModalTitle>Gestionar Etiquetas</ModalTitle>
        <ModalDescription>
          Edita o elimina etiquetas existentes. Los cambios se aplicarán a todos los contactos.
        </ModalDescription>
      </ModalHeader>
      <ModalContent>
        <Stack direction="column" gap="sm">
          {isCreatingTag ? (
            // Create view
            <>
              <Input
                label="Nombre de la etiqueta"
                value={newTagName}
                onChange={(e) => onNewTagNameChange(e.target.value)}
                placeholder="Ej: Cliente VIP, Prospecto caliente..."
              />
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Color
                </label>
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => onNewTagColorChange(e.target.value)}
                  className="w-full h-10 rounded-md cursor-pointer"
                />
              </div>
              <Select
                label="Línea de negocio"
                value={newTagBusinessLine ?? ''}
                onValueChange={(value) =>
                  onNewTagBusinessLineChange(
                    value === '' ? null : (value as 'inversiones' | 'zurich' | 'patrimonial')
                  )
                }
                items={[
                  { value: '', label: 'Sin categoría' },
                  { value: 'inversiones', label: 'Inversiones' },
                  { value: 'zurich', label: 'Zurich' },
                  { value: 'patrimonial', label: 'Patrimonial' },
                ]}
              />
              <ModalFooter>
                <Button variant="secondary" onClick={onCancelCreating}>
                  Cancelar
                </Button>
                <Button onClick={onCreateTag}>Crear etiqueta</Button>
              </ModalFooter>
            </>
          ) : tagToEdit ? (
            // Edit view
            <>
              {isAutoSavingTag && (
                <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                  <Spinner size="sm" />
                  <Text size="sm" color="secondary">
                    Guardando automáticamente...
                  </Text>
                </div>
              )}
              <Input
                label="Nombre de la etiqueta"
                value={editedTagName}
                onChange={(e) => onEditedTagNameChange(e.target.value)}
                placeholder="Nombre de la etiqueta"
              />
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Color
                </label>
                <input
                  type="color"
                  value={editedTagColor}
                  onChange={(e) => onEditedTagColorChange(e.target.value)}
                  className="w-full h-10 rounded-md cursor-pointer"
                />
              </div>
              <Select
                label="Línea de negocio"
                value={editedTagBusinessLine ?? ''}
                onValueChange={(value) =>
                  onEditedTagBusinessLineChange(
                    value === '' ? null : (value as 'inversiones' | 'zurich' | 'patrimonial')
                  )
                }
                items={[
                  { value: '', label: 'Sin categoría' },
                  { value: 'inversiones', label: 'Inversiones' },
                  { value: 'zurich', label: 'Zurich' },
                  { value: 'patrimonial', label: 'Patrimonial' },
                ]}
              />
              <ModalFooter>
                <Button variant="secondary" onClick={onCancelEdit}>
                  Cancelar
                </Button>
                <Button onClick={onEditTag} disabled={isAutoSavingTag}>
                  {isAutoSavingTag ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar cambios'
                  )}
                </Button>
              </ModalFooter>
            </>
          ) : (
            // List view
            <>
              <div className="max-h-96 overflow-y-auto">
                {!Array.isArray(allTags) || allTags.length === 0 ? (
                  <Text color="secondary" className="text-center py-3">
                    No hay etiquetas creadas
                  </Text>
                ) : (
                  <div className="space-y-1.5">
                    {allTags.map((tag: Tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-2 border border-border rounded-md hover:bg-surface-hover"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color || '#6B7280' }}
                          />
                          <Text weight="medium" size="sm">
                            {tag.name}
                          </Text>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenEditTag(tag)}
                            className="h-7 px-2"
                          >
                            <Icon name="edit" size={14} className="mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteTag(tag.id)}
                            className="text-red-600 hover:text-red-700 h-7 px-2"
                          >
                            <Icon name="trash-2" size={14} className="mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <ModalFooter>
                <Button variant="secondary" onClick={onStartCreating}>
                  <Icon name="plus" size={16} className="mr-2" />
                  Nueva etiqueta
                </Button>
                <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
              </ModalFooter>
            </>
          )}
        </Stack>
      </ModalContent>
    </Modal>
  );
}
