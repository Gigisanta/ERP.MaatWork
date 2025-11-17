import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { deleteContact, createTag, updateTag, updateContactField as updateContactFieldApi, updateContactTags as updateContactTagsApi } from '@/lib/api';
import { useToast } from '../../../lib/hooks/useToast';
import type { Contact, Tag } from '@/types';

export function useContactActions(
  mutateContacts: () => void,
  mutateTags: () => void
) {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [savingContactId, setSavingContactId] = useState<string | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const handleStageChange = useCallback(async (contactId: string, newStageId: string) => {
    setSavingContactId(contactId);
    try {
      await updateContactFieldApi(contactId, 'pipelineStageId', newStageId);
      mutateContacts();
    } catch (err) {
      showToast('Error al avanzar etapa', err instanceof Error ? err.message : 'Error desconocido', 'error');
      throw err;
    } finally {
      setSavingContactId(null);
    }
  }, [mutateContacts, showToast]);

  const handleTagsChange = useCallback(async (contactId: string, add: string[], remove: string[]) => {
    setSavingContactId(contactId);
    try {
      await updateContactTagsApi(contactId, add, remove);
      mutateContacts();
    } catch (err) {
      showToast('Error al actualizar etiquetas', err instanceof Error ? err.message : 'Error desconocido', 'error');
      throw err;
    } finally {
      setSavingContactId(null);
    }
  }, [mutateContacts, showToast]);

  const handleTextInputSave = useCallback(async (contactId: string, field: string, value: string) => {
    setSavingContactId(contactId);
    try {
      await updateContactFieldApi(contactId, field, value);
      mutateContacts();
    } catch (err) {
      showToast('Error al guardar', err instanceof Error ? err.message : 'Error desconocido', 'error');
      throw err;
    } finally {
      setSavingContactId(null);
    }
  }, [mutateContacts, showToast]);

  const handleCreateTag = useCallback(async (
    name: string,
    color: string,
    businessLine: 'inversiones' | 'zurich' | 'patrimonial' | null
  ) => {
    if (!name.trim()) return;
    
    try {
      await createTag({
        entityType: 'contact',
        name: name.trim(),
        color,
        businessLine
      });
      mutateTags();
      mutateContacts();
      showToast('Etiqueta creada', undefined, 'success');
    } catch (err) {
      showToast('Error al crear etiqueta', err instanceof Error ? err.message : 'Error desconocido', 'error');
      throw err;
    }
  }, [mutateTags, mutateContacts, showToast]);

  const handleEditTag = useCallback(async (
    tag: Tag,
    name: string,
    color: string,
    businessLine: 'inversiones' | 'zurich' | 'patrimonial' | null
  ) => {
    if (!name.trim()) return;
    
    try {
      await updateTag(tag.id, {
        name: name.trim(),
        color,
        businessLine
      });
      mutateTags();
      mutateContacts();
      showToast('Etiqueta actualizada', undefined, 'success');
    } catch (err) {
      showToast('Error al editar etiqueta', err instanceof Error ? err.message : 'Error desconocido', 'error');
      throw err;
    }
  }, [mutateTags, mutateContacts, showToast]);

  return {
    savingContactId,
    contactToDelete,
    setContactToDelete,
    showDeleteModal,
    setShowDeleteModal,
    handleDeleteContact,
    handleStageChange,
    handleTagsChange,
    handleTextInputSave,
    handleCreateTag,
    handleEditTag,
  };
}

