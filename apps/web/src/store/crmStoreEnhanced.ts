import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Contact, 
  ContactStatus, 
  Note,
  ConversionEvent,
  CRMState,
  ContactFilters,
  CONVERSION_PATHS,
  CRMViewType,
  Tag
} from '../types/crm';
import { useMetricsStore } from './metricsStore';
import { useDashboardStore } from './dashboardStore';
import { crmService, Contact as ServiceContact, ContactFilters as ServiceFilters } from '../services/crmService';
import { useUserValidation } from '../hooks/useUserValidation';
import { toast } from 'sonner';

// Función para generar IDs únicos
const generateId = (): string => {
  return crypto.randomUUID();
};

// Función para convertir Contact del servicio a Contact del store
const convertServiceContactToStoreContact = (serviceContact: ServiceContact): Contact => {
  return {
    id: serviceContact.id || generateId(),
    name: serviceContact.name,
    email: serviceContact.email,
    phone: serviceContact.phone,
    company: serviceContact.company,
    position: serviceContact.position,
    status: serviceContact.status as ContactStatus,
    stage: 'initial', // Mapear según sea necesario
    source: (serviceContact.source as 'website' | 'referral' | 'cold_call' | 'social_media' | 'event' | 'other') || 'other',
    assignedTo: serviceContact.user_id,
    value: 0, // El servicio no maneja value, mantener compatibilidad
    createdAt: serviceContact.created_at ? new Date(serviceContact.created_at) : new Date(),
    updatedAt: serviceContact.updated_at ? new Date(serviceContact.updated_at) : new Date(),
    lastContactDate: new Date(),
    tags: serviceContact.tags?.map(tag => ({
      id: generateId(),
      name: tag,
      color: '#3B82F6',
      backgroundColor: '#EBF8FF',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })) || [],
    notes: []
  };
};

// Función para convertir Contact del store a Contact del servicio
const convertStoreContactToServiceContact = (storeContact: Partial<Contact>, userId: string): Omit<ServiceContact, 'id' | 'created_at' | 'updated_at'> => {
  return {
    name: storeContact.name || '',
    email: storeContact.email || '',
    phone: storeContact.phone,
    company: storeContact.company,
    position: storeContact.position,
    status: (storeContact.status as any) || 'lead',
    source: storeContact.source,
    notes: storeContact.notes?.map(note => note.content).join('\n'),
    tags: storeContact.tags?.map(tag => tag.name),
    user_id: userId
  };
};

// Función para detectar conversiones
const checkForConversion = (
  fromStatus: ContactStatus, 
  toStatus: ContactStatus, 
  contact: Contact
): ConversionEvent | null => {
  const isConversion = CONVERSION_PATHS.some(
    path => path.from === fromStatus && path.to === toStatus
  );
  
  if (isConversion) {
    return {
      id: generateId(),
      contactId: contact.id,
      fromStatus,
      toStatus,
      timestamp: new Date(),
      userId: contact.assignedTo,
      value: contact.value
    };
  }
  
  return null;
};

// Filtros por defecto
const defaultFilters: ContactFilters = {
  status: undefined,
  assignedTo: undefined,
  dateRange: undefined,
  search: '',
  tags: []
};

