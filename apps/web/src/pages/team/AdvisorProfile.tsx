import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, MapPin, Award, TrendingUp, Clock, CheckCircle, AlertCircle, ArrowLeft, Edit, Save, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTasksStore } from '../../store/tasksStore';
import { usePermissions } from '../../hooks/usePermissions';
import { cn } from '../../utils/cn';
import { toast } from 'sonner';

interface AdvisorData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  joinDate: string;
  lastActive: string;
  location?: string;
  department?: string;
  manager?: string;
  bio?: string;
  skills: string[];
  certifications: string[];
  performance: {
    tasksCompleted: number;
    averageRating: number;
    responseTime: number; // en horas
    clientSatisfaction: number;
  };
  stats: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
  };
}

const AdvisorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAllUsers, user } = useAuthStore();
  const { tasks } = useTasksStore();
  const { canViewAllUsers: canViewUserProfiles, canManageUsers: canEditUserProfiles } = usePermissions(user);
  
  const [advisor, setAdvisor] = useState<AdvisorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<AdvisorData>>({});

  useEffect(() => {
    if (canViewUserProfiles && id) {
      loadAdvisorData();
    }
  }, [id, canViewUserProfiles]);

  const loadAdvisorData = async () => {
    try {
      setLoading(true);
      const users = await getAllUsers();
      const user = users.find(u => u.id === id);
      
      if (!user) {
        toast.error('Asesor no encontrado');
        navigate('/team');
        return;
      }

      // Calcular estadísticas de tareas
      const userTasks = tasks.filter(task => 
        task.assignments?.some(assignment => assignment.assigned_to === id)
      );
      
      const completedTasks = userTasks.filter(task => task.status === 'completed').length;
      const pendingTasks = userTasks.filter(task => task.status === 'pending').length;
      const overdueTasks = userTasks.filter(task => {
        if (!task.due_date) return false;
        return new Date(task.due_date) < new Date() && task.status !== 'completed';
      }).length;

      // Datos simulados para demo
      const advisorData: AdvisorData = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '+52 55 1234 5678',
        role: user.role,
        status: user.role,
        joinDate: user.createdAt || '2024-01-15',
        lastActive: new Date().toISOString(),
        location: 'Ciudad de México, México',
        department: 'Ventas',
        manager: 'Carlos Manager',
        bio: 'Asesor experimentado con más de 5 años en el sector inmobiliario. Especializado en propiedades residenciales y comerciales.',
        skills: ['Ventas', 'Negociación', 'Atención al Cliente', 'CRM', 'Marketing Digital'],
        certifications: ['Certificación en Ventas Inmobiliarias', 'Curso de Negociación Avanzada'],
        performance: {
          tasksCompleted: completedTasks,
          averageRating: 4.7,
          responseTime: 2.3,
          clientSatisfaction: 92
        },
        stats: {
          totalTasks: userTasks.length,
          completedTasks,
          pendingTasks,
          overdueTasks
        }
      };

      setAdvisor(advisorData);
      setEditForm(advisorData);
    } catch (error) {
      console.error('Error loading advisor data:', error);
      toast.error('Error al cargar los datos del asesor');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // En una implementación real, enviaríamos los datos a la API
      setAdvisor(prev => ({ ...prev, ...editForm } as AdvisorData));
      setEditing(false);
      toast.success('Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error saving advisor data:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditForm(advisor || {});
    setEditing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-pear-50 text-pear-700';
      case 'pending':
        return 'bg-sunlight-50 text-sunlight-700';
      case 'rejected':
        return 'bg-error-50 text-error';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-cactus-50 text-cactus-700';
      case 'manager':
        return 'bg-terracotta-50 text-terracotta-700';
      case 'advisor':
        return 'bg-oasis-50 text-oasis-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  if (!canViewUserProfiles) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <User className="h-16 w-16 text-error mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary mb-2">Acceso Denegado</h2>
          <p className="text-muted">No tienes permisos para ver este perfil.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cactus-600 mx-auto mb-4"></div>
          <p className="text-muted">Cargando perfil del asesor...</p>
        </div>
      </div>
    );
  }

  if (!advisor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <User className="h-16 w-16 text-error mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary mb-2">Asesor no encontrado</h2>
          <p className="text-muted mb-4">El asesor que buscas no existe o ha sido eliminado.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/team')}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-primary">Perfil del Asesor</h1>
              <p className="text-secondary">Información detallada y métricas de rendimiento</p>
            </div>
          </div>
          {canEditUserProfiles && (
            <div className="flex items-center space-x-2">
              {editing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex items-center space-x-2 px-4 py-2 border border-border-primary text-secondary rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancelar</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-pear-600 text-white rounded-lg hover:bg-pear-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>Guardar</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-pear-600 text-white rounded-lg hover:bg-pear-700 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Editar</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Información Personal */}
        <div className="lg:col-span-1">
          <div className="bg-secondary rounded-lg shadow-sm border border-border-primary p-6">
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-cactus-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-12 w-12 text-cactus-600" />
            </div>
              {editing ? (
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="text-xl font-bold text-primary text-center border-b border-border-primary focus:ring-cactus-500 outline-none"
                />
              ) : (
                <h2 className="text-xl font-bold text-primary">{advisor.name}</h2>
              )}
              <div className="flex items-center justify-center space-x-2 mt-2">
                <span className={cn('px-2 py-1 text-xs font-semibold rounded-full', getRoleColor(advisor.role))}>
                  {advisor.role === 'admin' ? 'Administrador' : advisor.role === 'manager' ? 'Manager' : 'Asesor'}
                </span>
                <span className={cn('px-2 py-1 text-xs font-semibold rounded-full', getStatusColor(advisor.status))}>
                  {advisor.status === 'approved' ? 'Aprobado' : advisor.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted" />
                <span className="text-sm text-muted">{advisor.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted" />
                {editing ? (
                  <input
                    type="text"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="text-sm text-muted border-b border-border-primary focus:ring-cactus-500 outline-none flex-1"
                  />
                ) : (
                  <span className="text-sm text-muted">{advisor.phone}</span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-muted" />
                {editing ? (
                  <input
                    type="text"
                    value={editForm.location || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    className="text-sm text-muted border-b border-border-primary focus:ring-cactus-500 outline-none flex-1"
                  />
                ) : (
                  <span className="text-sm text-muted">{advisor.location}</span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted" />
                <span className="text-sm text-muted">
                  Miembro desde {new Date(advisor.joinDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-muted" />
                <span className="text-sm text-muted">
                  Última actividad: {new Date(advisor.lastActive).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Biografía */}
            <div className="mt-6 pt-6 border-t border-border-primary">
              <h3 className="text-sm font-medium text-primary mb-2">Biografía</h3>
              {editing ? (
                <textarea
                  value={editForm.bio || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full text-sm text-muted border border-border-primary rounded-lg p-2 focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                />
              ) : (
                <p className="text-sm text-muted">{advisor.bio}</p>
              )}
            </div>

            {/* Habilidades */}
            <div className="mt-6 pt-6 border-t border-border-primary">
              <h3 className="text-sm font-medium text-primary mb-2">Habilidades</h3>
              <div className="flex flex-wrap gap-2">
                {advisor.skills.map((skill, index) => (
                  <span key={index} className="px-2 py-1 bg-cactus-50 text-cactus-700 text-xs rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Certificaciones */}
            <div className="mt-6 pt-6 border-t border-border-primary">
              <h3 className="text-sm font-medium text-primary mb-2">Certificaciones</h3>
              <div className="space-y-2">
                {advisor.certifications.map((cert, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Award className="h-4 w-4 text-sunlight-600" />
                    <span className="text-sm text-muted">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Métricas y Estadísticas */}
        <div className="lg:col-span-2 space-y-8">
          {/* Métricas de Rendimiento */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-secondary rounded-lg shadow-sm border border-border-primary p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">Tareas Completadas</p>
                  <p className="text-2xl font-bold text-primary mt-1">{advisor.performance.tasksCompleted}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-cactus-600" />
              </div>
            </div>

            <div className="bg-secondary rounded-lg shadow-sm border border-border-primary p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">Calificación Promedio</p>
                  <p className="text-2xl font-bold text-primary mt-1">{advisor.performance.averageRating}/5</p>
                </div>
                <Award className="h-8 w-8 text-sunlight-600" />
              </div>
            </div>

            <div className="bg-secondary rounded-lg shadow-sm border border-border-primary p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">Tiempo de Respuesta</p>
                  <p className="text-2xl font-bold text-primary mt-1">{advisor.performance.responseTime}h</p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div className="bg-secondary rounded-lg shadow-sm border border-border-primary p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted">Satisfacción Cliente</p>
                  <p className="text-2xl font-bold text-primary mt-1">{advisor.performance.clientSatisfaction}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-cactus-600" />
              </div>
            </div>
          </div>

          {/* Estado de Tareas */}
          <div className="bg-secondary rounded-lg shadow-sm border border-border-primary p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Estado de Tareas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{advisor.stats.totalTasks}</div>
                <div className="text-sm text-muted">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cactus-600">{advisor.stats.completedTasks}</div>
                <div className="text-sm text-muted">Completadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-sunlight-600">{advisor.stats.pendingTasks}</div>
                <div className="text-sm text-muted">Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-error">{advisor.stats.overdueTasks}</div>
                <div className="text-sm text-muted">Vencidas</div>
              </div>
            </div>
          </div>

          {/* Actividad Reciente */}
          <div className="bg-secondary rounded-lg shadow-sm border border-border-primary p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Actividad Reciente</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-cactus-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">Completó la tarea "Seguimiento cliente ABC"</p>
                  <p className="text-xs text-muted">Hace 2 horas</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-sunlight-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">Actualizó el estado de "Propuesta inmobiliaria XYZ"</p>
                  <p className="text-xs text-muted">Hace 4 horas</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">Se unió a la reunión de equipo</p>
                  <p className="text-xs text-muted">Hace 1 día</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisorProfile;