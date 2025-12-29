/**
 * Hook for managing tag CRUD operations
 *
 * Handles creating, editing, deleting tags with modals
 */

import { useState, useCallback, useEffect } from 'react';
import { createTag, updateTag, deleteTag } from '@/lib/api';
import { useToast } from '@/lib/hooks/useToast';
import { logger } from '@/lib/logger';
import type { Tag } from '@/types';

interface TagFormState {
  name: string;
  color: string;
  businessLine: 'inversiones' | 'zurich' | 'patrimonial' | null;
}

interface TagManagementState {
  showCreateTagModal: boolean;
  showManageTagsModal: boolean;
  tagToEdit: Tag | null;
  isCreatingTag: boolean;
  isAutoSavingTag: boolean;
  newTag: TagFormState;
  editedTag: TagFormState;
}

interface TagManagementActions {
  setShowCreateTagModal: (show: boolean) => void;
  setShowManageTagsModal: (show: boolean) => void;
  setNewTagName: (name: string) => void;
  setNewTagColor: (color: string) => void;
  setNewTagBusinessLine: (line: 'inversiones' | 'zurich' | 'patrimonial' | null) => void;
  setEditedTagName: (name: string) => void;
  setEditedTagColor: (color: string) => void;
  setEditedTagBusinessLine: (line: 'inversiones' | 'zurich' | 'patrimonial' | null) => void;
  setIsCreatingTag: (creating: boolean) => void;
  openEditTag: (tag: Tag) => void;
  closeEditTag: () => void;
  handleCreateTag: () => Promise<void>;
  handleEditTag: () => Promise<void>;
  handleDeleteTag: (tagId: string, onConfirm: () => void) => void;
  resetCreateForm: () => void;
}

interface UseTagManagementProps {
  mutateTags: () => void;
  mutateContacts: () => void;
}

export function useTagManagement({
  mutateTags,
  mutateContacts,
}: UseTagManagementProps): TagManagementState & TagManagementActions {
  const { showToast } = useToast();

  // Modal states
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [showManageTagsModal, setShowManageTagsModal] = useState(false);
  const [tagToEdit, setTagToEdit] = useState<Tag | null>(null);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isAutoSavingTag, setIsAutoSavingTag] = useState(false);

  // New tag form
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6B7280');
  const [newTagBusinessLine, setNewTagBusinessLine] = useState<
    'inversiones' | 'zurich' | 'patrimonial' | null
  >(null);

  // Edit tag form
  const [editedTagName, setEditedTagName] = useState('');
  const [editedTagColor, setEditedTagColor] = useState('#6B7280');
  const [editedTagBusinessLine, setEditedTagBusinessLine] = useState<
    'inversiones' | 'zurich' | 'patrimonial' | null
  >(null);

  // Auto-save for tag editing
  useEffect(() => {
    if (!tagToEdit) return;
    if (!editedTagName.trim()) return;

    const timeoutId = setTimeout(async () => {
      const hasChanges =
        editedTagName.trim() !== tagToEdit.name ||
        editedTagColor !== tagToEdit.color ||
        editedTagBusinessLine !== (tagToEdit.businessLine ?? null);

      if (hasChanges) {
        setIsAutoSavingTag(true);
        try {
          await updateTag(tagToEdit.id, {
            name: editedTagName.trim(),
            color: editedTagColor,
            businessLine: editedTagBusinessLine,
          });
          mutateTags();
          mutateContacts();
          setTagToEdit({
            ...tagToEdit,
            name: editedTagName.trim(),
            color: editedTagColor,
            businessLine: editedTagBusinessLine,
          });
        } catch (err) {
          logger.error('Error al guardar automáticamente la etiqueta', {
            error: err instanceof Error ? err.message : String(err),
            tagId: tagToEdit.id,
            tagName: editedTagName,
          });
        } finally {
          setIsAutoSavingTag(false);
        }
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [editedTagName, editedTagColor, editedTagBusinessLine, tagToEdit, mutateTags, mutateContacts]);

  const handleCreateTag = useCallback(async () => {
    if (!newTagName.trim()) return;

    try {
      await createTag({
        entityType: 'contact',
        name: newTagName.trim(),
        color: newTagColor,
        businessLine: newTagBusinessLine,
      });
      await mutateTags();
      setNewTagName('');
      setNewTagColor('#6B7280');
      setNewTagBusinessLine(null);
      setIsCreatingTag(false);
      showToast('Etiqueta creada', undefined, 'success');
      await mutateContacts();
    } catch (err) {
      showToast(
        'Error al crear etiqueta',
        err instanceof Error ? err.message : 'Error desconocido',
        'error'
      );
    }
  }, [newTagName, newTagColor, newTagBusinessLine, mutateTags, mutateContacts, showToast]);

  const handleEditTag = useCallback(async () => {
    if (!tagToEdit || !editedTagName.trim()) return;

    try {
      await updateTag(tagToEdit.id, {
        name: editedTagName.trim(),
        color: editedTagColor,
        businessLine: editedTagBusinessLine,
      });
      mutateTags();
      showToast('Etiqueta actualizada', undefined, 'success');
      setShowManageTagsModal(false);
      setTagToEdit(null);
      mutateContacts();
    } catch (err) {
      showToast(
        'Error al editar etiqueta',
        err instanceof Error ? err.message : 'Error desconocido',
        'error'
      );
    }
  }, [
    tagToEdit,
    editedTagName,
    editedTagColor,
    editedTagBusinessLine,
    mutateTags,
    mutateContacts,
    showToast,
  ]);

  const handleDeleteTag = useCallback((tagId: string, onConfirm: () => void) => {
    // Caller should handle confirm dialog
    onConfirm();
  }, []);

  const openEditTag = useCallback((tag: Tag) => {
    setTagToEdit(tag);
    setEditedTagName(tag.name);
    setEditedTagColor(tag.color);
    setEditedTagBusinessLine(tag.businessLine ?? null);
    setShowManageTagsModal(true);
  }, []);

  const closeEditTag = useCallback(() => {
    setTagToEdit(null);
  }, []);

  const resetCreateForm = useCallback(() => {
    setIsCreatingTag(true);
    setNewTagName('');
    setNewTagColor('#6B7280');
    setNewTagBusinessLine(null);
  }, []);

  return {
    // State
    showCreateTagModal,
    showManageTagsModal,
    tagToEdit,
    isCreatingTag,
    isAutoSavingTag,
    newTag: { name: newTagName, color: newTagColor, businessLine: newTagBusinessLine },
    editedTag: { name: editedTagName, color: editedTagColor, businessLine: editedTagBusinessLine },
    // Actions
    setShowCreateTagModal,
    setShowManageTagsModal,
    setNewTagName,
    setNewTagColor,
    setNewTagBusinessLine,
    setEditedTagName,
    setEditedTagColor,
    setEditedTagBusinessLine,
    setIsCreatingTag,
    openEditTag,
    closeEditTag,
    handleCreateTag,
    handleEditTag,
    handleDeleteTag,
    resetCreateForm,
  };
}
