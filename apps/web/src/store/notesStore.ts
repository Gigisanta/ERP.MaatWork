import { create } from 'zustand';
import { supabase } from '@cactus/database';
import { toast } from 'sonner';
import { useCRMStore } from './crmStore';
import { useAuthStore } from './authStore';
import { Note as CRMNote, Contact } from '../types/metrics';

// Extender el tipo Note del CRM para incluir funcionalidades adicionales
export interface Note extends CRMNote {
  contact_id?: string;
  author_id?: string;
  is_private?: boolean;
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
  deleted_at?: string;
  author_details?: {
    id: string;
    full_name: string;
    email: string;
  };
  tags?: NoteTag[];
  attachments?: NoteAttachment[];
}

export interface NoteTag {
  id: string;
  note_id: string;
  name: string;
  color: string;
}

export interface NoteAttachment {
  id: string;
  note_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface CreateNoteData {
  contact_id: string;
  content: string;
  type: 'call' | 'meeting' | 'email' | 'general';
  is_private?: boolean;
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface UpdateNoteData {
  content?: string;
  type?: 'call' | 'meeting' | 'email' | 'general';
  is_private?: boolean;
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface NotesFilter {
  contact_id?: string;
  type?: string;
  priority?: string;
  author_id?: string;
  search_query?: string;
  date_from?: string;
  date_to?: string;
  is_private?: boolean;
}

interface NotesStore {
  notes: Note[];
  tags: NoteTag[];
  isLoading: boolean;
  error: string | null;
  
  // Acciones para notas
  fetchNotes: (contactId: string) => Promise<void>;
  createNote: (noteData: CreateNoteData) => Promise<Note | null>;
  updateNote: (noteId: string, updates: UpdateNoteData) => Promise<Note | null>;
  deleteNote: (noteId: string) => Promise<boolean>;
  
  // Acciones para etiquetas
  fetchTags: () => Promise<void>;
  createTag: (noteId: string, tagName: string, color: string) => Promise<NoteTag | null>;
  deleteTag: (tagId: string) => Promise<boolean>;
  
  // Filtros y búsqueda
  searchNotes: (contactId: string, query: string) => Promise<Note[]>;
  filterNotes: (filter: NotesFilter) => Note[];
  
  // Utilidades
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  
  // Funciones de seguridad y permisos
  canViewNote: (note: Note) => boolean;
  canEditNote: (note: Note) => boolean;
  canDeleteNote: (note: Note) => boolean;
  canCreateNote: (contactId: string) => boolean;
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  // Estado inicial
  notes: [],
  tags: [],
  isLoading: false,
  error: null,

  // Setters básicos
  setLoading: (loading) => set({ isLoading: loading }),
  clearError: () => set({ error: null }),

  // Fetch notas desde el CRM store
  fetchNotes: async (contactId) => {
    set({ isLoading: true, error: null });
    
    try {
      const crmStore = useCRMStore.getState();
      const contact = crmStore.contacts.find(c => c.id === contactId);
      
      if (contact) {
        // Convertir las notas del CRM al formato extendido
        const extendedNotes: Note[] = contact.notes.map(note => ({
          ...note,
          contact_id: contactId,
          priority: 'medium' as const,
          tags: [],
          attachments: []
        }));
        
        set({ 
          notes: extendedNotes,
          isLoading: false 
        });
      } else {
        set({ notes: [], isLoading: false });
      }
      
    } catch (error) {
      console.error('Error fetching notes:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar las notas',
        isLoading: false 
      });
    }
  },
  
  // Crear nota
  createNote: async (noteData) => {
    set({ isLoading: true, error: null });
    
    try {
      const crmStore = useCRMStore.getState();
      
      // Crear la nueva nota en formato CRM
      const newCrmNote: CRMNote = {
        id: Date.now().toString(),
        content: noteData.content,
        type: noteData.type,
        author: 'Usuario Actual', // TODO: obtener del auth store
        date: new Date(),
        createdAt: new Date(),
        createdBy: 'current-user' // TODO: obtener del auth store
      };
      
      // Agregar la nota al contacto en el CRM store
      await crmStore.addNote(noteData.contact_id, newCrmNote);
      
      // Crear la nota extendida para el store local
      const extendedNote: Note = {
        ...newCrmNote,
        contact_id: noteData.contact_id,
        priority: noteData.priority || 'medium',
        tags: [],
        attachments: []
      };
      
      const currentNotes = get().notes;
      set({ 
        notes: [extendedNote, ...currentNotes],
        isLoading: false 
      });
      
      return extendedNote;
      
    } catch (error) {
      console.error('Error creating note:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Error al crear la nota',
        isLoading: false 
      });
      return null;
    }
  },
  
  // Actualizar nota
  updateNote: async (noteId, updates) => {
    set({ isLoading: true, error: null });
    
    try {
      const crmStore = useCRMStore.getState();
      const currentNotes = get().notes;
      const noteToUpdate = currentNotes.find(note => note.id === noteId);
      
      if (!noteToUpdate) {
        throw new Error('Nota no encontrada');
      }
      
      // Actualizar en el CRM store
      const updatedCrmNote: CRMNote = {
        id: noteId,
        content: updates.content || noteToUpdate.content,
        type: noteToUpdate.type || 'general',
        author: noteToUpdate.author,
        date: noteToUpdate.date || new Date(),
        createdAt: noteToUpdate.createdAt || new Date(),
        createdBy: noteToUpdate.createdBy || 'current-user'
      };
      
      await crmStore.updateNote(noteToUpdate.contact_id, noteId, updatedCrmNote);
      
      // Actualizar en el store local
      const updatedNote: Note = {
        ...noteToUpdate,
        ...updates,
        content: updates.content || noteToUpdate.content
      };
      
      const updatedNotes = currentNotes.map(note => 
        note.id === noteId ? updatedNote : note
      );
      
      set({ 
        notes: updatedNotes,
        isLoading: false 
      });
      
      return updatedNote;
      
    } catch (error) {
      console.error('Error updating note:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Error al actualizar la nota',
        isLoading: false 
      });
      return null;
    }
  },
  
