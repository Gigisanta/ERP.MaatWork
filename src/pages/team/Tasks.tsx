import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, User, AlertCircle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { useTasksStore } from '../../store/tasksStore';
import { useAuthStore } from '../../store/authStore';
import { useTeamStore } from '../../store/teamStore';
import { usePermissions } from '../../utils/permissions';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import TaskAnnotationsModal from '../../components/TaskAnnotationsModal';


interface TaskForm {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  assignedTo: string;
}

const Tasks: React.FC = () => {
  const { user, getAllUsers } = useAuthStore();
  const { 
    tasks, 
    loading, 
    error, 
    fetchTasks, 
    createTask, 
    updateTask, 
    assignTask,
    getTeamTasksWithAssignments,
    fetchTaskAssignments,
    subscribeToTasks,
    unsubscribeFromTasks
  } = useTasksStore();
  const { getTeamAdvisors, fetchTeamMembers } = useTeamStore();
  const { canManageTasks } = usePermissions();
  
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaskForm>({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assignedTo: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [annotationsModal, setAnnotationsModal] = useState<{ isOpen: boolean; taskId: string; taskTitle: string }>({
    isOpen: false,
    taskId: '',
    taskTitle: ''
  });
  const [teamAdvisors, setTeamAdvisors] = useState<any[]>([]);
  const [teamTasks, setTeamTasks] = useState<any[]>([]);

  useEffect(() => {
    if (canManageTasks && user?.team_id) {
      fetchTasks(user.team_id);
      fetchTaskAssignments(user.team_id);
      
      // Cargar miembros del equipo para obtener asesores
      fetchTeamMembers(user.team_id).then(() => {
        const advisors = getTeamAdvisors(user.team_id);
        setTeamAdvisors(advisors);
        
        // Obtener tareas del equipo con asignaciones
        const tasksWithAssignments = getTeamTasksWithAssignments(user.team_id);
        setTeamTasks(tasksWithAssignments);
      });
      
      // Subscribe to real-time updates
      subscribeToTasks(user.team_id);
    }
    
    // Cleanup subscription on unmount
    return () => {
      unsubscribeFromTasks();
    };
  }, [canManageTasks, fetchTasks, fetchTaskAssignments, user, fetchTeamMembers, getTeamAdvisors, getTeamTasksWithAssignments, subscribeToTasks, unsubscribeFromTasks]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTasks) return;

    try {
      setSubmitting(true);
      
      const taskData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date,
        status: 'pending' as const,
        team_id: user?.team_id!,
        created_by: user?.id!
      };

      if (editingTask) {
        await updateTask(editingTask, taskData);
        setEditingTask(null);
      } else {
        const newTask = await createTask(taskData);
        if (formData.assignedTo && newTask) {
          await assignTask(newTask.id, formData.assignedTo);
        }
      }
      
      // Actualizar las tareas del equipo después de crear/editar
      if (user?.team_id) {
        await fetchTaskAssignments(user.team_id);
        const updatedTasks = getTeamTasksWithAssignments(user.team_id);
        setTeamTasks(updatedTasks);
      }
      
      setFormData({ title: '', description: '', priority: 'medium', due_date: '', assignedTo: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (task: any) => {
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.due_date?.split('T')[0] || '',
      assignedTo: task.assignments?.[0]?.userId || ''
    });
    setEditingTask(task.id);
    setShowForm(true);
  };

  const openAnnotationsModal = (task: any) => {
    setAnnotationsModal({
      isOpen: true,
      taskId: task.id,
      taskTitle: task.title
    });
  };

  const closeAnnotationsModal = () => {
    setAnnotationsModal({
      isOpen: false,
      taskId: '',
      taskTitle: ''
    });
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask(taskId, { status: newStatus as any });
      
      // Actualizar las tareas del equipo después del cambio
      if (user?.team_id) {
        const updatedTasks = getTeamTasksWithAssignments(user.team_id);
        setTeamTasks(updatedTasks);
      }
      
      toast.success('Estado de la tarea actualizado');
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Error al actualizar el estado de la tarea');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-error-50 text-error';
      case 'medium': return 'bg-sunlight-50 text-sunlight-700';
      case 'low': return 'bg-cactus-50 text-cactus-700';
      default: return 'bg-neutral-50 text-primary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-cactus-50 text-cactus-700';
      case 'in_progress': return 'bg-oasis-50 text-oasis-700';
      case 'pending': return 'bg-sunlight-50 text-sunlight-700';
      case 'cancelled': return 'bg-error-50 text-error';
      default: return 'bg-neutral-50 text-primary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'in_progress': return 'En Progreso';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  // Filtrar tareas del equipo
  const filteredTasks = teamTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    
    // Filtro por asesor asignado
    let matchesAssignee = true;
    if (filterAssignee !== 'all') {
      if (filterAssignee === 'unassigned') {
        matchesAssignee = !task.assignments || task.assignments.length === 0;
      } else if (filterAssignee === 'self') {
        matchesAssignee = task.assignments?.some(assignment => assignment.assigned_to === user?.id);
      } else {
        matchesAssignee = task.assignments?.some(assignment => assignment.assigned_to === filterAssignee);
      }
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  if (!canManageTasks) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-primary mb-2">Acceso Denegado</h2>
          <p className="text-muted">No tienes permisos para gestionar tareas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Panel de Tareas</h1>
            <p className="text-secondary">Gestiona y asigna tareas al equipo</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingTask(null);
              setFormData({ title: '', description: '', priority: 'medium', due_date: '', assignedTo: '' });
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg">
          <p className="text-error">{error}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 bg-secondary rounded-lg shadow-sm border border-border-primary p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar tareas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En Progreso</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
          >
            <option value="all">Todas las prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
          >
            <option value="all">Todos los asesores</option>
            <option value="self">Mis tareas</option>
            <option value="unassigned">Sin asignar</option>
            {teamAdvisors.map(advisor => (
              <option key={advisor.id} value={advisor.id}>
                {advisor.name}
              </option>
            ))}
          </select>
          <div className="flex items-center space-x-2 text-sm text-muted">
            <Filter className="h-4 w-4" />
            <span>{filteredTasks.length} tareas</span>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 bg-secondary rounded-lg shadow-sm border border-border-primary p-6">
          <h2 className="text-lg font-semibold text-primary mb-4">
            {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Título de la tarea
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                placeholder="Título de la tarea"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                rows={3}
                placeholder="Descripción detallada de la tarea"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Prioridad
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Fecha límite
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Asignar a
                </label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                >
                  <option value="">Sin asignar</option>
                  {/* Opción para asignarse a sí mismo */}
                  <option value={user?.id}>Propia</option>
                  {/* Asesores del equipo */}
                  {teamAdvisors.map(advisor => (
                    <option key={advisor.id} value={advisor.id}>
                      {advisor.name} (Asesor)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-4 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>{submitting ? 'Guardando...' : (editingTask ? 'Actualizar' : 'Crear Tarea')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingTask(null);
                }}
                className="px-4 py-2 text-muted border border-border-primary rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cactus-600"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-primary mb-2">No hay tareas</h3>
          <p className="text-muted">Comienza creando tu primera tarea.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTasks.map((task) => (
            <div key={task.id} className="bg-secondary rounded-lg shadow-sm border border-border-primary p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-primary">{task.title}</h3>
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      getPriorityColor(task.priority)
                    )}>
                      {getPriorityText(task.priority)}
                    </span>
                    <span className={cn(
                      'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                      getStatusColor(task.status)
                    )}>
                      {getStatusIcon(task.status)}
                      <span>{getStatusText(task.status)}</span>
                    </span>
                  </div>
                  
                  <p className="text-muted mb-3">{task.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted">
                    {task.due_date && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Vence: {new Date(task.due_date).toLocaleDateString('es-ES')}</span>
                      </div>
                    )}
                    {task.assignments && task.assignments.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>
                          Asignado a: {task.assignments.map((assignment, index) => {
                            const assignedUser = teamAdvisors.find(a => a.id === assignment.assigned_to) ||
                                               (assignment.assigned_to === user?.id ? { name: user.name, role: user.role } : null);
                            return (
                              <span key={assignment.assigned_to}>
                                {assignedUser?.name || 'Usuario desconocido'}
                                {assignedUser?.role && (
                                  <span className="text-xs text-muted ml-1">
                                    ({assignedUser.role})
                                  </span>
                                )}
                                {index < task.assignments.length - 1 && ', '}
                              </span>
                            );
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openAnnotationsModal(task)}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-secondary border border-border-secondary rounded hover:bg-neutral-50 transition-colors"
                    title="Ver anotaciones"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Anotaciones</span>
                  </button>
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className="px-3 py-1 text-sm border border-border-primary rounded focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="completed">Completada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                  <button
                    onClick={() => handleEdit(task)}
                    className="px-3 py-1 text-sm text-primary border border-border-primary rounded hover:bg-neutral-50 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Modal de Anotaciones */}
      <TaskAnnotationsModal
        isOpen={annotationsModal.isOpen}
        onClose={closeAnnotationsModal}
        taskId={annotationsModal.taskId}
        taskTitle={annotationsModal.taskTitle}
      />
    </div>
  );
};

export default Tasks;