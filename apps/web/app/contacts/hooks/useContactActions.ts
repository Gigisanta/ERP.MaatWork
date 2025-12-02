/**
 * Hook for contact actions (delete, update field, update tags)
 * 
 * Handles optimistic updates and error handling
 */

import { useState, useCallback } from 'react';
import { deleteContact, updateContactField as updateContactFieldApi, updateContactTags as updateContactTagsApi } from '@/lib/api';
import { useToast } from '@/lib/hooks/useToast';
import type { Contact, Tag, ApiResponse, ContactFieldValue } from '@/types';

export interface ContactActionsState {
  showDeleteModal: boolean;
  contactToDelete: Contact | null;
  savingContactId: string | null;
  editingField: { contactId: string; field: string } | null;
}

export interface ContactActionsActions {
  setShowDeleteModal: (show: boolean) => void;
  setContactToDelete: (contact: Contact | null) => void;
  handleDeleteContact: () => Promise<void>;
  updateContactField: (contactId: string, field: string, value: ContactFieldValue) => Promise<void>;
  updateContactTags: (contactId: string, add: string[], remove: string[]) => Promise<void>;
  handleStageChange: (contactId: string, stageId: string | null) => void;
  handleTagsChange: (contactId: string, add: string[], remove: string[]) => void;
  handleTextInputSave: (contactId: string, field: string, value: string) => void;
}

export interface UseContactActionsProps {
  mutateContacts: (
    data?: ApiResponse<unknown[]> | ((current: ApiResponse<unknown[]> | undefined) => ApiResponse<unknown[]> | undefined),
    shouldRevalidate?: boolean
  ) => void;
  allTags?: Tag[];
}

export function useContactActions({ mutateContacts, allTags }: UseContactActionsProps): ContactActionsState & ContactActionsActions {
  const { showToast } = useToast();
  
  // Delete contact state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  
  // Inline editing state
  const [savingContactId, setSavingContactId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ contactId: string; field: string } | null>(null);

  const handleDeleteContact = useCallback(async () => {
    if (!contactToDelete) return;
    
    try {
      await deleteContact(contactToDelete.id);
      mutateContacts();
      setShowDeleteModal(false);
      setContactToDelete(null);
      showToast('Contacto eliminado', undefined, 'success');
    } catch (err) {
      showToast('Error al eliminar contacto', err instanceof Error ? err.message : 'Error desconocido', 'error');
    }
  }, [contactToDelete, mutateContacts, showToast]);

  const updateContactField = useCallback(async (contactId: string, field: string, value: ContactFieldValue) => {
    setSavingContactId(contactId);
    
    // Optimistic update
    const optimisticUpdate = (currentData: ApiResponse<unknown[]> | undefined): ApiResponse<unknown[]> | undefined => {
      if (!currentData || !Array.isArray(currentData.data)) return currentData;
      const contacts = currentData.data as Contact[];
      return {
        ...currentData,
        data: contacts.map((contact: Contact) => 
          contact.id === contactId 
            ? { ...contact, [field]: value }
            : contact
        )
      };
    };
    
    mutateContacts(optimisticUpdate, false);
    
    try {
      await updateContactFieldApi(contactId, field, value);
      mutateContacts();
      showToast('Campo actualizado', undefined, 'success');
    } catch (err) {
      mutateContacts();
      showToast('Error al actualizar', err instanceof Error ? err.message : 'Error desconocido', 'error');
    } finally {
      setSavingContactId(null);
      setEditingField(null);
    }
  }, [mutateContacts, showToast]);

  const updateContactTags = useCallback(async (contactId: string, add: string[], remove: string[]) => {
    setSavingContactId(contactId);
    
    // Optimistic update
    const optimisticUpdate = (currentData: ApiResponse<unknown[]> | undefined): ApiResponse<unknown[]> | undefined => {
      if (!currentData || !Array.isArray(currentData.data)) return currentData;
      const contacts = currentData.data as Contact[];
      return {
        ...currentData,
        data: contacts.map((contact: Contact) => {
          if (contact.id !== contactId) return contact;
          const currentTags = contact.tags || [];
          const newTags = [
            ...currentTags.filter(tag => !remove.includes(tag.id)),
            ...add.map(tagId => {
              const tag = Array.isArray(allTags) ? allTags.find(t => t.id === tagId) : null;
              return tag ? { id: tag.id, name: tag.name, color: tag.color } : null;
            }).filter((tag): tag is { id: string; name: string; color: string } => tag !== null)
          ];
          return { ...contact, tags: newTags };
        })
      };
    };
    
    mutateContacts(optimisticUpdate, false);
    
    try {
      await updateContactTagsApi(contactId, add, remove);
      mutateContacts();
      showToast('Etiquetas actualizadas', undefined, 'success');
    } catch (err) {
      mutateContacts();
      showToast('Error al actualizar etiquetas', err instanceof Error ? err.message : 'Error desconocido', 'error');
    } finally {
      setSavingContactId(null);
      setEditingField(null);
    }
  }, [mutateContacts, showToast, allTags]);

  const handleStageChange = useCallback((contactId: string, stageId: string | null) => {
    updateContactField(contactId, 'pipelineStageId', stageId);
  }, [updateContactField]);

  const handleTagsChange = useCallback((contactId: string, add: string[], remove: string[]) => {
    updateContactTags(contactId, add, remove);
  }, [updateContactTags]);

  const handleTextInputSave = useCallback((contactId: string, field: string, value: string) => {
    updateContactField(contactId, field, value);
  }, [updateContactField]);

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
    handleTextInputSave
  };
}
