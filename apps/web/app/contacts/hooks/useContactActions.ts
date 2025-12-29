/**
 * Hook for contact actions (delete, update field, update tags)
 *
 * Handles optimistic updates and error handling
 */

import { useState, useCallback } from 'react';
import {
  deleteContact,
  updateContactField as updateContactFieldApi,
  updateContactTags as updateContactTagsApi,
  moveContactToStage, // AI_DECISION: Use dedicated pipeline API for stage changes
} from '@/lib/api';
import { useToast } from '@/lib/hooks/useToast';
import type { Contact, Tag, ApiResponse, ContactFieldValue, ContactWithTags } from '@/types';
import type { KeyedMutator } from 'swr';

interface ContactActionsState {
  showDeleteModal: boolean;
  contactToDelete: Contact | null;
  savingContactId: string | null;
  editingField: { contactId: string; field: string } | null;
}

interface ContactActionsActions {
  setShowDeleteModal: (show: boolean) => void;
  setContactToDelete: (contact: Contact | null) => void;
  handleDeleteContact: () => Promise<void>;
  updateContactField: (contactId: string, field: string, value: ContactFieldValue) => Promise<void>;
  updateContactTags: (contactId: string, add: string[], remove: string[]) => Promise<void>;
  handleStageChange: (contactId: string, stageId: string | null) => Promise<void>;
  handleTagsChange: (contactId: string, add: string[], remove: string[]) => void;
  handleTextInputSave: (contactId: string, field: string, value: string) => void;
}

interface UseContactActionsProps {
  mutateContacts: KeyedMutator<ApiResponse<ContactWithTags[]>>;
  allTags?: Tag[];
}

