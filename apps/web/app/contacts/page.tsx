"use client";
import React, { useEffect, useState } from 'react';
import { useRequireAuth } from '../auth/useRequireAuth';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useContacts, usePipelineStages, useAdvisors, useTags } from '../../lib/api-hooks';
import { deleteContact, createTag, updateTag, deleteTag, updateContactField as updateContactFieldApi, updateContactTags as updateContactTagsApi } from '@/lib/api';
import type { ContactFieldValue, PipelineStage, Advisor, Contact, Tag } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Heading,
  Text,
  Stack,
  Input,
  Select,
  Badge,
  DataTable,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  EmptyState,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Alert,
  Spinner,
  Icon,
  Toast,
  Tabs,
  TabsList,
  TabsTrigger,
  type Column,
} from '@cactus/ui';

// Types Contact y Tag importados desde @/types

export default function ContactsPage() {
  const { user, token, loading } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const advisorIdFilter = searchParams.get('advisorId');
  
  // AI_DECISION: Replace manual API calls with SWR hooks for request deduplication
  // Justificación: Eliminates redundant requests on navigation, provides automatic caching
  // Impacto: Reduces API load, improves perceived performance with instant cache hits
  // SWR automatically handles revalidation when advisorIdFilter changes because the key includes the URL
  const { contacts, error: contactsError, isLoading: contactsLoading, mutate: mutateContacts } = useContacts(advisorIdFilter || undefined);
  const { stages: pipelineStages, error: stagesError, isLoading: stagesLoading } = usePipelineStages();
  const { advisors, error: advisorsError, isLoading: advisorsLoading } = useAdvisors();
  const { tags: allTags, error: tagsError, isLoading: tagsLoading, mutate: mutateTags } = useTags('contact');
  
  const [error, setError] = useState<string | null>(null);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Get advisor name for filter badge
  const filteredAdvisor = advisorIdFilter ? advisors?.find((a: Advisor) => a.id === advisorIdFilter) : null;

  // Estados para modales
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  // Estados para crear etiqueta
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6B7280');

  // Estados para gestionar etiquetas existentes
  const [showManageTagsModal, setShowManageTagsModal] = useState(false);
  const [tagToEdit, setTagToEdit] = useState<Tag | null>(null);
  const [editedTagName, setEditedTagName] = useState('');
  const [editedTagColor, setEditedTagColor] = useState('#6B7280');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Estados para edición inline
  const [savingContactId, setSavingContactId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ contactId: string; field: string } | null>(null);
  const [toast, setToast] = useState<{ show: boolean; title: string; description?: string; variant: 'success' | 'error' }>({
    show: false,
    title: '',
    variant: 'success'
  });

  // Combine all loading states
  const localLoading = contactsLoading || stagesLoading || advisorsLoading || tagsLoading;
  
  // Combine all errors
  const combinedError = contactsError || stagesError || advisorsError || tagsError || error;

  const handleDeleteContact = async () => {
    if (!contactToDelete || !token) return;
    
    try {
      await deleteContact(contactToDelete.id);
      // Invalidate contacts cache to refetch updated data
      mutateContacts();
      setShowDeleteModal(false);
      setContactToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar contacto');
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !token) return;
    
    try {
      await createTag({
        entityType: 'contact',
        name: newTagName.trim(),
        color: newTagColor
      });
      // Invalidate tags cache to refetch updated data
      mutateTags();
      setNewTagName('');
      setNewTagColor('#6B7280');
      setIsCreatingTag(false);
      setToast({
        show: true,
        title: 'Etiqueta creada',
        variant: 'success'
      });
      // Also refresh contacts to show new tag
      mutateContacts();
    } catch (err) {
      setToast({
        show: true,
        title: 'Error al crear etiqueta',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'error'
      });
    }
  };

  const handleEditTag = async () => {
    if (!tagToEdit || !editedTagName.trim() || !token) return;
    
    try {
      await updateTag(tagToEdit.id, {
        name: editedTagName.trim(),
        color: editedTagColor
      });
      // Invalidate tags cache to refetch updated data
      mutateTags();
      setToast({
        show: true,
        title: 'Etiqueta actualizada',
        variant: 'success'
      });
      setShowManageTagsModal(false);
      setTagToEdit(null);
      // Also refresh contacts to show updated tag
      mutateContacts();
    } catch (err) {
      setToast({
        show: true,
        title: 'Error al editar etiqueta',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'error'
      });
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!token || !confirm('¿Estás seguro de eliminar esta etiqueta?')) return;
    
    try {
      await deleteTag(tagId);
      // Invalidate tags cache to refetch updated data
      mutateTags();
      setToast({
        show: true,
        title: 'Etiqueta eliminada',
        variant: 'success'
      });
      // Also refresh contacts to show updated tags
      mutateContacts();
    } catch (err) {
      setToast({
        show: true,
        title: 'Error al eliminar etiqueta',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'error'
      });
    }
  };

  const openEditTag = (tag: Tag) => {
    setTagToEdit(tag);
    setEditedTagName(tag.name);
    setEditedTagColor(tag.color);
    setShowManageTagsModal(true);
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedStage('all');
    setSelectedTags([]);
    // Clear advisor filter from URL
    if (advisorIdFilter) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('advisorId');
      router.push(`/contacts?${newSearchParams.toString()}`);
    }
  };

  const clearAdvisorFilter = () => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete('advisorId');
    router.push(`/contacts?${newSearchParams.toString()}`);
  };


  // Funciones para edición inline
  const updateContactFieldLocal = async (contactId: string, field: string, value: ContactFieldValue) => {
    if (!token) return;
    
    setSavingContactId(contactId);
    try {
      await updateContactFieldApi(contactId, field, value);
      // Invalidate contacts cache to refetch updated data
      mutateContacts();
      setToast({
        show: true,
        title: 'Campo actualizado',
        variant: 'success'
      });
    } catch (err) {
      setToast({
        show: true,
        title: 'Error al actualizar',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'error'
      });
    } finally {
      setSavingContactId(null);
      setEditingField(null);
    }
  };

  const updateContactTagsLocal = async (contactId: string, add: string[], remove: string[]) => {
    if (!token) return;
    
    setSavingContactId(contactId);
    try {
      // Obtener tags actuales del contacto
      const contact = contacts?.find((c: Contact) => c.id === contactId);
      const currentTagIds = contact?.tags?.map((t: Tag) => t.id) || [];
      
      // Calcular nuevos tags
      const newTagIds = [...currentTagIds.filter((id: string) => !remove.includes(id)), ...add.filter((id: string) => !currentTagIds.includes(id))];
      
      await updateContactTagsApi(contactId, newTagIds);
      // Invalidate contacts cache to refetch updated data
      mutateContacts();
      setToast({
        show: true,
        title: 'Etiquetas actualizadas',
        variant: 'success'
      });
    } catch (err) {
      setToast({
        show: true,
        title: 'Error al actualizar etiquetas',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'error'
      });
    } finally {
      setSavingContactId(null);
      setEditingField(null);
    }
  };

  // Componente InlineStageSelect - Unificado con color
  const InlineStageSelect = ({ contact }: { contact: Contact }) => {
    const currentStage = pipelineStages.find((s: PipelineStage) => s.id === contact.pipelineStageId);
    const isSaving = savingContactId === contact.id;

    const handleStageChange = (newStageId: string) => {
      const value = newStageId === 'none' ? null : newStageId;
      updateContactFieldLocal(contact.id, 'pipelineStageId', value);
    };

    if (isSaving) {
      return (
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span className="text-sm text-gray-500">Guardando...</span>
        </div>
      );
    }

    const stageColor = currentStage?.color || '#6B7280';
    
    return (
      <DropdownMenu
        trigger={
          <button
            type="button"
            className="flex items-center justify-between px-3 py-2 rounded-md border text-sm cursor-pointer hover:opacity-90 transition-opacity min-w-[140px]"
            style={{ 
              borderColor: stageColor,
              color: 'white',
              backgroundColor: stageColor,
              fontWeight: 500
            }}
          >
            <span>{currentStage?.name || 'Sin etapa'}</span>
            <Icon name="chevron-down" size={16} className="opacity-80" />
          </button>
        }
        side="bottom"
        align="start"
      >
        {pipelineStages.map((stage: PipelineStage) => (
          <DropdownMenuItem 
            key={stage.id} 
            onClick={() => handleStageChange(stage.id)}
          >
            <div className="flex items-center w-full">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: stage.color }}
              />
              <Text>{stage.name}</Text>
              {contact.pipelineStageId === stage.id && (
                <Icon name="check" size={16} className="ml-auto" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleStageChange('none')}>
          <Text>Sin etapa</Text>
          {!contact.pipelineStageId && (
            <Icon name="check" size={16} className="ml-auto" />
          )}
        </DropdownMenuItem>
      </DropdownMenu>
    );
  };

  // Componente InlineTagsEditor
  const InlineTagsEditor = ({ contact }: { contact: Contact }) => {
    const isSaving = savingContactId === contact.id;
    const [localTagIds, setLocalTagIds] = useState<string[]>(
      contact.tags?.map(tag => tag.id) || []
    );

    // Sincronizar estado local cuando cambian las etiquetas del contacto
    useEffect(() => {
      const currentTagIds = contact.tags?.map(tag => tag.id) || [];
      setLocalTagIds(currentTagIds);
    }, [contact.tags]);

    const handleTagToggle = async (tagId: string) => {
      const currentTagIds = contact.tags?.map(tag => tag.id) || [];
      const isCurrentlySelected = localTagIds.includes(tagId);
      
      let newTagIds: string[];
      let toAdd: string[] = [];
      let toRemove: string[] = [];

      if (isCurrentlySelected) {
        // Quitar etiqueta
        newTagIds = localTagIds.filter(id => id !== tagId);
        toRemove = [tagId];
      } else {
        // Agregar etiqueta
        newTagIds = [...localTagIds, tagId];
        toAdd = [tagId];
      }

      // Actualizar estado local inmediatamente para feedback visual
      setLocalTagIds(newTagIds);

      // Guardar cambios en el backend
      if (toAdd.length > 0 || toRemove.length > 0) {
        await updateContactTagsLocal(contact.id, toAdd, toRemove);
      }
    };

    // Selector minimalista que prioriza mostrar las etiquetas
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mostrar badges de etiquetas */}
        <div className="flex flex-wrap gap-1">
          {allTags
            .filter((tag: Tag) => localTagIds.includes(tag.id))
            .map((tag: Tag) => (
              <Badge key={tag.id} style={{ backgroundColor: tag.color, color: 'white' }}>
                {tag.name}
              </Badge>
            ))}
        </div>
        
        {/* Mostrar spinner si está guardando */}
        {isSaving && (
          <Spinner size="sm" />
        )}

        {/* Botón + para agregar etiquetas */}
        {!isSaving && (
          <DropdownMenu
            trigger={
              <button className="text-gray-400 hover:text-primary transition-colors">
                <Icon name="plus" size={16} />
              </button>
            }
          >
            {allTags.map((tag: Tag) => (
              <DropdownMenuItem key={tag.id} onClick={() => handleTagToggle(tag.id)}>
                <div className="flex items-center w-full">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: tag.color }}
                  />
                  <Text>{tag.name}</Text>
                  {localTagIds.includes(tag.id) && (
                    <Icon name="check" size={16} className="ml-auto" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowManageTagsModal(true)}>
              <Icon name="edit" size={16} className="mr-2" />
              Gestionar etiquetas
            </DropdownMenuItem>
          </DropdownMenu>
        )}
      </div>
    );
  };

  // Componente InlineTextInput
  const InlineTextInput = ({ contact, field, placeholder }: { contact: Contact; field: string; placeholder: string }) => {
    const [value, setValue] = useState(contact[field as keyof Contact] as string || '');
    const [isEditing, setIsEditing] = useState(false);
    const isSaving = savingContactId === contact.id;

    // Sincronizar valor cuando cambia el contacto (solo si no está editando)
    useEffect(() => {
      if (!isEditing) {
        setValue(contact[field as keyof Contact] as string || '');
      }
    }, [contact, field, isEditing]);

    const handleSave = async () => {
      const currentValue = contact[field as keyof Contact] as string || '';
      if (value !== currentValue && value.trim() !== '') {
        // Guardar siempre, incluso si el valor cambió
        await updateContactFieldLocal(contact.id, field, value);
      } else if (value === currentValue) {
        // Solo cerrar el editor si no hubo cambios
        setIsEditing(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setValue(contact[field as keyof Contact] as string || '');
        setIsEditing(false);
      }
    };

    if (isSaving) {
      return (
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span className="text-sm text-gray-500">Guardando...</span>
        </div>
      );
    }

    if (isEditing) {
      return (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus
          size="sm"
          className="min-w-[200px]"
        />
      );
    }

    return (
      <div 
        className="cursor-pointer hover:bg-gray-50 p-2 rounded border border-transparent hover:border-gray-300 transition-colors"
        onClick={() => setIsEditing(true)}
      >
        {contact[field as keyof Contact] ? String(contact[field as keyof Contact]) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </div>
    );
  };

  // Filtrar contactos
  // AI_DECISION: Remove redundant advisor filter from frontend - API already filters correctly
  // Justificación: The backend now properly filters by assignedAdvisorId, so frontend filtering
  // is redundant and could cause inconsistencies if API returns wrong data
  // Impacto: Simpler code, API is single source of truth for advisor filtering
  const filteredContacts = contacts.filter((contact: Contact) => {
    const matchesSearch = contact.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = selectedStage === 'all' || contact.pipelineStageId === selectedStage;
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tagId => contact.tags?.some(tag => tag.id === tagId));
    
    return matchesSearch && matchesStage && matchesTags;
  });

  // Configuración de columnas del DataTable
  const columns: Column<Contact>[] = [
    {
      key: 'fullName',
      header: 'Nombre',
      sortable: true,
      render: (contact) => (
        <Link href={`/contacts/${contact.id}`} className="block hover:opacity-80 transition-opacity">
          <Text weight="medium" className="text-primary cursor-pointer">{contact.fullName}</Text>
          {contact.email && (
            <Text size="sm" color="secondary">{contact.email}</Text>
          )}
        </Link>
      )
    },
    {
      key: 'pipelineStageId',
      header: 'Etapa',
      render: (contact) => <InlineStageSelect contact={contact} />
    },
    {
      key: 'tags',
      header: 'Etiquetas',
      render: (contact) => <InlineTagsEditor contact={contact} />
    },
    {
      key: 'nextStep',
      header: 'Próximo Paso',
      render: (contact) => <InlineTextInput contact={contact} field="nextStep" placeholder="Agregar próximo paso..." />
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (contact) => (
        <DropdownMenu
          trigger={
            <Button variant="ghost" size="sm">
              <Icon name="more-vertical" size={16} />
            </Button>
          }
        >
          <DropdownMenuItem onClick={() => router.push(`/contacts/${contact.id}`)}>
            <Icon name="edit" size={16} className="mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            setContactToDelete(contact);
            setShowDeleteModal(true);
          }}>
            <Icon name="trash-2" size={16} className="mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenu>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (localLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <Stack direction="column" gap="lg">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Heading level={3}>Contactos</Heading>
          </div>
          <Button onClick={() => router.push('/contacts/new')}>
            <Icon name="plus" size={16} className="mr-2" />
            Nuevo Contacto
          </Button>
        </div>

        {combinedError && (
          <Alert variant="error" title="Error">
            {combinedError instanceof Error ? combinedError.message : 'Error al cargar datos'}
          </Alert>
        )}

        {/* Filtros */}
        <Card className="rounded-md border border-neutral-200">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              {/* Primera fila: Controles en línea horizontal */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Input de búsqueda compacto con icono */}
                <div className="relative flex-1 min-w-[200px]">
                  <Input
                    placeholder="Buscar contactos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon="search"
                    size="sm"
                    className="w-full"
                  />
                </div>

                {/* Select de etapa */}
                <div className="min-w-[180px]">
                  <Select
                    value={selectedStage}
                    onValueChange={setSelectedStage}
                    items={[
                      { value: 'all', label: 'Todas las etapas' },
                      ...pipelineStages.map((stage: PipelineStage) => ({
                        value: stage.id,
                        label: stage.name
                      }))
                    ]}
                  />
                </div>

                {/* Dropdown de etiquetas */}
                <DropdownMenu
                  trigger={
                    <Button variant="outline">
                      Etiquetas ({selectedTags.length})
                      <Icon name="chevron-down" size={16} className="ml-2" />
                    </Button>
                  }
                >
                  {allTags.map((tag: Tag) => (
                    <DropdownMenuItem key={tag.id} onClick={() => handleTagToggle(tag.id)}>
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: tag.color }}
                        />
                        <Text>{tag.name}</Text>
                        {selectedTags.includes(tag.id) && (
                          <Icon name="check" size={16} className="ml-auto" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowManageTagsModal(true)}>
                    <Icon name="edit" size={16} className="mr-2" />
                    Gestionar etiquetas
                  </DropdownMenuItem>
                </DropdownMenu>

                {/* Toggle vista tabla/kanban */}
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'kanban')}>
                  <TabsList className="border border-gray-300 rounded-md overflow-hidden p-0 h-auto bg-white">
                    <TabsTrigger 
                      value="table" 
                      className="px-3 py-1.5 text-sm flex items-center gap-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-50"
                    >
                      <Icon name="list" size={16} />
                      <span className="text-xs">Tabla</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="kanban" 
                      className="px-3 py-1.5 text-sm flex items-center gap-1 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-700 data-[state=inactive]:hover:bg-gray-50"
                    >
                      <Icon name="grid" size={16} />
                      <span className="text-xs">Kanban</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Segunda fila: Chips de filtros activos */}
              {(selectedStage !== 'all' || selectedTags.length > 0 || searchTerm || advisorIdFilter) && (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-200">
                  {advisorIdFilter && filteredAdvisor && (
                    <Badge className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800">
                      Asesor: {filteredAdvisor.fullName}
                      <button 
                        onClick={clearAdvisorFilter}
                        className="ml-1 hover:opacity-70"
                        aria-label="Remover filtro de asesor"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedStage !== 'all' && (
                    <Badge className="flex items-center gap-1 px-2 py-1">
                      Etapa: {pipelineStages.find((s: PipelineStage) => s.id === selectedStage)?.name}
                      <button 
                        onClick={() => setSelectedStage('all')}
                        className="ml-1 hover:opacity-70"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {selectedTags.map(tagId => {
                    const tag = allTags.find((t: Tag) => t.id === tagId);
                    return tag ? (
                      <Badge 
                        key={tagId} 
                        className="flex items-center gap-1 px-2 py-1"
                        style={{ backgroundColor: tag.color, color: 'white' }}
                      >
                        {tag.name}
                        <button 
                          onClick={() => handleTagToggle(tagId)}
                          className="ml-1 hover:opacity-70"
                        >
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vista tabla o kanban */}
        {viewMode === 'table' ? (
          <Card className="rounded-md border border-neutral-200">
            <CardHeader className="p-4">
              <CardTitle className="text-base">
                Contactos ({filteredContacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <DataTable
                data={filteredContacts}
                columns={columns}
                keyField="id"
                emptyMessage="No se encontraron contactos. Intenta ajustar los filtros o crea tu primer contacto."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pipelineStages.map((stage: PipelineStage) => {
              const stageContacts = filteredContacts.filter((c: Contact) => c.pipelineStageId === stage.id);
              return (
                <Card key={stage.id} className="rounded-md border border-neutral-200">
                  <CardHeader className="p-4 border-b border-neutral-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <CardTitle className="text-sm font-semibold" style={{ color: stage.color }}>
                          {stage.name}
                        </CardTitle>
                      </div>
                      <Badge className="text-xs">
                        {stageContacts.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {stageContacts.length === 0 ? (
                        <Text color="secondary" className="text-center py-4 text-sm">
                          Sin contactos
                        </Text>
                      ) : (
                        stageContacts.map((contact: Contact) => (
                          <div 
                            key={contact.id} 
                            className="p-3 bg-gray-50 rounded-md border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-shadow cursor-pointer"
                            onClick={() => router.push(`/contacts/${contact.id}`)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <Text weight="medium" className="text-sm">{contact.fullName}</Text>
                                {contact.email && (
                                  <Text size="sm" color="secondary" className="text-xs mt-0.5">
                                    {contact.email}
                                  </Text>
                                )}
                              </div>
                              {contact.tags && contact.tags.length > 0 && (
                                <div className="flex gap-1 ml-2">
                                  {contact.tags.slice(0, 2).map(tag => (
                                    <Badge 
                                      key={tag.id} 
                                      className="text-[10px] px-1.5 py-0"
                                      style={{ backgroundColor: tag.color, color: 'white' }}
                                    >
                                      {tag.name}
                                    </Badge>
                                  ))}
                                  {contact.tags.length > 2 && (
                                    <Badge className="text-[10px] px-1.5 py-0 bg-gray-300 text-gray-700">
                                      +{contact.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        <Modal open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <ModalHeader>
            <ModalTitle>Confirmar eliminación</ModalTitle>
            <ModalDescription>
              ¿Estás seguro de que quieres eliminar el contacto &quot;{contactToDelete?.fullName}&quot;? Esta acción no se puede deshacer.
            </ModalDescription>
          </ModalHeader>
          <ModalContent>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleDeleteContact}>
                Eliminar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Modal de creación de etiqueta */}
        <Modal open={showCreateTagModal} onOpenChange={setShowCreateTagModal}>
          <ModalHeader>
            <ModalTitle>Crear nueva etiqueta</ModalTitle>
            <ModalDescription>
              Crea una nueva etiqueta para organizar tus contactos.
            </ModalDescription>
          </ModalHeader>
          <ModalContent>
            <Stack direction="column" gap="md">
              <Input
                label="Nombre de la etiqueta"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Ej: Cliente VIP, Prospecto caliente..."
              />
              <div>
                <Text size="sm" weight="medium" className="mb-2">Color</Text>
                <div className="flex gap-2">
                  {['#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'].map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newTagColor === color ? 'border-foreground-base' : 'border-border-base'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                    />
                  ))}
                </div>
              </div>
              <ModalFooter>
                <Button variant="secondary" onClick={() => setShowCreateTagModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTag}>
                  Crear etiqueta
                </Button>
              </ModalFooter>
            </Stack>
          </ModalContent>
        </Modal>

        {/* Modal de gestión de etiquetas */}
        <Modal open={showManageTagsModal} onOpenChange={setShowManageTagsModal}>
          <ModalHeader>
            <ModalTitle>Gestionar Etiquetas</ModalTitle>
            <ModalDescription>
              Edita o elimina etiquetas existentes. Los cambios se aplicarán a todos los contactos.
            </ModalDescription>
          </ModalHeader>
          <ModalContent>
            <Stack direction="column" gap="md">
              {isCreatingTag ? (
                // Vista de creación
                <>
                  <Input
                    label="Nombre de la etiqueta"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Ej: Cliente VIP, Prospecto caliente..."
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-full h-12 rounded-md cursor-pointer"
                    />
                  </div>
                  <ModalFooter>
                    <Button variant="secondary" onClick={() => setIsCreatingTag(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateTag}>
                      Crear etiqueta
                    </Button>
                  </ModalFooter>
                </>
              ) : tagToEdit ? (
                // Vista de edición
                <>
                  <Input
                    label="Nombre de la etiqueta"
                    value={editedTagName}
                    onChange={(e) => setEditedTagName(e.target.value)}
                    placeholder="Nombre de la etiqueta"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <input
                      type="color"
                      value={editedTagColor}
                      onChange={(e) => setEditedTagColor(e.target.value)}
                      className="w-full h-12 rounded-md cursor-pointer"
                    />
                  </div>
                  <ModalFooter>
                    <Button variant="secondary" onClick={() => setTagToEdit(null)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleEditTag}>
                      Guardar cambios
                    </Button>
                  </ModalFooter>
                </>
              ) : (
                // Lista de etiquetas
                <>
                  <div className="max-h-96 overflow-y-auto">
                    {allTags.length === 0 ? (
                      <Text color="secondary" className="text-center py-4">
                        No hay etiquetas creadas
                      </Text>
                    ) : (
                      <div className="space-y-2">
                        {allTags.map((tag: Tag) => (
                          <div key={tag.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: tag.color }}
                              />
                              <Text weight="medium">{tag.name}</Text>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditTag(tag)}
                              >
                                <Icon name="edit" size={16} className="mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTag(tag.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Icon name="trash-2" size={16} className="mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <ModalFooter>
                    <Button variant="secondary" onClick={() => {
                      setIsCreatingTag(true);
                      setNewTagName('');
                      setNewTagColor('#6B7280');
                    }}>
                      <Icon name="plus" size={16} className="mr-2" />
                      Nueva etiqueta
                    </Button>
                    <Button onClick={() => setShowManageTagsModal(false)}>
                      Cerrar
                    </Button>
                  </ModalFooter>
                </>
              )}
            </Stack>
          </ModalContent>
        </Modal>

        {/* Toast de notificaciones */}
        {toast.show && (
          <Toast
            title={toast.title}
            {...(toast.description ? { description: toast.description } : {})}
            variant={toast.variant}
            open={toast.show}
            onOpenChange={(open) => setToast(prev => ({ ...prev, show: open }))}
          />
        )}
      </Stack>
    </div>
  );
}