  // Eliminar nota
  deleteNote: async (noteId) => {
    set({ isLoading: true, error: null });
    
    try {
      const crmStore = useCRMStore.getState();
      const currentNotes = get().notes;
      const noteToDelete = currentNotes.find(note => note.id === noteId);
      
      if (!noteToDelete) {
        throw new Error('Nota no encontrada');
      }
      
      // Eliminar del CRM store
      await crmStore.deleteNote(noteToDelete.contact_id, noteId);
      
      // Eliminar del store local
      const updatedNotes = currentNotes.filter(note => note.id !== noteId);
      
      set({ 
        notes: updatedNotes,
        isLoading: false 
      });
      
      return true;
      
    } catch (error) {
      console.error('Error deleting note:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Error al eliminar la nota',
        isLoading: false 
      });
      return false;
    }
  },
  
  // Funciones para etiquetas
  fetchTags: async () => {
    // Por ahora, las etiquetas están vacías ya que el CRM no las maneja
    set({ tags: [] });
  },

  createTag: async (noteId, tagName, color) => {
    // Funcionalidad de etiquetas no implementada en el CRM base
    console.log('Tags not implemented in base CRM');
    return null;
  },

  deleteTag: async (tagId) => {
    // Funcionalidad de etiquetas no implementada en el CRM base
    console.log('Tags not implemented in base CRM');
    return false;
  },

  // Búsqueda de notas
  searchNotes: async (contactId, query) => {
    try {
      const crmStore = useCRMStore.getState();
      const contact = crmStore.contacts.find(c => c.id === contactId);
      
      if (!contact) return [];
      
      const filteredNotes = contact.notes
        .filter(note => 
          note.content.toLowerCase().includes(query.toLowerCase())
        )
        .map(note => ({
          ...note,
          contact_id: contactId,
          priority: 'medium' as const,
          tags: [],
          attachments: []
        }));
      
      return filteredNotes;
      
    } catch (error) {
      console.error('Error searching notes:', error);
      return [];
    }
  },
  
  // Filtrar notas localmente
  filterNotes: (filter) => {
    const allNotes = get().notes;
    let filteredNotes = [...allNotes];
    
    // Filtrar por término de búsqueda
    if (filter.search_query) {
      const searchTerm = filter.search_query.toLowerCase();
      filteredNotes = filteredNotes.filter(note => 
        note.content.toLowerCase().includes(searchTerm) ||
        note.author?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filtrar por tipo
    if (filter.type) {
      filteredNotes = filteredNotes.filter(note => note.type === filter.type);
    }
    
    // Filtrar por prioridad
    if (filter.priority) {
      filteredNotes = filteredNotes.filter(note => note.priority === filter.priority);
    }
    
    // Filtrar por autor
    if (filter.author_id) {
      filteredNotes = filteredNotes.filter(note => note.author_id === filter.author_id);
    }
    
    // Filtrar por contacto
    if (filter.contact_id) {
      filteredNotes = filteredNotes.filter(note => note.contact_id === filter.contact_id);
    }
    
    // Filtrar por rango de fechas
    if (filter.date_from) {
      filteredNotes = filteredNotes.filter(note => 
        new Date(note.createdAt) >= new Date(filter.date_from!)
      );
    }
    if (filter.date_to) {
      filteredNotes = filteredNotes.filter(note => 
        new Date(note.createdAt) <= new Date(filter.date_to!)
      );
    }
    
    // Filtrar por privacidad
    if (filter.is_private !== undefined) {
      filteredNotes = filteredNotes.filter(note => note.is_private === filter.is_private);
    }
    
    return filteredNotes;
  },
  
  // Funciones de seguridad y permisos
  canViewNote: (note) => {
    const { user } = useAuthStore.getState();
    if (!user) return false;
    
    // Admins pueden ver todas las notas
    if (user.role === 'admin') return true;
    
    // Managers pueden ver todas las notas de su equipo
    if (user.role === 'manager') {
      // TODO: Verificar si el contacto pertenece al equipo del manager
      return true;
    }
    
    // Advisors solo pueden ver sus propias notas y notas públicas
    if (user.role === 'advisor') {
      return !note.is_private || note.author_id === user.id || note.createdBy === user.id;
    }
    
    return false;
  },
  
  canEditNote: (note) => {
    const { user } = useAuthStore.getState();
    if (!user) return false;
    
    // Admins pueden editar todas las notas
    if (user.role === 'admin') return true;
    
    // Managers pueden editar notas de su equipo
    if (user.role === 'manager') {
      // TODO: Verificar si el contacto pertenece al equipo del manager
      return true;
    }
    
    // Advisors solo pueden editar sus propias notas
    if (user.role === 'advisor') {
      return note.author_id === user.id || note.createdBy === user.id;
    }
    
    return false;
  },
  
  canDeleteNote: (note) => {
    const { user } = useAuthStore.getState();
    if (!user) return false;
    
    // Admins pueden eliminar todas las notas
    if (user.role === 'admin') return true;
    
    // Managers pueden eliminar notas de su equipo
    if (user.role === 'manager') {
      // TODO: Verificar si el contacto pertenece al equipo del manager
      return true;
    }
    
    // Advisors solo pueden eliminar sus propias notas
    if (user.role === 'advisor') {
      return note.author_id === user.id || note.createdBy === user.id;
    }
    
    return false;
  },
  
  canCreateNote: (contactId) => {
    const { user } = useAuthStore.getState();
    if (!user) return false;
    
    // Todos los usuarios autenticados pueden crear notas
    // TODO: Verificar permisos específicos del contacto si es necesario
    return true;
  },

}));

// Hook personalizado para notas de un contacto específico
export const useContactNotes = (contactId: string) => {
  const { 
    notes, 
    isLoading, 
    error, 
    fetchNotes, 
    createNote, 
    updateNote, 
    deleteNote 
  } = useNotesStore();
  
  const contactNotes = notes.filter(note => note.contact_id === contactId);
  
  return {
    notes: contactNotes,
    isLoading,
    error,
    fetchNotes: () => fetchNotes(contactId),
    createNote,
    updateNote,
    deleteNote
  };
};

export default useNotesStore;