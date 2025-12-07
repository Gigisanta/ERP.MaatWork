"use client";
/**
 * Contacts Page
 * 
 * Main contacts listing with table/kanban views, filters, and inline editing.
 * REFACTORED: Logic extracted to hooks (useContactsFilters, useTagManagement, useContactActions)
 * and components (ContactsToolbar, ContactKanbanView, TagManagementModal, DeleteContactModal)
 */

import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { useRequireAuth } from '../auth/useRequireAuth';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useContacts, usePipelineStages, useAdvisors, useTags } from '../../lib/api-hooks';
import { deleteTag } from '@/lib/api';
import type { Contact, PipelineStage, Tag } from '@/types';
import { usePageTitle } from '../components/PageTitleContext';
import InlineStageSelect from './components/InlineStageSelect';
import InlineTagsEditor from './components/InlineTagsEditor';
import InlineTextInput from './components/InlineTextInput';
import ContactsToolbar from './components/ContactsToolbar';
import ContactKanbanView from './components/ContactKanbanView';
import DeleteContactModal from './components/DeleteContactModal';
import TagManagementModal from './components/TagManagementModal';
import dynamic from 'next/dynamic';

// Hooks
import { useContactsFilters, filterContacts, useTagManagement, useContactActions } from './hooks';

// Lazy load DataTable
const DataTable = dynamic(() => import('@cactus/ui').then(mod => ({ default: mod.DataTable })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <Spinner size="md" />
    </div>
  )
});

// Lazy load ConfirmDialog
const ConfirmDialog = dynamic(() => import('../components/ConfirmDialog'), {
  ssr: false
});

import { useSearchShortcut, useEscapeShortcut } from '../../lib/hooks/useKeyboardShortcuts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  DropdownMenu,
  DropdownMenuItem,
  EmptyState,
  Alert,
  Spinner,
  Icon,
  ProgressBar,
  Modal,
  ModalContent,
  type Column,
} from '@cactus/ui';
import { useViewport } from '../(shared)/useViewport';
import { useToast } from '../../lib/hooks/useToast';
import { exportContactsToCSV, downloadCSV } from '../../lib/utils/csv-export';
import { logger } from '../../lib/logger';

export default function ContactsPage() {
  const { isMd } = useViewport();
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Set page title in header
  usePageTitle('Contactos');
  
  // Page transition animation state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);
  
  // Data fetching with SWR
  const { contacts, error: contactsError, isLoading: contactsLoading, mutate: mutateContacts } = useContacts(searchParams.get('advisorId') || undefined);
  const { stages: pipelineStages, error: stagesError, isLoading: stagesLoading } = usePipelineStages();
  const { advisors, error: advisorsError, isLoading: advisorsLoading } = useAdvisors();
  const { tags: allTags, error: tagsError, isLoading: tagsLoading, mutate: mutateTags } = useTags('contact');
  
  // Custom hooks for state management
  const filters = useContactsFilters({ advisors: advisors as any });
  const tagManagement = useTagManagement({ mutateTags, mutateContacts });
  const contactActions = useContactActions({ mutateContacts, allTags: allTags as Tag[] });
  
  const { showToast } = useToast();
  
  // Keyboard shortcuts
  useSearchShortcut(searchInputRef as React.RefObject<HTMLInputElement>, true);
  useEscapeShortcut(() => {
    if (contactActions.showDeleteModal) contactActions.setShowDeleteModal(false);
    if (tagManagement.showManageTagsModal) tagManagement.setShowManageTagsModal(false);
  }, contactActions.showDeleteModal || tagManagement.showManageTagsModal);

  // Combine loading and error states
  const localLoading = contactsLoading || stagesLoading || advisorsLoading || tagsLoading;
  const combinedError = contactsError || stagesError || advisorsError || tagsError;

  // Force revalidation when coming from contact creation
  useEffect(() => {
    const refreshParam = searchParams.get('refresh');
    if (refreshParam === 'true') {
      void mutateContacts(undefined, { revalidate: true });
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('refresh');
      const newUrl = newSearchParams.toString() 
        ? `/contacts?${newSearchParams.toString()}`
        : '/contacts';
      router.replace(newUrl);
    }
  }, [searchParams, mutateContacts, router]);

  // Filtered contacts
  const filteredContacts = useMemo(() => 
    filterContacts(contacts as Contact[], filters.debouncedSearchTerm, filters.selectedStage, filters.selectedTags),
    [contacts, filters.debouncedSearchTerm, filters.selectedStage, filters.selectedTags]
  );

  // Confirm dialog state for tag deletion
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'default';
  }>({
    open: false,
    title: '',
    onConfirm: () => {}
  });

  // AI_DECISION: Estado para mostrar progreso durante exportación CSV
  // Justificación: Proporciona feedback visual durante exportaciones de muchos contactos
  // Impacto: Mejor UX, usuario sabe que la exportación está en progreso
  const [exportState, setExportState] = React.useState<{
    isExporting: boolean;
    progress: number;
    status: string;
  }>({
    isExporting: false,
    progress: 0,
    status: '',
  });

  const handleDeleteTag = useCallback((tagId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Eliminar etiqueta',
      description: '¿Estás seguro de eliminar esta etiqueta?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteTag(tagId);
          mutateTags();
          showToast('Etiqueta eliminada', undefined, 'success');
          mutateContacts();
        } catch (err) {
          showToast('Error al eliminar etiqueta', err instanceof Error ? err.message : 'Error desconocido', 'error');
        }
      }
    });
  }, [mutateTags, mutateContacts, showToast]);

  // CSV export handler with progress indication
  const handleExportCSV = useCallback(async () => {
    try {
      if (!filteredContacts || filteredContacts.length === 0) {
        showToast('No hay contactos para exportar', 'No hay contactos filtrados disponibles', 'warning');
        return;
      }
      
      // Show progress for large exports
      const isLargeExport = filteredContacts.length > 100;
      if (isLargeExport) {
        setExportState({
          isExporting: true,
          progress: 0,
          status: 'Preparando exportación...',
        });
      }

      const stages = Array.isArray(pipelineStages) ? (pipelineStages as PipelineStage[]) : [];
      
      // Simulate progress for UX (actual export is synchronous)
      if (isLargeExport) {
        setExportState(prev => ({ ...prev, progress: 30, status: 'Generando CSV...' }));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const csvContent = exportContactsToCSV(filteredContacts, stages);
      
      if (isLargeExport) {
        setExportState(prev => ({ ...prev, progress: 70, status: 'Preparando descarga...' }));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      downloadCSV(csvContent, `contactos_${dateStr}_${timeStr}`);
      
      if (isLargeExport) {
        setExportState(prev => ({ ...prev, progress: 100, status: '¡Completado!' }));
        await new Promise(resolve => setTimeout(resolve, 500));
        setExportState({ isExporting: false, progress: 0, status: '' });
      }
      
      showToast('Exportación exitosa', `Se exportaron ${filteredContacts.length} contactos`, 'success');
    } catch (err) {
      setExportState({ isExporting: false, progress: 0, status: '' });
      logger.error('Error al exportar CSV', { error: err instanceof Error ? err.message : String(err) });
      showToast('Error al exportar', err instanceof Error ? err.message : 'Error desconocido', 'error');
    }
  }, [filteredContacts, pipelineStages, showToast]);

  // Column definitions
  const columns: Column<Contact>[] = useMemo(() => [
    {
      key: 'fullName',
      header: 'Nombre',
      sortable: true,
      render: (contact) => (
        <Link href={`/contacts/${contact.id}`} className="block hover:opacity-80 transition-opacity">
          <Text weight="medium" className="text-primary cursor-pointer">{contact.fullName}</Text>
          {contact.email && <Text size="sm" color="secondary">{contact.email}</Text>}
        </Link>
      )
    },
    {
      key: 'pipelineStageId',
      header: 'Etapa',
      render: (contact) => (
        <InlineStageSelect
          contact={contact}
          pipelineStages={Array.isArray(pipelineStages) ? (pipelineStages as PipelineStage[]) : []}
          isSaving={contactActions.savingContactId === contact.id}
          onStageChange={contactActions.handleStageChange}
          onMutate={mutateContacts}
          onError={(error: Error) => showToast('Error al avanzar etapa', error.message, 'error')}
        />
      )
    },
    {
      key: 'tags',
      header: 'Etiquetas',
      render: (contact) => (
        <InlineTagsEditor
          contact={contact}
          allTags={Array.isArray(allTags) ? (allTags as Tag[]) : []}
          isSaving={contactActions.savingContactId === contact.id}
          onTagsChange={contactActions.handleTagsChange}
          onManageTagsClick={() => tagManagement.setShowManageTagsModal(true)}
        />
      )
    },
    {
      key: 'nextStep',
      header: 'Próximo Paso',
      render: (contact) => (
        <InlineTextInput
          contact={contact}
          field="nextStep"
          placeholder="Agregar próximo paso..."
          isSaving={contactActions.savingContactId === contact.id}
          onSave={contactActions.handleTextInputSave}
        />
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (contact) => (
        <DropdownMenu
          trigger={<Button variant="ghost" size="sm"><Icon name="more-vertical" size={16} /></Button>}
        >
          <DropdownMenuItem onClick={() => router.push(`/contacts/${contact.id}`)}>
            <Icon name="edit" size={16} className="mr-2" />Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            contactActions.setContactToDelete(contact);
            contactActions.setShowDeleteModal(true);
          }}>
            <Icon name="trash-2" size={16} className="mr-2" />Eliminar
          </DropdownMenuItem>
        </DropdownMenu>
      )
    }
  ], [pipelineStages, allTags, contactActions, tagManagement, router, mutateContacts, showToast]) as Column<Contact>[];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Stack direction="column" gap="md" align="center">
          <Spinner size="lg" />
          <Text color="secondary">Verificando autenticación...</Text>
        </Stack>
      </div>
    );
  }

  if (localLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Stack direction="column" gap="md" align="center">
          <Spinner size="lg" />
          <Text color="secondary">Cargando contactos...</Text>
        </Stack>
      </div>
    );
  }

  const hasActiveFilters = filters.selectedStage !== 'all' || filters.selectedTags.length > 0 || !!filters.searchTerm || !!filters.advisorIdFilter;

  return (
    <div 
      className={`p-3 md:p-4 transition-all duration-500 ease-out ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <Stack direction="column" gap="md">
        {combinedError && (
          <Alert variant="error" title="Error">
            {combinedError instanceof Error ? combinedError.message : 'Error al cargar datos'}
          </Alert>
        )}

        {/* Toolbar */}
        <div
          className={`transition-all duration-500 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{ transitionDelay: '50ms' }}
        >
          <ContactsToolbar
          searchInputRef={searchInputRef}
          searchTerm={filters.searchTerm}
          onSearchChange={filters.setSearchTerm}
          selectedStage={filters.selectedStage}
          selectedTags={filters.selectedTags}
          pipelineStages={Array.isArray(pipelineStages) ? pipelineStages as PipelineStage[] : []}
          allTags={Array.isArray(allTags) ? allTags as Tag[] : []}
          onStageChange={filters.setSelectedStage}
          onTagToggle={filters.handleTagToggle}
          onManageTagsClick={() => tagManagement.setShowManageTagsModal(true)}
          viewMode={filters.viewMode}
          onViewModeChange={filters.setViewMode}
          advisorIdFilter={filters.advisorIdFilter}
          filteredAdvisor={filters.filteredAdvisor}
          onClearAdvisorFilter={filters.clearAdvisorFilter}
            onClearAllFilters={filters.clearAllFilters}
          />
        </div>

        {/* Table or Kanban view */}
        <div
          className={`transition-all duration-500 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '100ms' }}
        >
          {filters.viewMode === 'table' ? (
            <Card className="rounded-md border border-border" padding="sm">
              <CardHeader className="p-2 md:p-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm md:text-base">
                    Contactos ({filteredContacts.length})
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportCSV}
                    title="Descargar contactos como CSV"
                    disabled={filteredContacts.length === 0}
                    className="h-7 px-2 text-xs"
                  >
                    <Icon name="download" size={14} className="mr-1" />
                    <span className="hidden sm:inline">Descargar CSV</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-2 md:p-3 pt-0">
                {isMd ? (
                  // Mobile view
                  <MobileContactList
                    contacts={filteredContacts}
                    pipelineStages={Array.isArray(pipelineStages) ? pipelineStages as PipelineStage[] : []}
                    allTags={Array.isArray(allTags) ? allTags as Tag[] : []}
                    savingContactId={contactActions.savingContactId}
                    onStageChange={contactActions.handleStageChange}
                    onTagsChange={contactActions.handleTagsChange}
                    onTextInputSave={contactActions.handleTextInputSave}
                    onManageTagsClick={() => tagManagement.setShowManageTagsModal(true)}
                    mutateContacts={mutateContacts}
                    showToast={showToast}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={filters.clearAllFilters}
                  />
                ) : (
                  <DataTable
                    data={(filteredContacts ?? []) as unknown as Record<string, unknown>[]}
                    columns={columns as unknown as Column<Record<string, unknown>>[]}
                    keyField="id"
                    emptyMessage={
                      hasActiveFilters
                        ? "No se encontraron contactos con los filtros aplicados."
                        : "Comienza agregando tu primer contacto al sistema."
                    }
                    virtualized={true}
                    virtualizedHeight={600}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <ContactKanbanView
              contacts={filteredContacts}
              pipelineStages={Array.isArray(pipelineStages) ? pipelineStages as PipelineStage[] : []}
            />
          )}
        </div>

        {/* Modals */}
        <DeleteContactModal
          open={contactActions.showDeleteModal}
          onOpenChange={contactActions.setShowDeleteModal}
          contact={contactActions.contactToDelete}
          onConfirm={contactActions.handleDeleteContact}
        />

        <TagManagementModal
          open={tagManagement.showManageTagsModal}
          onOpenChange={tagManagement.setShowManageTagsModal}
          allTags={Array.isArray(allTags) ? allTags as Tag[] : []}
          isCreatingTag={tagManagement.isCreatingTag}
          newTagName={tagManagement.newTag.name}
          newTagColor={tagManagement.newTag.color}
          newTagBusinessLine={tagManagement.newTag.businessLine}
          onNewTagNameChange={tagManagement.setNewTagName}
          onNewTagColorChange={tagManagement.setNewTagColor}
          onNewTagBusinessLineChange={tagManagement.setNewTagBusinessLine}
          onCreateTag={tagManagement.handleCreateTag}
          onStartCreating={tagManagement.resetCreateForm}
          onCancelCreating={() => tagManagement.setIsCreatingTag(false)}
          tagToEdit={tagManagement.tagToEdit}
          editedTagName={tagManagement.editedTag.name}
          editedTagColor={tagManagement.editedTag.color}
          editedTagBusinessLine={tagManagement.editedTag.businessLine}
          isAutoSavingTag={tagManagement.isAutoSavingTag}
          onEditedTagNameChange={tagManagement.setEditedTagName}
          onEditedTagColorChange={tagManagement.setEditedTagColor}
          onEditedTagBusinessLineChange={tagManagement.setEditedTagBusinessLine}
          onEditTag={tagManagement.handleEditTag}
          onOpenEditTag={tagManagement.openEditTag}
          onCancelEdit={tagManagement.closeEditTag}
          onDeleteTag={handleDeleteTag}
        />

        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          {...(confirmDialog.description ? { description: confirmDialog.description } : {})}
          variant={confirmDialog.variant || 'default'}
          confirmLabel="Confirmar"
          cancelLabel="Cancelar"
        />

        {/* Export Progress Modal */}
        <Modal open={exportState.isExporting} onOpenChange={() => {}}>
          <ModalContent className="max-w-sm">
            <div className="p-6 text-center">
              <div className="mb-4">
                <Icon name="download" size={32} className="text-primary mx-auto" />
              </div>
              <Text weight="medium" size="lg" className="mb-2">
                Exportando Contactos
              </Text>
              <Text size="sm" color="secondary" className="mb-4">
                {exportState.status}
              </Text>
              <ProgressBar 
                value={exportState.progress} 
                variant={exportState.progress === 100 ? 'success' : 'default'}
                size="md"
                animated
              />
            </div>
          </ModalContent>
        </Modal>
      </Stack>
    </div>
  );
}

// Mobile contact list component (extracted for clarity)
function MobileContactList({
  contacts,
  pipelineStages,
  allTags,
  savingContactId,
  onStageChange,
  onTagsChange,
  onTextInputSave,
  onManageTagsClick,
  mutateContacts,
  showToast,
  hasActiveFilters,
  onClearFilters
}: {
  contacts: Contact[];
  pipelineStages: PipelineStage[];
  allTags: Tag[];
  savingContactId: string | null;
  onStageChange: (contactId: string, stageId: string | null) => void;
  onTagsChange: (contactId: string, add: string[], remove: string[]) => void;
  onTextInputSave: (contactId: string, field: string, value: string) => void;
  onManageTagsClick: () => void;
  mutateContacts: () => void;
  showToast: (title: string, description: string | undefined, type: 'success' | 'error' | 'warning') => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  const router = useRouter();

  if (contacts.length === 0) {
    return (
      <EmptyState 
        title={hasActiveFilters ? "Sin resultados" : "No hay contactos"}
        description={
          hasActiveFilters
            ? "No se encontraron contactos con los filtros aplicados."
            : "Comienza agregando tu primer contacto al sistema."
        }
        action={
          hasActiveFilters ? (
            <Button variant="secondary" size="sm" onClick={onClearFilters}>
              Limpiar filtros
            </Button>
          ) : (
            <Button variant="primary" onClick={() => router.push('/contacts/new')}>
              Crear contacto
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {contacts.map((contact) => (
        <div key={contact.id} className="p-2 rounded-md border border-border bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <Text weight="medium" className="text-sm">{contact.fullName}</Text>
              {contact.email && (
                <Text size="xs" color="secondary" className="mt-0.5">{contact.email}</Text>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push(`/contacts/${contact.id}`)} className="h-6 w-6 p-0">
              <Icon name="ChevronRight" size={14} />
            </Button>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <InlineStageSelect
              contact={contact}
              pipelineStages={pipelineStages}
              isSaving={savingContactId === contact.id}
              onStageChange={onStageChange}
              onMutate={mutateContacts}
              onError={(error: Error) => showToast('Error al avanzar etapa', error.message, 'error')}
            />
            <InlineTagsEditor
              contact={contact}
              allTags={allTags}
              isSaving={savingContactId === contact.id}
              onTagsChange={onTagsChange}
              onManageTagsClick={onManageTagsClick}
            />
          </div>
          <div className="mt-1.5">
            <InlineTextInput
              contact={contact}
              field="nextStep"
              placeholder="Agregar próximo paso..."
              isSaving={savingContactId === contact.id}
              onSave={onTextInputSave}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