export function useContactActions({
  mutateContacts,
  allTags,
}: UseContactActionsProps): ContactActionsState & ContactActionsActions {
  const { showToast } = useToast();

  // Delete contact state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Inline editing state
  const [savingContactId, setSavingContactId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ contactId: string; field: string } | null>(
    null
  );

  const handleDeleteContact = useCallback(async () => {
    if (!contactToDelete) return;

    try {
      await deleteContact(contactToDelete.id);
      mutateContacts();
      setShowDeleteModal(false);
      setContactToDelete(null);
      showToast('Contacto eliminado', undefined, 'success');
    } catch (err) {
      showToast(
        'Error al eliminar contacto',
        err instanceof Error ? err.message : 'Error desconocido',
        'error'
      );
    }
  }, [contactToDelete, mutateContacts, showToast]);

  const updateContactField = useCallback(
    async (contactId: string, field: string, value: ContactFieldValue) => {
      setSavingContactId(contactId);

      // Optimistic update
      const optimisticUpdate = (
        currentData: ApiResponse<ContactWithTags[]> | undefined
      ): ApiResponse<ContactWithTags[]> | undefined => {
        if (!currentData || !Array.isArray(currentData.data)) return currentData;
        const contacts = currentData.data;
        return {
          ...currentData,
          data: contacts.map((contact: ContactWithTags) =>
            contact.id === contactId ? { ...contact, [field]: value } as ContactWithTags : contact
          ),
        };
      };

      mutateContacts(optimisticUpdate, false);

      try {
        await updateContactFieldApi(contactId, field, value);
        mutateContacts();
        showToast('Campo actualizado', undefined, 'success');
      } catch (err) {
        mutateContacts();
        showToast(
          'Error al actualizar',
          err instanceof Error ? err.message : 'Error desconocido',
          'error'
        );
      } finally {
        setSavingContactId(null);
        setEditingField(null);
      }
    },
    [mutateContacts, showToast]
  );

  // AI_DECISION: Optimistic update mejorado para etiquetas
  // Justificación: Incluye todos los campos (icon, businessLine) y evita revalidación innecesaria
  // Impacto: Elimina parpadeo al agregar/quitar etiquetas, mejor UX
  const updateContactTags = useCallback(
    async (contactId: string, add: string[], remove: string[]) => {
      setSavingContactId(contactId);

      // Optimistic update - incluir todos los campos de la etiqueta
      const optimisticUpdate = (
        currentData: ApiResponse<ContactWithTags[]> | undefined
      ): ApiResponse<ContactWithTags[]> | undefined => {
        if (!currentData || !Array.isArray(currentData.data)) return currentData;
        const contacts = currentData.data;
        return {
          ...currentData,
          data: contacts.map((contact: ContactWithTags) => {
            if (contact.id !== contactId) return contact;
            const currentTags = contact.tags || [];
            // Construir tags a agregar, filtrando nulls antes de spread
            const tagsToAdd = add
              .map((tagId) => {
                const tag = Array.isArray(allTags) ? allTags.find((t) => t.id === tagId) : null;
                if (!tag) return null;
                // Incluir todos los campos necesarios para evitar inconsistencias
                return {
                  id: tag.id,
                  name: tag.name,
                  color: tag.color,
                  icon: tag.icon ?? undefined,
                  businessLine: tag.businessLine ?? undefined,
                };
              })
              .filter((tag): tag is NonNullable<typeof tag> => tag !== null);

            const newTags = [
              ...currentTags.filter((tag) => !remove.includes(tag.id)),
              ...tagsToAdd,
            ];
            return { ...contact, tags: newTags };
          }),
        };
      };

      mutateContacts(optimisticUpdate, false);

      try {
        const response = await updateContactTagsApi(contactId, add, remove);

        // Actualizar el cache con los datos reales del servidor en lugar de forzar revalidación
        // Esto evita el parpadeo causado por la revalidación
        if (response.data) {
          const serverTags = response.data;
          const updateWithServerData = (
            currentData: ApiResponse<ContactWithTags[]> | undefined
          ): ApiResponse<ContactWithTags[]> | undefined => {
            if (!currentData || !Array.isArray(currentData.data)) return currentData;
            const contacts = currentData.data;
            return {
              ...currentData,
              data: contacts.map((contact: ContactWithTags) => {
                if (contact.id !== contactId) return contact;
                return { ...contact, tags: serverTags };
              }),
            };
          };
          mutateContacts(updateWithServerData, false);
        }

        showToast('Etiquetas actualizadas', undefined, 'success');
      } catch (err) {
        // En caso de error, forzar revalidación para obtener el estado real
        mutateContacts();
        showToast(
          'Error al actualizar etiquetas',
          err instanceof Error ? err.message : 'Error desconocido',
          'error'
        );
      } finally {
        setSavingContactId(null);
        setEditingField(null);
      }
    },
    [mutateContacts, showToast, allTags]
  );

  const handleStageChange = useCallback(
    async (contactId: string, stageId: string | null) => {
      // AI_DECISION: Use moveContactToStage instead of updateContactField for consistency
      // Justificación: moveContactToStage handles automation, WIP limits, and specific history logs.
      // updateContactField (PATCH /contacts/:id) is generic and might miss these checks.
      // Impacto: Ensures same behavior as Kanban board and Advance button.
      setSavingContactId(contactId);

      // We do NOT use optimistic update for stage change because it has complex rules (WIP)
      // and failure is possible (e.g. WIP limit exceeded).
      // We wait for server response.

      try {
        if (!stageId) {
          // If clearing stage, fallback to field update as move requires target stage
          await updateContactFieldApi(contactId, 'pipelineStageId', null);
        } else {
          const response = await moveContactToStage(contactId, stageId);
          if (!response.success) {
            throw new Error(response.error || 'Error al cambiar etapa');
          }
        }

        mutateContacts(); // Revalidate list
        showToast('Etapa actualizada', undefined, 'success');
      } catch (err) {
        showToast(
          'Error al cambiar etapa',
          err instanceof Error ? err.message : 'Error desconocido',
          'error'
        );
      } finally {
        setSavingContactId(null);
      }
    },
    [showToast, mutateContacts]
  );

  const handleTagsChange = useCallback(
    (contactId: string, add: string[], remove: string[]) => {
      updateContactTags(contactId, add, remove);
    },
    [updateContactTags]
  );

  const handleTextInputSave = useCallback(
    (contactId: string, field: string, value: string) => {
      updateContactField(contactId, field, value);
    },
    [updateContactField]
  );

  return {
    // State
    showDeleteModal,
    contactToDelete,
    savingContactId,
    editingField,
    // Actions
    setShowDeleteModal,
    setContactToDelete,
    handleDeleteContact,
    updateContactField,
    updateContactTags,
    handleStageChange,
    handleTagsChange,
    handleTextInputSave,
  };
}