// Store CRM mejorado con validaciones automáticas
export const useCRMStoreEnhanced = create<CRMState>()(persist(
  (set, get) => ({
    // Estado inicial
    contacts: [],
    selectedContact: null,
    filters: defaultFilters,
    isLoading: false,
    error: null,
    tags: [],
    view: 'list',
    viewType: 'list',
    hasMoreContacts: false,
    searchTerm: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    pagination: {
      page: 0,
      pageSize: 20,
      total: 0
    },
    conversions: [],
    notes: [],
    
    // Acciones principales con validaciones automáticas
    addContact: async (contactData) => {
      set({ isLoading: true, error: null });
      
      try {
        // Usar el servicio CRM mejorado que incluye validaciones automáticas
        const serviceContactData = convertStoreContactToServiceContact(contactData, contactData.assignedTo);
        const result = await crmService.createContact(serviceContactData);
        
        if (!result.success) {
          set({ isLoading: false, error: result.error });
          throw new Error(result.error);
        }
        
        // Convertir el contacto del servicio al formato del store
        const newContact = convertServiceContactToStoreContact(result.data!);
        
        // Actualizar estado local
        set(state => ({
          contacts: [...state.contacts, newContact],
          isLoading: false,
          error: null
        }));
        
        // Actualizar métricas
        useMetricsStore.getState().refreshMetrics();
        useDashboardStore.getState().refreshDashboard();
        
        return newContact;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al crear contacto';
        set({ isLoading: false, error: errorMessage });
        throw error;
      }
    },
    
    updateContact: async (id, updates) => {
      set({ isLoading: true, error: null });
      
      try {
        const currentContact = get().contacts.find(c => c.id === id);
        if (!currentContact) {
          throw new Error('Contacto no encontrado');
        }
        
        // Usar el servicio CRM mejorado
        const serviceUpdates = convertStoreContactToServiceContact(updates, currentContact.assignedTo);
        const result = await crmService.updateContact(id, serviceUpdates);
        
        if (!result.success) {
          set({ isLoading: false, error: result.error });
          throw new Error(result.error);
        }
        
        // Convertir y actualizar en el estado local
        const updatedContact = convertServiceContactToStoreContact(result.data!);
        
        set(state => ({
          contacts: state.contacts.map(contact => contact.id === id ? updatedContact : contact),
          selectedContact: state.selectedContact?.id === id ? updatedContact : state.selectedContact,
          isLoading: false,
          error: null
        }));
        
        // Actualizar métricas
        useMetricsStore.getState().refreshMetrics();
        useDashboardStore.getState().refreshDashboard();
        
        return updatedContact;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al actualizar contacto';
        set({ isLoading: false, error: errorMessage });
        throw error;
      }
    },
    
    deleteContact: async (id) => {
      set({ isLoading: true, error: null });
      
      try {
        // Usar el servicio CRM mejorado
        const result = await crmService.deleteContact(id);
        
        if (!result.success) {
          set({ isLoading: false, error: result.error });
          throw new Error(result.error);
        }
        
        // Actualizar estado local
        set(state => ({
          contacts: state.contacts.filter(contact => contact.id !== id),
          selectedContact: state.selectedContact?.id === id ? null : state.selectedContact,
          isLoading: false,
          error: null
        }));
        
        // Actualizar métricas
        useMetricsStore.getState().refreshMetrics();
        useDashboardStore.getState().refreshDashboard();
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al eliminar contacto';
        set({ isLoading: false, error: errorMessage });
        throw error;
      }
    },
    
    loadContacts: async (page = 0, pageSize = 50) => {
      set({ isLoading: true, error: null });
      
      try {
        // Obtener filtros actuales del estado
        const currentFilters = get().filters;
        
        // Convertir filtros del store a filtros del servicio
        const serviceFilters: ServiceFilters = {
          status: currentFilters?.status,
          search: currentFilters?.searchTerm,
          // Mapear otros filtros según sea necesario
        };
        
        // Usar el servicio CRM mejorado
        const result = await crmService.getContacts(serviceFilters);
        
        if (!result.success) {
          set({ isLoading: false, error: result.error });
          throw new Error(result.error);
        }
        
        // Convertir contactos del servicio al formato del store
        const contacts = result.data!.map(convertServiceContactToStoreContact);
        
        set({
          contacts,
          isLoading: false,
          error: null,
          pagination: {
            ...get().pagination,
            total: contacts.length
          }
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar contactos';
        set({ isLoading: false, error: errorMessage });
        throw error;
      }
    },
    
    // Función para validar y sincronizar usuario
    validateAndSyncUser: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const result = await crmService.forceSyncUser();
        
        if (!result.success) {
          set({ isLoading: false, error: result.error });
          return false;
        }
        
        set({ isLoading: false, error: null });
        toast.success('Usuario validado y sincronizado correctamente');
        return true;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error de validación';
        set({ isLoading: false, error: errorMessage });
        return false;
      }
    },
    
    // Función para verificar estado de sincronización
    checkSyncStatus: async () => {
      try {
        const result = await crmService.checkSyncStatus();
        
        if (result.success && result.data) {
          return result.data;
        }
        
        return { isSynced: false, message: result.error || 'Error desconocido' };
        
      } catch (error) {
        return { 
          isSynced: false, 
          message: error instanceof Error ? error.message : 'Error de verificación' 
        };
      }
    },
    
    // Mantener compatibilidad con funciones existentes
    updateContactStatus: async (id: string, status: ContactStatus) => {
      const contact = get().contacts.find(c => c.id === id);
      if (!contact) throw new Error('Contacto no encontrado');
      
      const oldStatus = contact.status;
      
      // Actualizar usando la función updateContact existente
      const updatedContact = await get().updateContact(id, { status });
      
      // Detectar conversión
      const conversion = checkForConversion(oldStatus, status, updatedContact);
      if (conversion) {
        set(state => ({
          conversions: [...state.conversions, conversion]
        }));
        
        // Actualizar métricas con la conversión
        useMetricsStore.getState().recordConversion(conversion);
      }
      
      return updatedContact;
    },
    
    // Funciones de UI y filtros (mantener compatibilidad)
    setSelectedContact: (contact) => set({ selectedContact: contact }),
    setFilters: (filters) => set({ filters }),
    setView: (view) => set({ view }),
    setViewType: (viewType) => set({ viewType, view: viewType }),
    setSearchTerm: (searchTerm) => set({ searchTerm }),
    setSortBy: (sortBy) => set({ sortBy }),
    setSortOrder: (sortOrder) => set({ sortOrder }),
    
    // Función para obtener contactos filtrados
    getFilteredContacts: () => {
      const state = get();
      let filtered = [...state.contacts];
      
      if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        filtered = filtered.filter(contact => 
          contact.name.toLowerCase().includes(search) ||
          contact.email.toLowerCase().includes(search) ||
          (contact.company && contact.company.toLowerCase().includes(search))
        );
      }
      
      if (state.filters.status && state.filters.status !== 'all') {
        filtered = filtered.filter(contact => contact.status === state.filters.status);
      }
      
      return filtered;
    },
    
    // Funciones de etiquetas (simplificadas)
    updateContactTags: async (contactId, tags) => {
      const contact = get().contacts.find(c => c.id === contactId);
      if (!contact) throw new Error('Contacto no encontrado');
      
      return await get().updateContact(contactId, { tags });
    },
    
    createTag: async (tagData: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newTag: Tag = {
        id: generateId(),
        name: tagData.name,
        color: tagData.color,
        backgroundColor: tagData.backgroundColor,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      set(state => ({
        tags: [...state.tags, newTag]
      }));
      
      return newTag;
    },
    
    // Función para filtrar por etiquetas
    setTagFilter: (tagIds) => {
      set(state => ({
        filters: {
          ...state.filters,
          tags: tagIds
        }
      }));
    },
    
    // Funciones de notas (simplificadas)
    addNote: async (contactId, noteData) => {
      const contact = get().contacts.find(c => c.id === contactId);
      if (!contact) throw new Error('Contacto no encontrado');
      
      const newNote: Note = {
        id: generateId(),
        content: noteData.content,
        type: noteData.type || 'general',
        createdAt: new Date(),
        createdBy: noteData.createdBy,
        author: noteData.author,
        date: new Date()
      };
      
      const updatedNotes = [...(contact.notes || []), newNote];
      await get().updateContact(contactId, { notes: updatedNotes });
      
      return newNote;
    },
    
    deleteNote: async (contactId, noteId) => {
      const contact = get().contacts.find(c => c.id === contactId);
      if (!contact) throw new Error('Contacto no encontrado');
      
      const updatedNotes = (contact.notes || []).filter(note => note.id !== noteId);
      await get().updateContact(contactId, { notes: updatedNotes });
    },
    
    // Funciones de paginación
    setPage: (page) => set(state => ({
      pagination: { ...state.pagination, page }
    })),
    
    setPageSize: (pageSize) => set(state => ({
      pagination: { ...state.pagination, pageSize, page: 0 }
    })),
    
    // Función de limpieza de errores
    clearError: () => set({ error: null }),

    // Funciones faltantes para completar la interfaz CRMState
    updateNote: async (contactId: string, noteId: string, updates: Partial<Note>) => {
      // Implementación básica - se puede expandir según necesidades
      const contact = get().contacts.find(c => c.id === contactId);
      if (!contact) return;
      
      const updatedNotes = (contact.notes || []).map(note => 
        note.id === noteId ? { ...note, ...updates } : note
      );
      
      const updatedContact = { ...contact, notes: updatedNotes };
      
      set(state => ({
        contacts: state.contacts.map(c => 
          c.id === contactId ? updatedContact : c
        )
      }));
    },

    updateTag: async (tagId: string, updates: Partial<Tag>) => {
      try {
        set(state => ({
          tags: state.tags.map(tag => 
            tag.id === tagId ? { ...tag, ...updates } : tag
          )
        }));
        return { success: true, message: 'Etiqueta actualizada correctamente' };
      } catch (error) {
        return { success: false, error: 'Error al actualizar etiqueta' };
      }
    },

    deleteTag: async (tagId: string) => {
      try {
        set(state => ({
          tags: state.tags.filter(tag => tag.id !== tagId)
        }));
        return { success: true, message: 'Etiqueta eliminada correctamente' };
      } catch (error) {
        return { success: false, error: 'Error al eliminar etiqueta' };
      }
    }
  }),
  {
    name: 'crm-store-enhanced',
    version: 1
  }
));

export default useCRMStoreEnhanced;