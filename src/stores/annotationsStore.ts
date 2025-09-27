import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface TaskAnnotation {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

interface AnnotationsState {
  annotations: TaskAnnotation[];
  loading: boolean;
  error: string | null;
  realtimeChannel: RealtimeChannel | null;
  fetchAnnotations: (taskId: string) => Promise<void>;
  createAnnotation: (taskId: string, content: string) => Promise<TaskAnnotation | null>;
  updateAnnotation: (id: string, content: string) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  clearAnnotations: () => void;
  subscribeToAnnotations: (taskId: string) => void;
  unsubscribeFromAnnotations: () => void;
}

export const useAnnotationsStore = create<AnnotationsState>((set, get) => ({
  annotations: [],
  loading: false,
  error: null,
  realtimeChannel: null,

  fetchAnnotations: async (taskId: string) => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('task_annotations')
        .select(`
          *,
          user:users(
            full_name,
            email
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({ annotations: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching annotations:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar anotaciones',
        loading: false 
      });
    }
  },

  createAnnotation: async (taskId: string, content: string) => {
    set({ loading: true, error: null });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('task_annotations')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content: content.trim()
        })
        .select(`
          *,
          user:users(
            full_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      // Agregar la nueva anotación al estado
      set(state => ({
        annotations: [...state.annotations, data],
        loading: false
      }));

      return data;
    } catch (error) {
      console.error('Error creating annotation:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Error al crear anotación',
        loading: false 
      });
      return null;
    }
  },

  updateAnnotation: async (id: string, content: string) => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('task_annotations')
        .update({ 
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          user:users(
            full_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      // Actualizar la anotación en el estado
      set(state => ({
        annotations: state.annotations.map(annotation => 
          annotation.id === id ? data : annotation
        ),
        loading: false
      }));
    } catch (error) {
      console.error('Error updating annotation:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Error al actualizar anotación',
        loading: false 
      });
    }
  },

  deleteAnnotation: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      const { error } = await supabase
        .from('task_annotations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remover la anotación del estado
      set(state => ({
        annotations: state.annotations.filter(annotation => annotation.id !== id),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting annotation:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Error al eliminar anotación',
        loading: false 
      });
    }
  },

  clearAnnotations: () => {
    set({ annotations: [], error: null });
  },

  subscribeToAnnotations: (taskId: string) => {
    const { realtimeChannel } = get();
    
    // Si ya hay una suscripción activa, desuscribirse primero
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
    }

    // Crear nuevo canal para las anotaciones de esta tarea específica
    const channel = supabase
      .channel(`task_annotations_${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_annotations',
          filter: `task_id=eq.${taskId}`
        },
        async (payload) => {
          console.log('Annotation change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Obtener la anotación completa con datos del usuario
            const { data } = await supabase
              .from('task_annotations')
              .select(`
                *,
                user:users(
                  full_name,
                  email
                )
              `)
              .eq('id', payload.new.id)
              .single();
            
            if (data) {
              set(state => ({
                annotations: [...state.annotations, data]
              }));
            }
          } else if (payload.eventType === 'UPDATE') {
            // Obtener la anotación actualizada con datos del usuario
            const { data } = await supabase
              .from('task_annotations')
              .select(`
                *,
                user:users(
                  full_name,
                  email
                )
              `)
              .eq('id', payload.new.id)
              .single();
            
            if (data) {
              set(state => ({
                annotations: state.annotations.map(annotation => 
                  annotation.id === data.id ? data : annotation
                )
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            set(state => ({
              annotations: state.annotations.filter(annotation => 
                annotation.id !== payload.old.id
              )
            }));
          }
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  unsubscribeFromAnnotations: () => {
    const { realtimeChannel } = get();
    
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
      set({ realtimeChannel: null });
    }
  }
}));