import React, { useEffect, useState, useRef, useCallback, memo, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Users, TrendingUp, Target, Clock, CheckCircle, Calendar, User, Zap, AlertCircle, Plus, Check, BarChart3, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCRMStore } from '../store/crmStore';
import { useMetricsStore } from '../store/metricsStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useTasksStore, Task } from '../store/tasksStore';
import { useTeamStore } from '../store/teamStore';
import LiveMetricsPanel from '../components/LiveMetricsPanel';
import ManagerDashboard from '../components/manager/ManagerDashboard';
import { cn } from '../lib/utils';
// Removed LayoutConfig import - using semantic Tailwind classes

// Configuración temporal para desarrollo - Cache cleared
const isDevelopment = () => process.env.NODE_ENV === 'development';
const CONFIG = { 
  USE_MOCK_DATA: true,
  PRODUCTION_MESSAGES: {
    NO_DATA: 'No hay datos disponibles'
  }
};

const Dashboard: React.FC = () => {
  const { user, isLoading } = useAuthStore();
  
  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-cactus-600" />
            <p className="text-secondary">Cargando dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Redirect managers to their dedicated dashboard
  if (user?.role === 'manager') {
    return <ManagerDashboard />;
  }
  
  // Continue with advisor dashboard for other roles
  
  // Hooks de los nuevos stores
  const contacts = useCRMStore(state => state.contacts);
  const { currentMetrics, calculateMetrics, isCalculating } = useMetricsStore();
  const { refreshDashboard, getChartData, isRefreshing, lastUpdated } = useDashboardStore();
  const { subscribeToTasks, unsubscribeFromTasks } = useTasksStore();
  
  // Auto-refresh del dashboard
  useEffect(() => {
    const interval = setInterval(() => {
      calculateMetrics();
      refreshDashboard();
    }, 30000); // Refresh cada 30 segundos
    
    return () => clearInterval(interval);
  }, [calculateMetrics, refreshDashboard]);

  useEffect(() => {
    // Refresh inicial del dashboard
    refreshDashboard();
  }, [refreshDashboard]);

  // Suscripción en tiempo real para tareas
  useEffect(() => {
    if (user?.team_id) {
      subscribeToTasks(user.team_id);
    }
    
    return () => {
      unsubscribeFromTasks();
    };
  }, [user?.team_id, subscribeToTasks, unsubscribeFromTasks]);

  const userRole = user?.role || 'advisor';
  const userName = user?.name || 'Usuario';

  // Métricas en tiempo real desde los stores
  const getRealTimeMetrics = () => {
    // currentMetrics ya está disponible del hook
    const performanceIndicators = currentMetrics ? {
      callsThisWeek: 0,
      upcomingMeetings: 0,
      pendingFollowUps: 0,
      activeAdvisors: 0,
      pendingApprovals: 0
    } : null;
    
    if (!currentMetrics) {
      // Fallback a datos mock en desarrollo o ceros en producción
      if (isDevelopment() && CONFIG.USE_MOCK_DATA) {
        return {
          advisor: {
            totalContacts: 45,
            activeProspects: 12,
            callsThisWeek: 28,
            conversionsThisMonth: 5,
            nextMeetings: 3,
            pendingFollowUps: 7
          },
          manager: {
            totalTeamContacts: 234,
            activeAdvisors: 8,
            teamCallsThisWeek: 156,
            teamConversionsThisMonth: 23,
            pendingApprovals: 2,
            teamTarget: 85
          }
        };
      }
      return {
        advisor: {
          totalContacts: 0,
          activeProspects: 0,
          callsThisWeek: 0,
          conversionsThisMonth: 0,
          nextMeetings: 0,
          pendingFollowUps: 0
        },
        manager: {
          totalTeamContacts: 0,
          activeAdvisors: 0,
          teamCallsThisWeek: 0,
          teamConversionsThisMonth: 0,
          pendingApprovals: 0,
          teamTarget: 0
        }
      };
    }
    
    // Métricas reales calculadas
    return {
      advisor: {
        totalContacts: currentMetrics.totalContacts,
        activeProspects: currentMetrics.activeProspects,
        callsThisWeek: performanceIndicators?.callsThisWeek || 0,
        conversionsThisMonth: currentMetrics.conversionsThisMonth,
        nextMeetings: performanceIndicators?.upcomingMeetings || 0,
        pendingFollowUps: performanceIndicators?.pendingFollowUps || 0
      },
      manager: {
        totalTeamContacts: currentMetrics.totalContacts,
        activeAdvisors: performanceIndicators?.activeAdvisors || 0,
        teamCallsThisWeek: performanceIndicators?.callsThisWeek || 0,
        teamConversionsThisMonth: currentMetrics.conversionsThisMonth,
        pendingApprovals: performanceIndicators?.pendingApprovals || 0,
        teamTarget: Math.round(currentMetrics.conversionRate)
      }
    };
  };
  
  const realTimeMetrics = getRealTimeMetrics();
  const advisorMetrics = realTimeMetrics.advisor;
  const managerMetrics = realTimeMetrics.manager;

  // Datos para gráficos desde los stores

  // Datos adicionales para gráficos desde los stores
  const pipelineDistributionData = getChartData('pipeline-distribution', 'month') || [];
  const conversionTrendData = getChartData('conversion-trend', 'month') || [];
  
  // Convertir formato para recharts
  const contactStatusData = pipelineDistributionData.map(item => ({
    name: item.label,
    value: item.value,
    color: item.color
  }));
  
  const monthlyTrendData = conversionTrendData.map(item => ({
    month: item.label,
    conversions: item.value
  }));

  // MetricCard ya está rediseñado en el componente separado



  const TeamTasksSummary: React.FC = () => {
    const { user } = useAuthStore();
    // Temporalmente comentado para evitar bucle infinito
    // const { teamMembers, fetchTeamMembers } = useTeamStore();
    // const { getTeamTasksWithAssignments, taskAssignments } = useTasksStore();
    const [teamTasks, setTeamTasks] = useState<Task[]>([]);
    const [teamAdvisors, setTeamAdvisors] = useState<any[]>([]);

    // useEffect(() => {
    //   const loadTeamData = async () => {
    //     if (user?.team_id && user?.role === 'manager') {
    //       try {
    //         await fetchTeamMembers(user.team_id);
    //         const tasks = await getTeamTasksWithAssignments(user.team_id);
    //         setTeamTasks(tasks);
    //       } catch (error) {
    //         console.error('Error loading team data:', error);
    //       }
    //     }
    //   };
    //   loadTeamData();
    // }, [user, fetchTeamMembers, getTeamTasksWithAssignments]);

    // useEffect(() => {
    //   if (teamMembers.length > 0) {
    //     const advisors = teamMembers.filter(member => member.role === 'advisor');
    //     setTeamAdvisors(advisors);
    //   }
    // }, [teamMembers]);

    if (user?.role !== 'manager') {
      return null;
    }

    const getTasksByAdvisor = () => {
      const advisorTasks: { [key: string]: { advisor: any; tasks: Task[] } } = {};
      
      teamAdvisors.forEach(advisor => {
        const advisorTaskList = teamTasks.filter(task => 
          task.assignments?.some(assignment => assignment.assigned_to === advisor.id)
        );
        advisorTasks[advisor.id] = {
          advisor,
          tasks: advisorTaskList
        };
      });
      
      return advisorTasks;
    };

    const advisorTasks = getTasksByAdvisor();
    const totalTeamTasks = teamTasks.length;
    const completedTeamTasks = teamTasks.filter(task => task.status === 'completed').length;
    const pendingTeamTasks = teamTasks.filter(task => task.status === 'pending' || task.status === 'in_progress').length;

    return (
      <div className="bg-gradient-to-br from-cactus-50 to-cactus-100 rounded-2xl shadow-xl p-8 border border-cactus-200 hover:shadow-2xl transition-all duration-300 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-primary flex items-center font-cactus">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-success-400 to-success-600 rounded-lg shadow-sm mr-3">
              <Users className="w-4 h-4 text-white" />
            </div>
            Tareas del Equipo
          </h3>
        </div>

        {/* Resumen general */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-oasis-50 p-4 rounded-xl border border-oasis-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-oasis-500 rounded-full"></div>
              <span className="text-sm font-medium text-oasis-700">Total</span>
            </div>
            <p className="text-2xl font-bold text-oasis-800 mt-1">{totalTeamTasks}</p>
          </div>
          <div className="bg-sunlight-50 p-4 rounded-xl border border-sunlight-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-sunlight-500 rounded-full"></div>
              <span className="text-sm font-medium text-sunlight-700">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-sunlight-800 mt-1">{pendingTeamTasks}</p>
          </div>
          <div className="bg-cactus-50 p-4 rounded-xl border border-cactus-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 bg-cactus-500 rounded-full"></div>
              <span className="text-sm font-medium text-cactus-700">Completadas</span>
            </div>
            <p className="text-2xl font-bold text-cactus-800 mt-1">{completedTeamTasks}</p>
          </div>
        </div>

        {/* Lista de asesores y sus tareas */}
        <div className="space-y-4">
          {Object.values(advisorTasks).map(({ advisor, tasks }) => {
            const advisorPending = tasks.filter(task => task.status === 'pending' || task.status === 'in_progress').length;
            const advisorCompleted = tasks.filter(task => task.status === 'completed').length;
            
            return (
              <div key={advisor.id} className="bg-primary p-4 rounded-xl border border-border-secondary hover:border-cactus-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-full">
                      <User className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-primary">{advisor.full_name}</p>
                      <p className="text-sm text-muted">{advisor.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-sunlight-500 rounded-full"></div>
                <span className="text-sunlight-700">{advisorPending} pendientes</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-cactus-500 rounded-full"></div>
                <span className="text-cactus-700">{advisorCompleted} completadas</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {teamAdvisors.length === 0 && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cactus-100 to-cactus-200 rounded-full shadow-sm mb-4 mx-auto">
              <Users className="w-8 h-8 text-cactus-600" />
            </div>
            <p className="text-secondary font-cactus">No hay asesores en el equipo</p>
            <p className="text-sm text-disabled mt-2">Los asesores aparecerán aquí cuando se agreguen al equipo.</p>
          </div>
        )}
      </div>
    );
  };

  const UpcomingTasks: React.FC = () => {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
    const [localTasks, setLocalTasks] = useState<Task[]>([]);

    // Mock data para evitar el bucle infinito del store
    const mockTasks: Task[] = [
      {
        id: '1',
        team_id: user?.team_id || '',
        created_by: user?.id || '',
        title: 'Revisar propuestas de clientes',
        description: 'Analizar las nuevas propuestas recibidas',
        priority: 'high',
        status: 'pending',
        due_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        team_id: user?.team_id || '',
        created_by: user?.id || '',
        title: 'Llamar a cliente potencial',
        description: 'Seguimiento de reunión anterior',
        priority: 'medium',
        status: 'pending',
        due_date: new Date(Date.now() + 86400000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const userTasks = [...mockTasks, ...localTasks];
    const pendingTasks = userTasks.filter(task => task.status === 'pending' || task.status === 'in_progress');
    const completedTasks = userTasks.filter(task => task.status === 'completed');

    const handleCompleteTask = async (taskId: string) => {
      setCompletingTasks(prev => new Set(prev).add(taskId));
      try {
        // Actualizar estado local
        setLocalTasks(prev => 
          prev.map(task => 
            task.id === taskId 
              ? { ...task, status: 'completed' as const, updated_at: new Date().toISOString() }
              : task
          )
        );
        // Pequeño delay para mostrar la animación
        setTimeout(() => {
          setCompletingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
        }, 500);
      } catch (error) {
        console.error('Error completing task:', error);
        setCompletingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }
    };

    const handleAddPersonalTask = async () => {
      if (!newTaskTitle.trim() || !user?.team_id) return;
      
      try {
        const newTask: Task = {
          id: Date.now().toString(),
          team_id: user.team_id,
          created_by: user.id,
          title: newTaskTitle,
          description: 'Tarea personal creada desde el dashboard',
          priority: 'medium',
          status: 'pending',
          due_date: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setLocalTasks(prev => [...prev, newTask]);
        setNewTaskTitle('');
        setShowAddTask(false);
      } catch (error) {
        console.error('Error creating task:', error);
      }
    };

    const formatDueDate = (dueDate: string | null) => {
      if (!dueDate) return null;
      const date = new Date(dueDate);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Hoy';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Mañana';
      } else {
        return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      }
    };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'high': return 'bg-error-500';
        case 'medium': return 'bg-sunlight-500';
        case 'low': return 'bg-cactus-500';
        default: return 'bg-neutral-400';
      }
    };

    const TaskItem: React.FC<{ task: Task }> = ({ task }) => {
      const isCompleting = completingTasks.has(task.id);
      const isCompleted = task.status === 'completed';
      
      return (
        <div className={cn(
          "flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 group",
          isCompleting ? "opacity-50 scale-95" : "hover:bg-soft",
          isCompleted ? "opacity-75" : ""
        )}>
          <button
            onClick={() => !isCompleted && handleCompleteTask(task.id)}
            disabled={isCompleting || isCompleted}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200",
              isCompleted 
                ? "bg-primary border-primary text-white" 
                : "border-border-primary hover:border-primary hover:bg-cactus-50",
              isCompleting && "animate-pulse"
            )}
          >
            {isCompleted && <Check className="w-4 h-4" />}
          </button>
          
          <div className="flex items-center justify-center w-8 h-8 bg-soft rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-200">
            <Clock className="w-4 h-4 text-secondary" />
          </div>
          
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium font-cactus",
              isCompleted ? "text-disabled line-through" : "text-primary"
            )}>
              {task.title}
            </p>
            <div className="flex items-center space-x-2 text-xs text-disabled">
              {task.due_date && (
                <span>{formatDueDate(task.due_date)}</span>
              )}
              {task.description && (
                <span>• {task.description.substring(0, 30)}...</span>
              )}
            </div>
          </div>
          
          <div className={cn(
            "w-3 h-3 rounded-full",
            getPriorityColor(task.priority)
          )} />
        </div>
      );
    };
    
    return (
      <div className="bg-gradient-to-br from-oasis-50 to-oasis-100 rounded-2xl shadow-xl p-8 border border-border-primary hover:shadow-2xl transition-all duration-300 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-primary flex items-center font-cactus">
            <div className="flex items-center justify-center w-8 h-8 bg-oasis-500 rounded-lg shadow-sm mr-3">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            Mis Tareas
          </h3>
          
          <button
            onClick={() => setShowAddTask(!showAddTask)}
            className="flex items-center space-x-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-cactus-600 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar</span>
          </button>
        </div>

        {/* Formulario para agregar tarea personal */}
        {showAddTask && (
          <div className="mb-6 p-4 bg-soft rounded-xl border border-border-primary">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Título de la tarea personal..."
                className="flex-1 px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-200 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleAddPersonalTask()}
              />
              <button
                onClick={handleAddPersonalTask}
                disabled={!newTaskTitle.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-cactus-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >Crear</button>
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setNewTaskTitle('');
                }}
                className="px-4 py-2 bg-secondary text-primary rounded-lg hover:bg-soft transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Pestañas */}
        <div className="flex space-x-1 mb-6 bg-soft rounded-lg p-1">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
              activeTab === 'pending'
                ? "bg-secondary text-primary shadow-sm"
                : "text-secondary hover:text-primary"
            )}
          >
            Pendientes ({pendingTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
              activeTab === 'completed'
                ? "bg-secondary text-primary shadow-sm"
                : "text-secondary hover:text-primary"
            )}
          >
            Completadas ({completedTasks.length})
          </button>
        </div>

        {/* Lista de tareas */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activeTab === 'pending' ? (
            pendingTasks.length > 0 ? (
              pendingTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="flex items-center justify-center w-16 h-16 bg-soft rounded-full shadow-sm mb-4 mx-auto">
                  <Calendar className="w-8 h-8 text-secondary" />
                </div>
                <p className="text-secondary font-cactus">No hay tareas pendientes</p>
                <p className="text-sm text-disabled mt-2">¡Excelente trabajo! Todas las tareas están completadas.</p>
              </div>
            )
          ) : (
            completedTasks.length > 0 ? (
              completedTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="flex items-center justify-center w-16 h-16 bg-soft rounded-full shadow-sm mb-4 mx-auto">
                  <CheckCircle className="w-8 h-8 text-secondary" />
                </div>
                <p className="text-secondary font-cactus">No hay tareas completadas</p>
                <p className="text-sm text-disabled mt-2">Las tareas completadas aparecerán aquí.</p>
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* Métricas en tiempo real */}
      <LiveMetricsPanel className="mb-8" />

      {/* Sección de tareas del equipo - no needed since managers are redirected */}

      {/* Layout reorganizado: Mis Tareas (70%) y Distribución de Contactos (30%) */}
      <div className="grid grid-cols-10 gap-8">
        {/* Mis Tareas - 70% del ancho */}
        <div className="col-span-7">
          <UpcomingTasks />
        </div>

        {/* Gráfico de distribución de contactos - 30% del ancho */}
        <div className="col-span-3">
          <div className="bg-gradient-to-br from-sunlight-50 to-sunlight-100 rounded-2xl shadow-xl p-8 border border-border-primary hover:shadow-2xl transition-all duration-300">
            <h3 className="text-xl font-bold text-primary mb-6 flex items-center font-cactus">
              <div className="flex items-center justify-center w-8 h-8 bg-sunlight-500 rounded-lg shadow-sm mr-3">
                <Users className="w-4 h-4 text-white" />
              </div>
              Distribución de Contactos
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={contactStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {contactStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #fce7f3',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-1 gap-2 mt-6">
              {contactStatusData.map((item, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 rounded-lg bg-white/50">
                  <div 
                    className="w-3 h-3 rounded-full shadow-sm" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-disabled font-cactus">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de tendencia mensual */}
      <div className="bg-gradient-to-br from-cactus-50 to-cactus-100 rounded-2xl shadow-xl p-8 border border-border-primary hover:shadow-2xl transition-all duration-300">
        <h3 className="text-xl font-bold text-primary mb-6 flex items-center font-cactus">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg shadow-sm mr-3">
            <Target className="w-4 h-4 text-white" />
          </div>
          Tendencia de Conversiones - {userRole === 'advisor' ? 'Personal' : 'Equipo'}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e9d5ff',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="conversions" 
              stroke="#a855f7" 
              strokeWidth={4}
              dot={{ fill: '#a855f7', strokeWidth: 2, r: 8 }}
              activeDot={{ r: 10, stroke: '#a855f7', strokeWidth: 3, fill: '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;