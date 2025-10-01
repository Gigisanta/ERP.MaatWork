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
import { supabase } from '@cactus/database';
import { useAuthStore } from './authStore';
import { executeWithRetry, withErrorHandling } from '../utils/supabaseErrorHandler';
import { EnhancedMetricsService } from '../services/enhancedMetricsService';
import { contactSchema, validateData } from '../schemas/validation';
import { logger, logTagOperation, logTagError, logContactOperation, logContactError } from '../utils/logger';

// Función para generar IDs únicos (UUID válidos)
const generateId = (): string => {
  return crypto.randomUUID();
};

// Función helper para serialización segura
const safeStringify = (obj: any, fallback: string = 'null'): string => {
  if (obj === null || obj === undefined) {
    return fallback;
  }
  
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('⚠️ Error serializando objeto, usando fallback:', error instanceof Error ? error.message : 'Error desconocido');
    
    // Intentar serializar propiedades básicas
    if (typeof obj === 'object' && obj !== null) {
      try {
        const safeObj = {
          id: obj.id,
          name: obj.name,
          color: obj.color,
          backgroundcolor: obj.backgroundcolor
        };
        return JSON.stringify(safeObj);
      } catch {
        return fallback;
      }
    }
    
    return String(obj);
  }
};

// Validaciones para etiquetas
const validateTagData = (tagData: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!tagData) {
    errors.push('Datos de etiqueta requeridos');
    return { isValid: false, errors };
  }
  
  if (!tagData.name || typeof tagData.name !== 'string' || tagData.name.trim().length === 0) {
    errors.push('Nombre de etiqueta es requerido');
  }
  
  if (tagData.name && tagData.name.length > 50) {
    errors.push('Nombre de etiqueta no puede exceder 50 caracteres');
  }
  
  if (!tagData.color || !/^#[0-9A-F]{6}$/i.test(tagData.color)) {
    errors.push('Color debe ser un código hexadecimal válido');
  }
  
  if (!tagData.backgroundColor || !/^#[0-9A-F]{6}$/i.test(tagData.backgroundColor)) {
    errors.push('Color de fondo debe ser un código hexadecimal válido');
  }
  
  return { isValid: errors.length === 0, errors };
};

const validateTagsArray = (tags: any[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!Array.isArray(tags)) {
    errors.push('Tags debe ser un array');
    return { isValid: false, errors };
  }
  
  tags.forEach((tag, index) => {
    if (!tag || typeof tag !== 'object') {
      errors.push(`Tag en posición ${index} no es un objeto válido`);
      return;
    }
    
    if (!tag.id || typeof tag.id !== 'string') {
      errors.push(`Tag en posición ${index} no tiene ID válido`);
    }
    
    if (!tag.name || typeof tag.name !== 'string') {
      errors.push(`Tag en posición ${index} no tiene nombre válido`);
    }
  });
  
  return { isValid: errors.length === 0, errors };
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

// Datos mock para desarrollo
const createMockContacts = (): Contact[] => {
  const mockContacts: Contact[] = [
    // Contactos asignados al Admin (Gio)
    {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan.perez@email.com',
      phone: '+1234567890',
      status: 'Primera Reunion',
      stage: 'qualified',
      source: 'website',
      assignedTo: '550e8400-e29b-41d4-a716-446655440000', // Admin Gio
      value: 50000,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
      lastContactDate: new Date('2024-01-20'),
      tags: [
        { id: 'tag1', name: 'VIP', color: '#10B981', backgroundColor: '#10B981', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'tag2', name: 'Urgente', color: '#EF4444', backgroundColor: '#EF4444', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ],
      notes: [
        {
          id: 'n1',
          content: 'Interesado en nuestros servicios de consultoría',
          type: 'meeting',
          createdAt: new Date('2024-01-20'),
          createdBy: '550e8400-e29b-41d4-a716-446655440000',
          author: 'Gio',
          date: new Date('2024-01-20')
        }
      ]
    },
    {
      id: '2',
      name: 'María García',
      email: 'maria.garcia@empresa.com',
      phone: '+1234567891',
      status: 'Segunda Reunion',
      stage: 'proposal',
      source: 'referral',
      assignedTo: '550e8400-e29b-41d4-a716-446655440000', // Admin Gio
      value: 75000,
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-25'),
      lastContactDate: new Date('2024-01-25'),
      tags: [
        { id: 'tag3', name: 'Empresa', color: '#3B82F6', backgroundColor: '#3B82F6', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ],
      notes: [
        {
          id: 'n2',
          content: 'Reunión de seguimiento programada',
          type: 'call',
          createdAt: new Date('2024-01-25'),
          createdBy: '550e8400-e29b-41d4-a716-446655440000',
          author: 'Gio',
          date: new Date('2024-01-25')
        }
      ]
    },
    // Contactos asignados a Mvicente
    {
      id: '3',
      name: 'Carlos López',
      email: 'carlos.lopez@startup.com',
      phone: '+1234567892',
      status: 'Contactado',
      stage: 'contacted',
      source: 'cold_call',
      assignedTo: '550e8400-e29b-41d4-a716-446655440001', // Mvicente
      value: 30000,
      createdAt: new Date('2024-01-25'),
      updatedAt: new Date('2024-01-26'),
      lastContactDate: new Date('2024-01-26'),
      tags: [
        { id: 'tag4', name: 'Startup', color: '#8B5CF6', backgroundColor: '#8B5CF6', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ],
      notes: []
    },
    {
      id: '4',
      name: 'Ana Rodríguez',
      email: 'ana.rodriguez@corp.com',
      phone: '+1234567893',
      status: 'Cliente',
      stage: 'closed_won',
      source: 'social_media',
      assignedTo: '550e8400-e29b-41d4-a716-446655440001', // Mvicente
      value: 100000,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      lastContactDate: new Date('2024-01-15'),
      tags: [
        { id: 'tag1', name: 'VIP', color: '#10B981', backgroundColor: '#10B981', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'tag5', name: 'Cliente', color: '#F59E0B', backgroundColor: '#F59E0B', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ],
      notes: [
        {
          id: 'n3',
          content: 'Cliente convertido exitosamente',
          type: 'general',
          createdAt: new Date('2024-01-15'),
          createdBy: '550e8400-e29b-41d4-a716-446655440001',
          author: 'Mvicente',
          date: new Date('2024-01-15')
        }
      ]
    },
    // Contactos asignados a Nzappia
    {
      id: '5',
      name: 'Roberto Silva',
      email: 'roberto.silva@business.com',
      phone: '+1234567894',
      status: 'Prospecto',
      stage: 'initial',
      source: 'event',
      assignedTo: '550e8400-e29b-41d4-a716-446655440002', // Nzappia
      value: 25000,
      createdAt: new Date('2024-01-28'),
      updatedAt: new Date('2024-01-28'),
      lastContactDate: new Date('2024-01-28'),
      tags: [],
      notes: []
    },
    {
      id: '6',
      name: 'Laura Fernández',
      email: 'laura.fernandez@tech.com',
      phone: '+1234567895',
      status: 'Primera Reunion',
      stage: 'qualified',
      source: 'social_media',
      assignedTo: '550e8400-e29b-41d4-a716-446655440002', // Nzappia
      value: 45000,
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-22'),
      lastContactDate: new Date('2024-01-22'),
      tags: [
        { id: 'tag6', name: 'Tech', color: '#6366F1', backgroundColor: '#6366F1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ],
      notes: [
        {
          id: 'n4',
          content: 'Interesada en soluciones tecnológicas',
          type: 'meeting',
          createdAt: new Date('2024-01-22'),
          createdBy: '550e8400-e29b-41d4-a716-446655440002',
          author: 'Nzappia',
          date: new Date('2024-01-22')
        }
      ]
    },
    // Contactos asignados a TDanziger
    {
      id: '7',
      name: 'Miguel Torres',
      email: 'miguel.torres@consulting.com',
      phone: '+1234567896',
      status: 'Segunda Reunion',
      stage: 'proposal',
      source: 'referral',
      assignedTo: '550e8400-e29b-41d4-a716-446655440003', // TDanziger
      value: 80000,
      createdAt: new Date('2024-01-12'),
      updatedAt: new Date('2024-01-24'),
      lastContactDate: new Date('2024-01-24'),
      tags: [
        { id: 'tag7', name: 'Consulting', color: '#F97316', backgroundColor: '#F97316', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ],
      notes: []
    },
    {
      id: '8',
      name: 'Patricia Morales',
      email: 'patricia.morales@finance.com',
      phone: '+1234567897',
      status: 'Contactado',
      stage: 'contacted',
      source: 'website',
      assignedTo: '550e8400-e29b-41d4-a716-446655440003', // TDanziger
      value: 35000,
      createdAt: new Date('2024-01-26'),
      updatedAt: new Date('2024-01-27'),
      lastContactDate: new Date('2024-01-27'),
      tags: [
        { id: 'tag8', name: 'Finance', color: '#059669', backgroundColor: '#059669', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ],
      notes: []
    }
  ];
  
  return mockContacts;
};

const defaultFilters: ContactFilters = {
  status: undefined,
  assignedTo: undefined,
  dateRange: undefined,
  searchTerm: ''
};

export const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      contacts: [],
      selectedContact: null,
      filters: {
        search: '',
        status: 'all',
        stage: 'all',
        assignedTo: 'all'
      },
      isLoading: false,
      viewType: 'grid',
      view: 'grid',
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
      error: null,
      hasMoreContacts: false,
      tags: (() => {
        // Cargar etiquetas desde localStorage al inicializar
        try {
          const savedTags = localStorage.getItem('crm-tags');
          if (savedTags) {
            return JSON.parse(savedTags);
          } else {
            // Si no hay etiquetas guardadas, extraer etiquetas únicas de los contactos mock
            const mockContacts = createMockContacts();
            const uniqueTags = new Map();
            
            mockContacts.forEach(contact => {
              contact.tags?.forEach(tag => {
                uniqueTags.set(tag.id, tag);
              });
            });
            
            const defaultTags = Array.from(uniqueTags.values());
            
            // Guardar las etiquetas por defecto en localStorage
            localStorage.setItem('crm-tags', JSON.stringify(defaultTags));
            
            return defaultTags;
          }
        } catch (error) {
          console.error('Error loading tags from localStorage:', error);
          return [];
        }
      })(),
      
      // Realtime subscription reference
      _contactsSubscription: undefined as unknown as ReturnType<typeof supabase.channel> | undefined,

      // Cargar etiquetas desde localStorage
      loadTagsFromStorage: () => {
        try {
          const savedTags = localStorage.getItem('crm-tags');
          if (savedTags) {
            const parsedTags = JSON.parse(savedTags);
            set(state => ({ tags: parsedTags }));
          } else {
            // Si no hay etiquetas guardadas, extraer etiquetas únicas de los contactos mock
            const mockContacts = createMockContacts();
            const uniqueTags = new Map();
            
            mockContacts.forEach(contact => {
              contact.tags?.forEach(tag => {
                uniqueTags.set(tag.id, tag);
              });
            });
            
            const defaultTags = Array.from(uniqueTags.values());
            
            // Guardar las etiquetas por defecto en localStorage
            localStorage.setItem('crm-tags', JSON.stringify(defaultTags));
            
            set(state => ({ tags: defaultTags }));
          }
        } catch (error) {
          console.error('Error loading tags from localStorage:', error);
        }
      },

      // Cargar etiquetas desde Supabase
      fetchTags: async () => {
        try {
          console.log('🏷️ Cargando etiquetas desde Supabase...');
          
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) {
            console.warn('⚠️ Usuario no autenticado, no se pueden cargar etiquetas');
            return;
          }

          const { data: tags, error } = await supabase
            .from('tags')
            .select('*')
            .order('name', { ascending: true });

          if (error) {
            console.error('❌ Error cargando etiquetas desde Supabase:', error);
            throw new Error(`Error de base de datos: ${error.message}`);
          }

          // Convertir formato de Supabase al formato local
          const formattedTags = (tags || []).map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            backgroundColor: tag.backgroundcolor || tag.backgroundColor || '#3B82F6', // Compatibilidad con ambos nombres
            createdAt: tag.created_at ? new Date(tag.created_at).toISOString() : new Date().toISOString(),
            updatedAt: tag.updated_at ? new Date(tag.updated_at).toISOString() : new Date().toISOString()
          }));

          console.log('✅ Etiquetas cargadas desde Supabase:', formattedTags.length, 'etiquetas');
          
          // Actualizar estado local
          set({ tags: formattedTags });
          
          // Guardar en localStorage para cache
          try {
            localStorage.setItem('crm-tags', JSON.stringify(formattedTags));
          } catch (storageError) {
            console.warn('⚠️ Error guardando etiquetas en localStorage:', storageError);
          }
          
          return formattedTags;
        } catch (error) {
          console.error('❌ Error en fetchTags:', error);
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          
          // En caso de error, intentar cargar desde localStorage como fallback
          try {
            const savedTags = localStorage.getItem('crm-tags');
            if (savedTags) {
              const parsedTags = JSON.parse(savedTags);
              console.log('📦 Usando etiquetas desde localStorage como fallback');
              set({ tags: parsedTags });
              return parsedTags;
            }
          } catch (fallbackError) {
            console.error('❌ Error en fallback de localStorage:', fallbackError);
          }
          
          // Si todo falla, mantener etiquetas vacías
          set({ tags: [] });
          throw new Error(`No se pudieron cargar las etiquetas: ${errorMessage}`);
        }
      },

      clearError: () => set({ error: null }),

      startContactsSubscription: async () => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;
        // Evitar duplicar suscripción
        if ((get() as any)._contactsSubscription) return;

        const channel = supabase
          .channel(`contacts-${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'contacts',
              filter: `assigned_to=eq.${currentUser.id}`
            },
            (payload: any) => {
              const { eventType, new: newRow, old: oldRow } = payload;
              set(state => {
                if (eventType === 'INSERT') {
                  const contact: Contact = {
                    id: newRow.id,
                    name: newRow.name,
                    email: newRow.email || '',
                    phone: newRow.phone || '',
                    company: newRow.company || '',
                    status: newRow.status,
                    stage: newRow.stage || 'initial',
                    assignedTo: useAuthStore.getState().user?.name || '',
                    value: parseFloat(newRow.value) || 0,
                    notes: newRow.notes ? (typeof newRow.notes === 'string' ? JSON.parse(newRow.notes) : newRow.notes) : [],

                    lastContactDate: newRow.last_contact_date ? new Date(newRow.last_contact_date) : new Date(),
                    createdAt: newRow.created_at ? new Date(newRow.created_at) : new Date(),
                    updatedAt: newRow.updated_at ? new Date(newRow.updated_at) : new Date()
                  };
                  return { contacts: [contact, ...state.contacts.filter(c => c.id !== contact.id)] };
                }
                if (eventType === 'UPDATE') {
                  const idx = state.contacts.findIndex(c => c.id === newRow.id);
                  if (idx === -1) return state;
                  const updated: Contact = {
                    ...state.contacts[idx],
                    name: newRow.name,
                    email: newRow.email || '',
                    phone: newRow.phone || '',
                    company: newRow.company || '',
                    status: newRow.status,
                    stage: newRow.stage || 'initial',
                    value: parseFloat(newRow.value) || 0,
                    notes: newRow.notes ? (typeof newRow.notes === 'string' ? JSON.parse(newRow.notes) : newRow.notes) : [],

                    lastContactDate: newRow.last_contact_date ? new Date(newRow.last_contact_date) : state.contacts[idx].lastContactDate,
                    updatedAt: newRow.updated_at ? new Date(newRow.updated_at) : new Date()
                  };
                  const copy = [...state.contacts];
                  copy[idx] = updated;
                  return { contacts: copy };
                }
                if (eventType === 'DELETE') {
                  return { contacts: state.contacts.filter(c => c.id !== oldRow.id) };
                }
                return state;
              });
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // Cargar snapshot inicial
              get().loadContacts();
            }
          });

        (get() as any)._contactsSubscription = channel as any;
      },

      stopContactsSubscription: async () => {
        const ch = (get() as any)._contactsSubscription;
        if (ch) {
          await supabase.removeChannel(ch as any);
          (get() as any)._contactsSubscription = undefined;
        }
      },

      addContact: async (contactData) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          set({ error: 'Usuario no autenticado' });
          throw new Error('Usuario no autenticado');
        }

        // Limpiar error previo
        set({ error: null });

        // Validar datos con Zod
        const validationResult = validateData(contactSchema, {
          ...contactData,
          assigned_to: currentUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        if (!validationResult.success) {
          const errorMessage = 'errors' in validationResult ? validationResult.errors.join(', ') : 'Error de validación';
          set({ error: errorMessage });
          throw new Error(errorMessage);
        }

        // Validaciones
        if (!contactData.name?.trim()) {
          const errorMsg = 'El nombre es requerido';
          set({ error: errorMsg });
          throw new Error(errorMsg);
        }



        // Validar formato de teléfono si se proporciona
        if (contactData.phone?.trim()) {
          const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
          if (!phoneRegex.test(contactData.phone.replace(/\s+/g, ''))) {
            const errorMsg = 'El formato del teléfono no es válido';
            set({ error: errorMsg });
            throw new Error(errorMsg);
          }
        }

        // Validar formato de email si se proporciona
        if (contactData.email?.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(contactData.email)) {
            const errorMsg = 'El formato del email no es válido';
            set({ error: errorMsg });
            throw new Error(errorMsg);
          }
        }

        // Email y teléfono son opcionales - no se requiere validación obligatoria

        // Validar email único solo si se proporciona email
        if (contactData.email?.trim()) {
          const existingEmailContact = get().contacts.find(
            contact => contact.email.toLowerCase() === contactData.email.toLowerCase()
          );
          if (existingEmailContact) {
            const errorMsg = 'Ya existe un contacto con este email';
            set({ error: errorMsg });
            throw new Error(errorMsg);
          }

          // Verificar email único en base de datos
          try {
            const { data: emailCheck } = await supabase
              .from('contacts')
              .select('id')
              .eq('email', contactData.email.trim().toLowerCase())
              .eq('assigned_to', currentUser.id)
              .single();
            
            if (emailCheck) {
              const errorMsg = 'Ya existe un contacto con este email';
              set({ error: errorMsg });
              throw new Error(errorMsg);
            }
          } catch (error) {
            // Si el error no es "no rows found", es un error real
            if (error.code !== 'PGRST116') {
              const errorMsg = 'Error al verificar email único';
              set({ error: errorMsg });
              throw new Error(errorMsg);
            }
          }
        }

        // Validar teléfono único solo si se proporciona teléfono
        if (contactData.phone?.trim()) {
          const existingPhoneContact = get().contacts.find(
            contact => contact.phone === contactData.phone.trim()
          );
          if (existingPhoneContact) {
            const errorMsg = 'Ya existe un contacto con este teléfono';
            set({ error: errorMsg });
            throw new Error(errorMsg);
          }

          // Verificar teléfono único en base de datos
          try {
            const { data: phoneCheck } = await supabase
              .from('contacts')
              .select('id')
              .eq('phone', contactData.phone.trim())
              .eq('assigned_to', currentUser.id)
              .single();
            
            if (phoneCheck) {
              const errorMsg = 'Ya existe un contacto con este teléfono';
              set({ error: errorMsg });
              throw new Error(errorMsg);
            }
          } catch (error) {
            // Si el error no es "no rows found", es un error real
            if (error.code !== 'PGRST116') {
              const errorMsg = 'Error al verificar teléfono único';
              set({ error: errorMsg });
              throw new Error(errorMsg);
            }
          }
        }

        const dbId = crypto.randomUUID();
        const newContact: Contact = {
          ...contactData,
          name: contactData.name.trim(),
          email: contactData.email?.trim() ? contactData.email.trim().toLowerCase() : undefined,
          phone: contactData.phone?.trim() || undefined,
    
          status: contactData.status || 'Prospecto',
          stage: contactData.stage || 'initial',
          id: dbId,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastContactDate: new Date(),
          notes: Array.isArray(contactData.notes) ? contactData.notes : []
        };

        set({ isLoading: true });

        try {
          // Insertar en Supabase con executeWithRetry para manejar errores de red
          const supabaseContact = await executeWithRetry(async () => {
            const { data, error: insertError } = await supabase
              .from('contacts')
              .insert({
                id: dbId,
                name: newContact.name,
                email: newContact.email || null,
                phone: newContact.phone || null, // Enviar null si no hay teléfono
                company: newContact.company || '',
                status: newContact.status,
                stage: newContact.stage,
                assigned_to: currentUser.id,
                value: newContact.value || 0,
                notes: JSON.stringify(newContact.notes || []),
                last_contact_date: newContact.lastContactDate.toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error al insertar en Supabase:', insertError);
              let errorMsg = 'Error al guardar el contacto';
              
              // Manejar errores específicos de Supabase
              if (insertError.code === '23505') {
                if (insertError.message.includes('email')) {
                  errorMsg = 'Ya existe un contacto con este email';
                } else if (insertError.message.includes('phone')) {
                  errorMsg = 'Ya existe un contacto con este teléfono';
                } else {
                  errorMsg = 'Ya existe un contacto con estos datos';
                }
              } else if (insertError.code === '23514') {
                errorMsg = 'Los datos del contacto no son válidos';
              }
              
              throw new Error(errorMsg);
            }
            
            return data;
          }, 3, 1000, 'crear contacto');

          // Actualizar estado local con datos confirmados de la base de datos
          const contactFromSupabase: Contact = {
            ...newContact,
            id: supabaseContact.id,
            createdAt: new Date(supabaseContact.created_at),
            updatedAt: new Date(supabaseContact.updated_at),
            lastContactDate: supabaseContact.last_contact_date ? new Date(supabaseContact.last_contact_date) : new Date()
          };
          
          set(state => ({
            contacts: [...state.contacts, contactFromSupabase],
            isLoading: false,
            error: null
          }));
          
          // Actualizar métricas
          useMetricsStore.getState().refreshMetrics();
          useDashboardStore.getState().refreshDashboard();
          
          return contactFromSupabase;
        } catch (error) {
          set({ isLoading: false });
          console.error('Error al agregar contacto:', error);
          
          // Manejar errores de conectividad específicos
          let errorMsg = 'Error desconocido al agregar contacto';
          
          if (error.message) {
            if (error.message.includes('Failed to fetch') || error.message.includes('ERR_ABORTED')) {
              errorMsg = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
            } else if (error.message.includes('timeout')) {
              errorMsg = 'La operación tardó demasiado. Intenta nuevamente.';
            } else {
              errorMsg = error.message;
            }
          }
          
          set({ error: errorMsg });
          throw new Error(errorMsg);
        }
      },
      
      updateContact: async (id, updates) => {
        const currentContact = get().contacts.find(c => c.id === id);
        if (!currentContact) throw new Error('Contact not found');
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) throw new Error('Debes iniciar sesión');
        
        const updatedContact = {
          ...currentContact,
          ...updates,
          id,
          updatedAt: new Date()
        };
        
        // Persistir en Supabase
        await executeWithRetry(async () => {
          const { error } = await supabase
            .from('contacts')
            .update({
              name: updatedContact.name,
              email: updatedContact.email,
              phone: updatedContact.phone,
              company: updatedContact.company || '',
              status: updatedContact.status,
              stage: updatedContact.stage,
              value: updatedContact.value || 0,
              notes: JSON.stringify(updatedContact.notes || []),
              tags: JSON.stringify(updatedContact.tags || []),
              last_contact_date: updatedContact.lastContactDate?.toISOString(),
              updated_at: updatedContact.updatedAt.toISOString()
            })
            .eq('id', id)
            .eq('assigned_to', currentUser.id);
          if (error) throw error;
        }, 3, 1000, 'actualizar contacto');

        // Actualizar estado local
        set(state => ({
          contacts: state.contacts.map(contact => contact.id === id ? updatedContact : contact),
          selectedContact: state.selectedContact?.id === id ? updatedContact : state.selectedContact
        }));
        
        // Actualizar métricas
        useMetricsStore.getState().refreshMetrics();
        useDashboardStore.getState().refreshDashboard();
        
        return updatedContact;
      },

      // Funciones para manejar etiquetas
      updateContactTags: async (contactId, tags) => {
        logContactOperation('updateContactTags_start', contactId, { tagCount: tags.length });
        
        try {
          const { contacts } = get();
          const contact = contacts.find(c => c.id === contactId);
          
          if (!contact) {
            const errorMsg = `Contacto con ID ${contactId} no encontrado`;
            console.error('❌', errorMsg);
            const error = new Error(errorMsg);
            logContactError('updateContactTags_notfound', error, contactId);
            throw error;
          }

          // Validar array de tags
          const validation = validateTagsArray(tags);
          if (!validation.isValid) {
            const errorMsg = `Datos de tags inválidos: ${validation.errors.join(', ')}`;
            console.error('❌', errorMsg);
            const error = new Error(errorMsg);
            logContactError('updateContactTags_validation', error, contactId, { validationErrors: validation.errors });
            throw error;
          }

          console.log('🏷️ Actualizando tags para contacto:', contactId, 'Tags:', safeStringify(tags));
        
          const updatedContact = {
            ...contact,
            tags,
            updatedAt: new Date()
          };
          
          // Actualizar en Supabase usando executeWithRetry
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) {
            console.error('❌ Error: Usuario no autenticado al actualizar etiquetas');
            throw new Error('Debes iniciar sesión para actualizar etiquetas');
          }
          
          if (currentUser) {
            const supabaseResult = await executeWithRetry(async () => {
              const { error } = await supabase
                .from('contacts')
                .update({
                  tags: JSON.stringify(tags),
                  updated_at: updatedContact.updatedAt.toISOString()
                })
                .eq('id', contactId)
                .eq('assigned_to', currentUser.id);
              
              if (error) {
                console.error('❌ Error de Supabase actualizando tags:', safeStringify(error));
                throw new Error(`Error de base de datos: ${error.message || 'Error desconocido'}`);
              }

              return { success: true };
            }, 3, 1000, 'actualizar etiquetas');

            if (!supabaseResult.success) {
              throw new Error('No se pudo actualizar las etiquetas en la base de datos');
            }
          }
          
          // Actualizar estado local
          set(state => {
            const updatedContacts = state.contacts.map(c => 
              c.id === contactId ? updatedContact : c
            );
            
            // Guardar contactos actualizados en localStorage si es necesario
            try {
              localStorage.setItem('crm-contacts-tags', JSON.stringify(
                updatedContacts.map(c => ({ id: c.id, tagIds: c.tags?.map(t => t.id) || [] }))
              ));
            } catch (storageError) {
              console.warn('⚠️ Error guardando en localStorage:', storageError instanceof Error ? storageError.message : 'Error desconocido');
            }
            
            return {
              contacts: updatedContacts,
              selectedContact: state.selectedContact?.id === contactId 
                ? updatedContact 
                : state.selectedContact
            };
          });
          
          console.log('✅ Tags actualizados exitosamente para contacto:', contactId);
          logContactOperation('updateContactTags_success', contactId, { tagCount: tags.length });
          return updatedContact;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido actualizando tags';
          console.error('❌ Error actualizando tags del contacto:', errorMessage);
          logContactError('updateContactTags_unexpected', error as Error, contactId);
          
          throw error;
        }
      },

      createTag: async (tagData) => {
        logTagOperation('createTag_start', tagData);
        
        try {
          console.log('🏷️ [DEBUG] Iniciando creación de tag:', safeStringify(tagData));
          
          // LOG 1: Verificar estado de autenticación inicial
          const authState = useAuthStore.getState();
          console.log('🔐 [DEBUG LOG 1] Estado de autenticación inicial:');
          console.log('   - isAuthenticated:', authState.isAuthenticated);
          console.log('   - user existe:', !!authState.user);
          console.log('   - user.id:', authState.user?.id || 'NO DISPONIBLE');
          console.log('   - user.email:', authState.user?.email || 'NO DISPONIBLE');
          
          // LOG 2: Verificar sesión de Supabase directamente
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          console.log('🔐 [DEBUG LOG 2] Sesión de Supabase:');
          console.log('   - session existe:', !!session);
          console.log('   - session.user.id:', session?.user?.id || 'NO DISPONIBLE');
          console.log('   - session.access_token existe:', !!session?.access_token);
          console.log('   - sessionError:', sessionError?.message || 'ninguno');
          
          // LOG 3: Verificar auth.uid() directamente
          try {
            const { data: authUid, error: uidError } = await supabase.rpc('auth.uid');
            console.log('🔐 [DEBUG LOG 3] auth.uid() directo:');
            console.log('   - authUid:', authUid || 'NO DISPONIBLE');
            console.log('   - uidError:', uidError?.message || 'ninguno');
          } catch (rpcError) {
            console.log('🔐 [DEBUG LOG 3] Error en auth.uid():', rpcError);
          }
          
          // Validar datos de entrada
          const validation = validateTagData(tagData);
          if (!validation.isValid) {
            const errorMsg = `Datos de tag inválidos: ${validation.errors.join(', ')}`;
            console.error('❌', errorMsg);
            const error = new Error(errorMsg);
            logTagError('createTag_validation', error, tagData);
            throw error;
          }

          const { tags } = get();
          
          // Verificar duplicados por nombre (case-insensitive)
          const existingTag = tags.find(tag => 
            tag.name.toLowerCase().trim() === tagData.name.toLowerCase().trim()
          );
          
          if (existingTag) {
            const errorMsg = `Ya existe una etiqueta con el nombre "${tagData.name}"`;
            console.warn('⚠️', errorMsg);
            const error = new Error(errorMsg);
            logTagError('createTag_duplicate', error, tagData);
            throw error;
          }

          // Crear nuevo tag (sin ID, Supabase lo generará automáticamente)
          const newTagData = {
            name: tagData.name.trim(),
            color: tagData.color,
            backgroundcolor: tagData.backgroundColor
          };

          console.log('✨ Creando nuevo tag:', safeStringify(newTagData));

          // LOG 4: Verificar usuario antes de inserción
          const currentUser = useAuthStore.getState().user;
          console.log('🔐 [DEBUG LOG 4] Usuario antes de inserción:');
          console.log('   - currentUser existe:', !!currentUser);
          console.log('   - currentUser.id:', currentUser?.id || 'NO DISPONIBLE');
          
          if (!currentUser) {
            console.error('❌ Error: Usuario no autenticado al crear etiqueta');
            throw new Error('Debes iniciar sesión para crear etiquetas');
          }
          
          // Usar sesión de Supabase directamente para obtener el user_id correcto
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          let userId: string;
          
          if (currentSession?.user?.id) {
            // Usar ID de sesión de Supabase si está disponible
            userId = currentSession.user.id;
            console.log('✅ Usando ID de sesión de Supabase:', userId);
          } else {
            // Fallback: usar ID del usuario del authStore
            console.log('⚠️ No hay sesión activa de Supabase, usando usuario del authStore como fallback');
            
            if (!currentUser?.id) {
              console.error('❌ Error: No hay usuario autenticado disponible');
              throw new Error('No hay sesión activa de Supabase');
            }
            
            userId = currentUser.id;
            console.log('✅ Usando ID del authStore como fallback:', userId);
          }
          
          // LOG 5: Datos que se van a insertar (sin ID, Supabase lo generará)
          const insertData = {
            name: newTagData.name,
            color: newTagData.color,
            backgroundcolor: newTagData.backgroundcolor,
            created_by: userId // Usar ID determinado (Supabase o authStore)
          };
          console.log('🔐 [DEBUG LOG 5] Datos para insertar en Supabase:');
          console.log('   - insertData:', safeStringify(insertData));
          console.log('   - created_by (UUID):', userId);
          console.log('   - Fuente del ID:', currentSession?.user?.id ? 'Sesión Supabase' : 'AuthStore Fallback');
          
          const supabaseResult = await executeWithRetry(async () => {
            // LOG 6: Verificar sesión justo antes de la inserción
            const { data: { session: preInsertSession } } = await supabase.auth.getSession();
            console.log('🔐 [DEBUG LOG 6] Sesión justo antes de insertar:');
            console.log('   - preInsertSession existe:', !!preInsertSession);
            console.log('   - preInsertSession.user.id:', preInsertSession?.user?.id || 'NO DISPONIBLE');
            
            // Insertar y obtener el registro creado con su ID generado
            const { data: createdTag, error } = await supabase
              .from('tags')
              .insert(insertData)
              .select()
              .single();

            if (error) {
              console.error('❌ [DEBUG] Error de Supabase creando tag:', safeStringify(error));
              console.error('   - error.code:', error.code);
              console.error('   - error.message:', error.message);
              console.error('   - error.details:', error.details);
              console.error('   - error.hint:', error.hint);
              throw new Error(`Error de base de datos: ${error.message || 'Error desconocido'}`);
            }

            console.log('✅ [DEBUG] Inserción en Supabase exitosa, tag creado:', safeStringify(createdTag));
            return { success: true, createdTag };
          }, 3, 1000, 'crear etiqueta');

          if (!supabaseResult.success) {
            throw new Error('No se pudo crear la etiqueta en la base de datos');
          }
          
          // Usar el tag creado por Supabase con su ID real
          const newTag: Tag = {
            id: supabaseResult.createdTag.id,
            name: supabaseResult.createdTag.name,
            color: supabaseResult.createdTag.color,
            backgroundColor: supabaseResult.createdTag.backgroundcolor,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Actualizar estado local
          const updatedTags = [...tags, newTag];
          set({ tags: updatedTags });
          
          // Guardar en localStorage con manejo de errores
          try {
            localStorage.setItem('crm-tags', JSON.stringify(updatedTags));
          } catch (storageError) {
            console.warn('⚠️ Error guardando tags en localStorage:', storageError instanceof Error ? storageError.message : 'Error desconocido');
          }
          
          console.log('✅ Tag creado exitosamente:', newTag.id, newTag.name);
          logTagOperation('createTag_success', newTag);
          return newTag;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido creando tag';
          console.error('❌ Error creando tag:', errorMessage);
          logTagError('createTag_unexpected', error as Error, tagData);
          
          // Manejo mejorado de errores de autenticación
          if (errorMessage.includes('JWT') || errorMessage.includes('session') || errorMessage.includes('auth')) {
            console.log('🔄 Detectado error de autenticación, intentando recuperación...');
            
            try {
              // Intentar refrescar la sesión
              const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError || !session) {
                console.log('❌ No se pudo refrescar la sesión, redirigiendo al login...');
                
                // Limpiar estado de autenticación
                const authStore = useAuthStore.getState();
                authStore.logout();
                
                throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
              }
              
              console.log('✅ Sesión refrescada, reintentando creación de tag...');
              
              // Reintentar la operación con la sesión refrescada
              const retryInsertData = {
                name: tagData.name.trim(),
                color: tagData.color,
                backgroundcolor: tagData.backgroundColor,
                created_by: session.user.id // Usar ID de la sesión refrescada
              };
              
              const { data: retryCreatedTag, error: retryError } = await supabase
                .from('tags')
                .insert(retryInsertData)
                .select()
                .single();
              
              if (retryError) {
                throw new Error(`Error después de refrescar sesión: ${retryError.message}`);
              }
              
              // Actualizar estado local con el tag creado en el retry
              const newTag: Tag = {
                id: retryCreatedTag.id,
                name: retryCreatedTag.name,
                color: retryCreatedTag.color,
                backgroundColor: retryCreatedTag.backgroundcolor,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              
              const { tags } = get();
              const updatedTags = [...tags, newTag];
              set({ tags: updatedTags });
              
              try {
                localStorage.setItem('crm-tags', JSON.stringify(updatedTags));
              } catch (storageError) {
                console.warn('⚠️ Error guardando tags en localStorage:', storageError);
              }
              
              console.log('✅ Tag creado exitosamente después de recuperación:', newTag.id);
              return newTag;
              
            } catch (recoveryError) {
              console.error('❌ Error en recuperación de autenticación:', recoveryError);
              
              throw new Error('Error de autenticación. Por favor, inicia sesión nuevamente.');
            }
          }
          
          // Para otros tipos de errores, análisis específico
          let userFriendlyError = errorMessage;
          let actionRequired = null;
          
          if (errorMessage.includes('permission denied') || errorMessage.includes('42501')) {
            userFriendlyError = 'No tienes permisos para crear etiquetas. Contacta al administrador.';
            actionRequired = 'CONTACT_ADMIN';
          } else if (errorMessage.includes('duplicate') || errorMessage.includes('23505')) {
            userFriendlyError = 'Ya existe una etiqueta con ese nombre. Elige un nombre diferente.';
            actionRequired = 'CHANGE_NAME';
          } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            userFriendlyError = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.';
            actionRequired = 'RETRY';
          } else if (errorMessage.includes('uuid') || errorMessage.includes('22P02')) {
            userFriendlyError = 'Error interno del sistema. El problema ha sido reportado automáticamente.';
            actionRequired = 'CONTACT_SUPPORT';
          }
          
          throw new Error(userFriendlyError);
        }
      },

      deleteTag: async (tagId) => {
        console.log('🗑️ [DEBUG] Iniciando eliminación de tag:', tagId);
        
        try {
          const { tags, contacts } = get();
          
          // Buscar la etiqueta a eliminar
          const tagToDelete = tags.find(tag => tag.id === tagId);
          if (!tagToDelete) {
            console.warn('⚠️ Tag no encontrado en estado local:', tagId);
            return { success: false, error: 'Etiqueta no encontrada' };
          }
          
          console.log('🗑️ [DEBUG] Eliminando tag de Supabase:', tagToDelete.name);
          
          // Eliminar de Supabase primero
          const { error: supabaseError } = await supabase
            .from('tags')
            .delete()
            .eq('id', tagId);
          
          if (supabaseError) {
            console.error('❌ Error eliminando tag de Supabase:', supabaseError);
            return { 
              success: false, 
              error: `Error de base de datos: ${supabaseError.message}` 
            };
          }
          
          console.log('✅ Tag eliminado de Supabase exitosamente');
          
          // Actualizar estado local usando set
          set(state => {
            const updatedTags = state.tags.filter(tag => tag.id !== tagId);
            const updatedContacts = state.contacts.map(contact => ({
              ...contact,
              tags: contact.tags?.filter(tag => tag.id !== tagId) || []
            }));
            
            // Guardar en localStorage
            try {
              localStorage.setItem('crm-tags', JSON.stringify(updatedTags));
              localStorage.setItem('crm-contacts', JSON.stringify(updatedContacts));
            } catch (storageError) {
              console.warn('⚠️ Error actualizando localStorage:', storageError);
            }
            
            return {
              tags: updatedTags,
              contacts: updatedContacts
            };
          });
          
          console.log('✅ Tag eliminado completamente:', tagToDelete.name);
          return { 
            success: true, 
            message: `Etiqueta "${tagToDelete.name}" eliminada correctamente` 
          };
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          console.error('❌ Error inesperado eliminando tag:', errorMessage);
          return { 
            success: false, 
            error: `Error inesperado: ${errorMessage}` 
          };
        }
      },

      updateTag: async (tagId, tagData) => {
        try {
          const { tags } = get();
          
          // Verificar que la etiqueta existe
          const existingTag = tags.find(tag => tag.id === tagId);
          if (!existingTag) {
            const errorMsg = `No se encontró la etiqueta con ID: ${tagId}`;
            console.warn('⚠️', errorMsg);
            return {
              success: false,
              error: errorMsg
            };
          }

          // Verificar duplicados por nombre (excluyendo la etiqueta actual)
          const duplicateTag = tags.find(tag => 
            tag.id !== tagId && 
            tag.name.toLowerCase().trim() === tagData.name.toLowerCase().trim()
          );
          
          if (duplicateTag) {
            const errorMsg = `Ya existe otra etiqueta con el nombre "${tagData.name}"`;
            console.warn('⚠️', errorMsg);
            return {
              success: false,
              error: errorMsg
            };
          }

          // Crear etiqueta actualizada
          const updatedTag = {
            ...existingTag,
            name: tagData.name.trim(),
            color: tagData.color,
            backgroundcolor: tagData.backgroundColor
          };

          console.log('✨ Actualizando tag:', safeStringify(updatedTag));

          // Actualizar en Supabase usando executeWithRetry
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            const supabaseResult = await executeWithRetry(async () => {
              const { error } = await supabase
                .from('tags')
                .update({
                  name: updatedTag.name,
                  color: updatedTag.color,
                  backgroundcolor: updatedTag.backgroundcolor,
                  updated_at: new Date().toISOString()
                })
                .eq('id', tagId)
                .eq('created_by', currentUser.id);

              if (error) {
                console.error('❌ Error de Supabase actualizando tag:', safeStringify(error));
                throw new Error(`Error de base de datos: ${error.message || 'Error desconocido'}`);
              }

              return { success: true };
            }, 3, 1000, 'actualizar etiqueta');

            if (!supabaseResult.success) {
              return {
                success: false,
                error: 'No se pudo actualizar la etiqueta en la base de datos'
              };
            }
          }

          // Actualizar estado local
          const updatedTags = tags.map(tag => tag.id === tagId ? updatedTag : tag);
          
          // Actualizar etiquetas en contactos
          const updatedContacts = get().contacts.map(contact => ({
            ...contact,
            tags: contact.tags?.map(tag => tag.id === tagId ? updatedTag : tag) || []
          }));
          
          set({ 
            tags: updatedTags,
            contacts: updatedContacts
          });
          
          // Guardar en localStorage con manejo de errores
          try {
            localStorage.setItem('crm-tags', JSON.stringify(updatedTags));
          } catch (storageError) {
            console.warn('⚠️ Error guardando tags en localStorage:', storageError instanceof Error ? storageError.message : 'Error desconocido');
          }
          
          console.log('✅ Tag actualizado exitosamente:', updatedTag.id, updatedTag.name);
          logTagOperation('updateTag_success', updatedTag);
          return {
            success: true,
            tag: updatedTag,
            message: 'Etiqueta actualizada correctamente'
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido actualizando tag';
          console.error('❌ Error actualizando tag:', errorMessage);
          logTagError('updateTag_unexpected', error as Error, { tagId, ...tagData });
          
          return {
            success: false,
            error: errorMessage,
            details: safeStringify(error)
          };
        }
      },
      
      updateContactStatus: async (id, newStatus) => {
        const contact = get().contacts.find(c => c.id === id);
        if (!contact) throw new Error('Contact not found');
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) throw new Error('Debes iniciar sesión');
        
        const oldStatus = contact.status;
        const updatedContact = {
          ...contact,
          status: newStatus,
          updatedAt: new Date(),
          lastContactDate: new Date()
        };
        
        // Registrar cambio de estado en Supabase con manejo de errores mejorado
        await executeWithRetry(async () => {
          const { error } = await supabase.from('contact_status_history').insert({
            contact_id: id,
            contact_name: contact.name,
            contact_email: contact.email,
            previous_status: oldStatus,
            to_status: newStatus,
            changed_by: currentUser.id,
            changed_at: new Date().toISOString()
          });
          if (error) throw error;
        }, 3, 1000, 'registrar cambio de estado');
        
        // Actualizar contacto
        set(state => ({
          contacts: state.contacts.map(c => 
            c.id === id ? updatedContact : c
          ),
          // Sincronizar selectedContact si es el mismo contacto
          selectedContact: state.selectedContact?.id === id 
            ? updatedContact 
            : state.selectedContact
        }));
        
        // Verificar si es una conversión
        const conversionEvent = checkForConversion(oldStatus, newStatus, updatedContact);
        
        if (conversionEvent) {
          // Registrar conversión en el metrics store
          await useMetricsStore.getState().recordConversion(conversionEvent);
          
          // Agregar notificación al dashboard
          useDashboardStore.getState().addNotification({
            type: 'success',
            title: 'Conversión Registrada',
            message: `${contact.name} avanzó de ${oldStatus} a ${newStatus}`,
            user_id: 'current-user',
            priority: 'medium',
            created_at: new Date().toISOString()
          });
        }
        
        // Actualizar métricas y dashboard
        useMetricsStore.getState().refreshMetrics();
        useDashboardStore.getState().refreshDashboard();
        
        return updatedContact;
      },
      
      deleteContact: async (id) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) throw new Error('Debes iniciar sesión');

        // Persistir primero en Supabase
        await executeWithRetry(async () => {
          const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', id)
            .eq('assigned_to', currentUser.id);
          if (error) throw error;
        }, 3, 1000, 'eliminar contacto');

        // Luego actualizar estado local
        set(state => ({
          contacts: state.contacts.filter(contact => contact.id !== id),
          selectedContact: state.selectedContact?.id === id ? null : state.selectedContact
        }));

        // Actualizar métricas
        useMetricsStore.getState().refreshMetrics();
        useDashboardStore.getState().refreshDashboard();
      },
      
      getContactsByUser: (userId) => {
        return get().contacts.filter(contact => contact.assignedTo === userId);
      },
      
      getContactsByStatus: (status) => {
        return get().contacts.filter(contact => contact.status === status);
      },
      
      setFilters: (newFilters) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters }
        }));
      },
      
      setSelectedContact: (contact) => {
        set({ selectedContact: contact });
      },
      
      setViewType: (viewType) => {
        set({ viewType });
      },
      
      // Métodos para manejar notas
      addNote: async (contactId, noteData) => {
        try {
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) throw new Error('User not authenticated');
          
          const contact = get().contacts.find(c => c.id === contactId);
          if (!contact) throw new Error('Contact not found');
          
          // Insertar nota en Supabase
          const { data: insertedNote, error } = await supabase
            .from('notes')
            .insert({
              contact_id: contactId,
              author_id: currentUser.id,
              content: noteData.content,
              type: noteData.type || 'general',
              priority: noteData.priority || 'normal',
              is_private: noteData.isPrivate || false,
              metadata: noteData.metadata || {}
            })
            .select()
            .single();
            
          if (error) {
            console.error('Error adding note:', error);
            throw new Error(`Error al agregar nota: ${error.message}`);
          }
          
          // Crear nota local con formato compatible
          const newNote: Note = {
            id: insertedNote.id,
            content: insertedNote.content,
            type: insertedNote.type,
            priority: insertedNote.priority,
            isPrivate: insertedNote.is_private,
            createdAt: new Date(insertedNote.created_at),
            date: new Date(insertedNote.created_at),
            author: currentUser.email || 'Unknown',
            createdBy: currentUser.id,
            metadata: insertedNote.metadata
          };
          
          // Actualizar estado local
          const updatedContact = {
            ...contact,
            notes: [...(contact.notes || []), newNote],
            updatedAt: new Date()
          };
          
          set(state => ({
            contacts: state.contacts.map(c => 
              c.id === contactId ? updatedContact : c
            ),
            selectedContact: state.selectedContact?.id === contactId 
              ? updatedContact 
              : state.selectedContact
          }));
          
          return newNote;
        } catch (error: any) {
          console.error('Error in addNote:', error);
          throw error;
        }
      },
      
      updateNote: async (contactId, noteId, updates) => {
        try {
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) throw new Error('User not authenticated');
          
          const contact = get().contacts.find(c => c.id === contactId);
          if (!contact) throw new Error('Contact not found');
          
          // Actualizar nota en Supabase
          const { data: updatedNote, error } = await supabase
            .from('notes')
            .update({
              content: updates.content,
              type: updates.type,
              priority: updates.priority,
              is_private: updates.isPrivate,
              metadata: updates.metadata,
              updated_at: new Date().toISOString()
            })
            .eq('id', noteId)
            .eq('author_id', currentUser.id) // Solo el autor puede actualizar
            .select()
            .single();
            
          if (error) {
            console.error('Error updating note:', error);
            throw new Error(`Error al actualizar nota: ${error.message}`);
          }
          
          // Actualizar estado local
          const updatedContact = {
            ...contact,
            notes: (contact.notes || []).map(note => 
              note.id === noteId ? {
                ...note,
                content: updatedNote.content,
                type: updatedNote.type,
                priority: updatedNote.priority,
                isPrivate: updatedNote.is_private,
                metadata: updatedNote.metadata
              } : note
            ),
            updatedAt: new Date()
          };
          
          set(state => ({
            contacts: state.contacts.map(c => 
              c.id === contactId ? updatedContact : c
            ),
            selectedContact: state.selectedContact?.id === contactId 
              ? updatedContact 
              : state.selectedContact
          }));
          
          return updatedNote;
        } catch (error: any) {
          console.error('Error in updateNote:', error);
          throw error;
        }
      },
      
      deleteNote: async (contactId, noteId) => {
        try {
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) throw new Error('User not authenticated');
          
          const contact = get().contacts.find(c => c.id === contactId);
          if (!contact) throw new Error('Contact not found');
          
          // Eliminar nota de Supabase (soft delete)
          const { error } = await supabase
            .from('notes')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', noteId)
            .eq('author_id', currentUser.id); // Solo el autor puede eliminar
            
          if (error) {
            console.error('Error deleting note:', error);
            throw new Error(`Error al eliminar nota: ${error.message}`);
          }
          
          // Actualizar estado local
          const updatedContact = {
            ...contact,
            notes: (contact.notes || []).filter(note => note.id !== noteId),
            updatedAt: new Date()
          };
          
          set(state => ({
            contacts: state.contacts.map(c => 
              c.id === contactId ? updatedContact : c
            ),
            selectedContact: state.selectedContact?.id === contactId 
              ? updatedContact 
              : state.selectedContact
          }));
          
          // Nota eliminada exitosamente
        } catch (error: any) {
          console.error('Error in deleteNote:', error);
          throw error;
        }
      },

      getFilteredContacts: () => {
        const { contacts, filters } = get();
        return contacts.filter(contact => {
          if (filters.status && filters.status !== 'all' && contact.status !== filters.status) {
            return false;
          }
          if (filters.assignedTo && contact.assignedTo !== filters.assignedTo) {
            return false;
          }
          if (filters.source && contact.source !== filters.source) {
            return false;
          }
          if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            return (
              contact.name?.toLowerCase().includes(searchLower) ||
              contact.email?.toLowerCase().includes(searchLower) ||
              false
            );
          }
          // Filtro por etiquetas
          if (filters.tags && filters.tags.length > 0) {
            const contactTagIds = contact.tags?.map(tag => tag.id) || [];
            return filters.tags.some(tagId => contactTagIds.includes(tagId));
          }
          return true;
        });
      },

      setTagFilter: (tagIds) => {
        set(state => ({
          filters: { ...state.filters, tags: tagIds }
        }));
      },

      loadContacts: async (page = 0, pageSize = 50) => {
        set({ isLoading: true });
        try {
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) {
            set({ isLoading: false });
            return;
          }

          // Implementar reintentos para manejar errores de conexión
          let contacts = null;
          let count = null;
          let error = null;
          const maxRetries = 3;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const result = await supabase
                .from('contacts')
                .select('*', { count: 'exact' })
                .eq('assigned_to', currentUser.id)
                .order('created_at', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);
              
              contacts = result.data;
              count = result.count;
              error = result.error;
              break; // Éxito, salir del bucle
            } catch (retryError: any) {
              console.warn(`Intento ${attempt}/${maxRetries} falló:`, retryError.message);
              
              if (attempt === maxRetries) {
                // Último intento, usar fallback sin count
                try {
                  const fallbackResult = await supabase
                    .from('contacts')
                    .select('*')
                    .eq('assigned_to', currentUser.id)
                    .order('created_at', { ascending: false })
                    .range(page * pageSize, (page + 1) * pageSize - 1);
                  
                  contacts = fallbackResult.data;
                  count = null; // Sin count exacto
                  error = fallbackResult.error;
                  console.info('Usando consulta fallback sin count');
                } catch (fallbackError: any) {
                  error = fallbackError;
                }
              } else {
                // Esperar antes del siguiente intento
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
              }
            }
          }

          if (error) {
            console.error('Error loading contacts:', error);
            set({ error: error.message, isLoading: false });
            return;
          }

          // Cargar notas para cada contacto
          const contactsWithNotes = await Promise.all(
            (contacts || []).map(async (contact) => {
              const { data: notes } = await supabase
                .from('notes')
                .select('*')
                .eq('contact_id', contact.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
                
              // Convertir notas al formato local
              const formattedNotes = (notes || []).map(note => ({
                id: note.id,
                content: note.content,
                type: note.type,
                priority: note.priority,
                isPrivate: note.is_private,
                createdAt: new Date(note.created_at),
                date: new Date(note.created_at),
                author: 'Usuario', // Se puede mejorar con join a auth.users
                createdBy: note.author_id,
                metadata: note.metadata
              }));
              
              return {
                ...contact,
                notes: formattedNotes
              };
            })
          );

          // Si es la primera página, reemplazar; si no, agregar
          const currentContacts = get().contacts;
          const newContacts = page === 0 ? contactsWithNotes : [...currentContacts, ...contactsWithNotes];
          
          set({ 
            contacts: newContacts, 
            isLoading: false, 
            error: null,
            hasMoreContacts: count ? newContacts.length < count : false
          });
        } catch (error: any) {
          console.error('Error loading contacts:', error);
          set({ error: error.message || 'Error desconocido', isLoading: false });
        }
      },

      // Funciones adicionales requeridas por CRMState
      setView: (view) => {
        set({ view });
      },

      setSearchTerm: (searchTerm) => {
        set({ searchTerm });
      },

      setSortBy: (sortBy) => {
        set({ sortBy });
      },

      setSortOrder: (sortOrder) => {
        set({ sortOrder });
      },

      setPagination: (pagination) => {
        set({ pagination });
      },

      addConversion: (conversion) => {
        set(state => ({
          conversions: [...state.conversions, conversion]
        }));
      },

      updateConversion: (id, updates) => {
        set(state => ({
          conversions: state.conversions.map(c => 
            c.id === id ? { ...c, ...updates } : c
          )
        }));
      },

      deleteConversion: (id) => {
        set(state => ({
          conversions: state.conversions.filter(c => c.id !== id)
        }));
      },

      getContactStats: () => {
          const contacts = get().contacts;
          const total = contacts.length;
          const active = contacts.filter(c => c.status === 'Contactado').length;
          const leads = contacts.filter(c => c.status === 'Prospecto').length;
          const customers = contacts.filter(c => c.status === 'Cliente').length;
         
         return {
           total,
           active,
           leads,
           customers,
           conversionRate: total > 0 ? (customers / total) * 100 : 0
         };
       },

       // Funciones adicionales requeridas por CRMState
       setPage: (page) => {
         set(state => ({
           pagination: { ...state.pagination, page }
         }));
       },

       setPageSize: (pageSize) => {
         set(state => ({
           pagination: { ...state.pagination, pageSize }
         }));
       },

       validateAndSyncUser: async () => {
         // Implementación básica
         return true;
       },

       checkSyncStatus: async () => {
         // Implementación básica
         return { isSynced: true, message: 'Sincronizado' };
       }
    }),
    {
      name: 'crm-storage',
      partialize: (state) => ({
        contacts: state.contacts,
        filters: state.filters
      }),
      onRehydrateStorage: () => (state) => {
        // No cargar datos mock automáticamente para evitar que reaparezcan datos eliminados
        // Los datos mock solo se cargarán manualmente si es necesario
        
        // Cargar etiquetas guardadas después de la hidratación
        if (state) {
          try {
            const savedTags = localStorage.getItem('crm-tags');
            if (savedTags) {
              const parsedTags = JSON.parse(savedTags);
              state.tags = parsedTags;
            }
          } catch (error) {
            console.error('Error loading tags during rehydration:', error);
          }
        }
      }
    }
  )
);

// Hook para obtener contactos filtrados
export const useFilteredContacts = () => {
  const { contacts, filters } = useCRMStore();
  
  return contacts.filter(contact => {
    // Filtro por estado
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(contact.status)) return false;
    }
    
    // Filtro por usuario asignado
    if (filters.assignedTo && filters.assignedTo.length > 0) {
      if (!filters.assignedTo.includes(contact.assignedTo)) return false;
    }
    
    // Filtro por rango de fechas
    if (filters.dateRange) {
      const contactDate = new Date(contact.createdAt);
      if (contactDate < filters.dateRange.start || contactDate > filters.dateRange.end) {
        return false;
      }
    }
    
    // Filtro por término de búsqueda
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const searchableText = `${contact.name} ${contact.email}`.toLowerCase();
      if (!searchableText.includes(searchTerm)) return false;
    }
    
    return true;
  });
};