/**
 * Componente para gestión de tareas del CRM integrado con Notion
 * Permite crear, editar, eliminar y visualizar tareas con seguimiento de estado
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Calendar, 
  User, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Tag,
  AlertTriangle,
  CheckCircle,
  Square,
  AlertCircle,
  Loader2,
  Flag
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '@cactus/database';

// Tipos
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  assigned_to?: string;
  contact_id?: string;
  contact_name?: string;
  deal_id?: string;
  deal_title?: string;
  tags: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface TasksManagerProps {
  className?: string;
}

const TasksManager: React.FC<TasksManagerProps> = ({ className = '' }) => {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    due_date: '',
    assigned_to: '',
    contact_id: '',
    contact_name: '',
    deal_id: '',
    deal_title: '',
    tags: [] as string[],
    notes: ''
  });

  // Configuración de estados
  const statuses = [
    { value: 'todo', label: 'Por hacer', color: 'bg-gray-100 text-gray-800', icon: Square },
    { value: 'in_progress', label: 'En progreso', color: 'bg-blue-100 text-blue-800', icon: Clock },
    { value: 'completed', label: 'Completada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    { value: 'cancelled', label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: AlertCircle }
  ];

  // Configuración de prioridades
  const priorities = [
    { value: 'low', label: 'Baja', color: 'bg-green-100 text-green-800', textColor: 'text-green-600' },
    { value: 'medium', label: 'Media', color: 'bg-yellow-100 text-yellow-800', textColor: 'text-yellow-600' },
    { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-800', textColor: 'text-orange-600' },
    { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-800', textColor: 'text-red-600' }
  ];

  // Cargar tareas
  const loadTasks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const response = await fetch('/api/crm/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error cargando tareas');
      }

      const result = await response.json();
      setTasks(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Crear tarea
  const createTask = async () => {
    if (!user || !formData.title.trim()) return;
    
    try {
      setSubmitting(true);
      
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const response = await fetch('/api/crm/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error creando tarea');
      }

      await loadTasks();
      resetForm();
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando tarea');
    } finally {
      setSubmitting(false);
    }
  };

  // Actualizar tarea
  const updateTask = async () => {
    if (!user || !editingTask || !formData.title.trim()) return;
    
    try {
      setSubmitting(true);
      
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const response = await fetch(`/api/crm/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error actualizando tarea');
      }

      await loadTasks();
      resetForm();
      setEditingTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando tarea');
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar tarea
  const deleteTask = async (taskId: string) => {
    if (!user || !confirm('¿Estás seguro de eliminar esta tarea?')) return;
    
    try {
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const response = await fetch(`/api/crm/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error eliminando tarea');
      }

      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando tarea');
    }
  };

  // Cambiar estado de tarea rápidamente
  const toggleTaskStatus = async (task: Task) => {
    if (!user) return;
    
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    
    try {
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const response = await fetch(`/api/crm/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...task, status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Error actualizando estado de tarea');
      }

      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando tarea');
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      due_date: '',
      assigned_to: '',
      contact_id: '',
      contact_name: '',
      deal_id: '',
      deal_title: '',
      tags: [],
      notes: ''
    });
  };

  // Abrir modal de edición
  const openEditModal = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || '',
      assigned_to: task.assigned_to || '',
      contact_id: task.contact_id || '',
      contact_name: task.contact_name || '',
      deal_id: task.deal_id || '',
      deal_title: task.deal_title || '',
      tags: task.tags,
      notes: task.notes || ''
    });
    setEditingTask(task);
  };

  // Filtrar tareas
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.deal_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Obtener configuración del estado
  const getStatusConfig = (status: Task['status']) => {
    return statuses.find(s => s.value === status) || statuses[0];
  };

  // Obtener configuración de prioridad
  const getPriorityConfig = (priority: Task['priority']) => {
    return priorities.find(p => p.value === priority) || priorities[1];
  };

  // Verificar si la tarea está vencida
  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.due_date) < new Date();
  };

  // Calcular estadísticas
  const stats = {
    total: filteredTasks.length,
    completed: filteredTasks.filter(task => task.status === 'completed').length,
    inProgress: filteredTasks.filter(task => task.status === 'in_progress').length,
    overdue: filteredTasks.filter(task => isOverdue(task)).length
  };

  useEffect(() => {
    loadTasks();
  }, [user]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando tareas...</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <CheckSquare className="w-5 h-5 mr-2" />
            Tareas ({filteredTasks.length})
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarea
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center">
              <CheckSquare className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-600 font-medium">Total</span>
            </div>
            <p className="text-lg font-semibold text-blue-900">{stats.total}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm text-green-600 font-medium">Completadas</span>
            </div>
            <p className="text-lg font-semibold text-green-900">{stats.completed}</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-600 font-medium">En Progreso</span>
            </div>
            <p className="text-lg font-semibold text-yellow-900">{stats.inProgress}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
              <span className="text-sm text-red-600 font-medium">Vencidas</span>
            </div>
            <p className="text-lg font-semibold text-red-900">{stats.overdue}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tareas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              {statuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las prioridades</option>
              {priorities.map(priority => (
                <option key={priority.value} value={priority.value}>{priority.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
          <span className="text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Lista de tareas */}
      <div className="divide-y divide-gray-200">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No se encontraron tareas</p>
            <p className="text-sm">Crea tu primera tarea para comenzar</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const statusConfig = getStatusConfig(task.status);
            const priorityConfig = getPriorityConfig(task.priority);
            const StatusIcon = statusConfig.icon;
            const overdue = isOverdue(task);
            
            return (
              <div key={task.id} className={`p-4 hover:bg-gray-50 transition-colors ${overdue ? 'bg-red-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <button
                      onClick={() => toggleTaskStatus(task)}
                      className={`mt-1 p-1 rounded hover:bg-gray-100 transition-colors ${
                        task.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                      }`}
                      title={task.status === 'completed' ? 'Marcar como pendiente' : 'Marcar como completada'}
                    >
                      <StatusIcon className="w-5 h-5" />
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className={`font-medium mr-3 ${
                          task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}>
                          {task.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <div className={`ml-2 flex items-center ${priorityConfig.textColor}`}>
                          <Flag className="w-3 h-3 mr-1" />
                          <span className="text-xs font-medium">{priorityConfig.label}</span>
                        </div>
                        {overdue && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            Vencida
                          </span>
                        )}
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                        {task.due_date && (
                          <div className={`flex items-center ${
                            overdue ? 'text-red-600 font-medium' : ''
                          }`}>
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(task.due_date).toLocaleDateString('es-ES')}
                          </div>
                        )}
                        {task.assigned_to && (
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {task.assigned_to}
                          </div>
                        )}
                        {task.contact_name && (
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            Contacto: {task.contact_name}
                          </div>
                        )}
                        {task.deal_title && (
                          <div className="flex items-center">
                            <CheckSquare className="w-4 h-4 mr-1" />
                            Deal: {task.deal_title}
                          </div>
                        )}
                      </div>
                      
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar tarea"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar tarea"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de creación/edición */}
      {(showCreateModal || editingTask) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Título de la tarea"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción de la tarea"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {statuses.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridad
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {priorities.map(priority => (
                        <option key={priority.value} value={priority.value}>{priority.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de vencimiento
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Asignado a
                    </label>
                    <input
                      type="text"
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nombre del responsable"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contacto relacionado
                    </label>
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nombre del contacto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deal relacionado
                    </label>
                    <input
                      type="text"
                      value={formData.deal_title}
                      onChange={(e) => setFormData({ ...formData, deal_title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Título del deal"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  onClick={editingTask ? updateTask : createTask}
                  disabled={submitting || !formData.title.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingTask ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksManager;