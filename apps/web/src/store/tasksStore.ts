import { create } from 'zustand';
import { supabase } from '@cactus/database';
import { RealtimeChannel } from '@supabase/supabase-js';
import { User, Team } from './teamStore';

export interface Task {
  id: string;
  team_id: string;
  created_by: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  team?: Team;
  creator?: User;
  assignments?: TaskAssignment[];
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  assigned_to: string;
  status: 'assigned' | 'in_progress' | 'completed';
  notes: string | null;
  assigned_at: string;
  completed_at: string | null;
  task?: Task;
  assignee?: User;
}

interface TasksState {
  tasks: Task[];
  taskAssignments: TaskAssignment[];
  loading: boolean;
  error: string | null;
  realtimeChannel: RealtimeChannel | null;

  // Actions
  fetchTasks: (teamId?: string) => Promise<void>;
  fetchTaskAssignments: (taskId?: string, userId?: string) => Promise<void>;
  createTask: (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<Task | null>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  assignTask: (taskId: string, assignedTo: string, notes?: string) => Promise<TaskAssignment | null>;
  updateTaskAssignment: (assignmentId: string, updates: Partial<TaskAssignment>) => Promise<void>;
  removeTaskAssignment: (assignmentId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  completeAssignment: (assignmentId: string) => Promise<void>;
  getTasksByStatus: (status: Task['status']) => Task[];
  getTasksByPriority: (priority: Task['priority']) => Task[];
  getUserTasks: (userId: string) => TaskAssignment[];
  getTeamTasks: (teamId: string) => Task[];
  getTeamTasksWithAssignments: (teamId: string) => any[];
  subscribeToTasks: (teamId?: string) => void;
  unsubscribeFromTasks: () => void;
  clearError: () => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  taskAssignments: [],
  loading: false,
  error: null,
  realtimeChannel: null,

  fetchTasks: async (teamId?: string) => {
    set({ loading: true, error: null });
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          team:teams!tasks_team_id_fkey(*),
          creator:users!tasks_created_by_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ tasks: data || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchTaskAssignments: async (taskId?: string, userId?: string) => {
    set({ loading: true, error: null });
    try {
      let query = supabase
        .from('task_assignments')
        .select(`
          *,
          task:tasks!task_assignments_task_id_fkey(*),
          assignee:users!task_assignments_assigned_to_fkey(*)
        `)
        .order('assigned_at', { ascending: false });

      if (taskId) {
        query = query.eq('task_id', taskId);
      }
      if (userId) {
        query = query.eq('assigned_to', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ taskAssignments: data || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createTask: async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select(`
          *,
          team:teams!tasks_team_id_fkey(*),
          creator:users!tasks_created_by_fkey(*)
        `)
        .single();

      if (error) throw error;

      const { tasks } = get();
      set({ tasks: [data, ...tasks], loading: false });
      return data;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  updateTask: async (taskId: string, updates: Partial<Task>) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;

      const { tasks } = get();
      set({
        tasks: tasks.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        ),
        loading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      // First delete all task assignments
      await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId);

      // Then delete the task
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      const { tasks, taskAssignments } = get();
      set({ 
        tasks: tasks.filter(task => task.id !== taskId),
        taskAssignments: taskAssignments.filter(assignment => assignment.task_id !== taskId),
        loading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  assignTask: async (taskId: string, assignedTo: string, notes?: string) => {
    set({ loading: true, error: null });
    try {
      // Check if user is already assigned to this task
      const { data: existingAssignment } = await supabase
        .from('task_assignments')
        .select('id')
        .eq('task_id', taskId)
        .eq('assigned_to', assignedTo)
        .single();

      if (existingAssignment) {
        throw new Error('El usuario ya está asignado a esta tarea');
      }

      const { data, error } = await supabase
        .from('task_assignments')
        .insert({
          task_id: taskId,
          assigned_to: assignedTo,
          status: 'assigned',
          notes
        })
        .select(`
          *,
          task:tasks!task_assignments_task_id_fkey(*),
          assignee:users!task_assignments_assigned_to_fkey(*)
        `)
        .single();

      if (error) throw error;

      const { taskAssignments } = get();
      set({ taskAssignments: [data, ...taskAssignments], loading: false });
      return data;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  updateTaskAssignment: async (assignmentId: string, updates: Partial<TaskAssignment>) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('task_assignments')
        .update(updates)
        .eq('id', assignmentId);

      if (error) throw error;

      const { taskAssignments } = get();
      set({
        taskAssignments: taskAssignments.map(assignment => 
          assignment.id === assignmentId ? { ...assignment, ...updates } : assignment
        ),
        loading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  removeTaskAssignment: async (assignmentId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      const { taskAssignments } = get();
      set({ 
        taskAssignments: taskAssignments.filter(assignment => assignment.id !== assignmentId),
        loading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  completeTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      const { tasks } = get();
      set({
        tasks: tasks.map(task => 
          task.id === taskId ? { ...task, status: 'completed' as const } : task
        ),
        loading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  completeAssignment: async (assignmentId: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) throw error;

      const { taskAssignments } = get();
      set({
        taskAssignments: taskAssignments.map(assignment => 
          assignment.id === assignmentId 
            ? { ...assignment, status: 'completed' as const, completed_at: new Date().toISOString() }
            : assignment
        ),
        loading: false
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  getTasksByStatus: (status: Task['status']) => {
    return get().tasks.filter(task => task.status === status);
  },

  getTasksByPriority: (priority: Task['priority']) => {
    return get().tasks.filter(task => task.priority === priority);
  },

  getUserTasks: (userId: string) => {
    return get().taskAssignments.filter(assignment => assignment.assigned_to === userId);
  },

  getTeamTasks: (teamId: string) => {
    return get().tasks.filter(task => task.team_id === teamId);
  },

  // Obtener tareas asignadas a un usuario específico
  getTasksByAssignee: (userId: string) => {
    const state = get();
    return state.tasks.filter(task => 
      state.taskAssignments.some(assignment => 
        assignment.task_id === task.id && assignment.assigned_to === userId
      )
    );
  },

  // Obtener tareas del equipo con información de asignación
  getTeamTasksWithAssignments: (teamId: string) => {
    const state = get();
    return state.tasks
      .filter(task => task.team_id === teamId)
      .map(task => ({
        ...task,
        assignments: state.taskAssignments.filter(assignment => assignment.task_id === task.id)
      }));
  },

  subscribeToTasks: (teamId?: string) => {
    const { realtimeChannel } = get();
    
    // Unsubscribe from existing channel if any
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
    }

    // Create new channel for tasks
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: teamId ? `team_id=eq.${teamId}` : undefined
        },
        (payload) => {
          console.log('Task change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            const { tasks } = get();
            set({ tasks: [...tasks, payload.new as Task] });
          } else if (payload.eventType === 'UPDATE') {
            const { tasks } = get();
            set({
              tasks: tasks.map(task => 
                task.id === payload.new.id ? { ...task, ...payload.new } : task
              )
            });
          } else if (payload.eventType === 'DELETE') {
            const { tasks } = get();
            set({ tasks: tasks.filter(task => task.id !== payload.old.id) });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignments',
          filter: teamId ? `team_id=eq.${teamId}` : undefined
        },
        (payload) => {
          console.log('Task assignment change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            const { taskAssignments } = get();
            set({ taskAssignments: [...taskAssignments, payload.new as TaskAssignment] });
          } else if (payload.eventType === 'UPDATE') {
            const { taskAssignments } = get();
            set({
              taskAssignments: taskAssignments.map(assignment => 
                assignment.id === payload.new.id ? { ...assignment, ...payload.new } : assignment
              )
            });
          } else if (payload.eventType === 'DELETE') {
            const { taskAssignments } = get();
            set({ taskAssignments: taskAssignments.filter(assignment => assignment.id !== payload.old.id) });
          }
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  unsubscribeFromTasks: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
      set({ realtimeChannel: null });
    }
  },

  clearError: () => {
    set({ error: null });
  }
}));