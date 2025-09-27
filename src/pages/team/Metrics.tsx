import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, CheckCircle, Clock, Target, Calendar, Download, Filter } from 'lucide-react';
import { useTasksStore } from '../../store/tasksStore';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../utils/permissions';
import { cn } from '../../lib/utils';
// Removed LayoutConfig import - using semantic Tailwind classes

interface MetricCard {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

const Metrics: React.FC = () => {
  const { tasks, fetchTasks } = useTasksStore();
  const { getAllUsers } = useAuthStore();
  const { canViewMetrics } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState('30'); // días
  const [selectedMetric, setSelectedMetric] = useState('tasks');

  useEffect(() => {
    if (canViewMetrics) {
      loadData();
    }
  }, [canViewMetrics, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      await fetchTasks();
      const allUsers = await getAllUsers();
      setUsers(allUsers.filter(user => user.isApproved));
    } catch (error) {
      console.error('Error loading metrics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular métricas
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const overdueTasks = tasks.filter(task => {
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date() && task.status !== 'completed';
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const activeUsers = users.filter(user => user.lastActive && 
    new Date(user.lastActive) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  // Datos para gráficos
  const taskStatusData = [
    { name: 'Completadas', value: completedTasks, color: '#16a34a' }, // cactus-600
    { name: 'En Progreso', value: inProgressTasks, color: '#0ea5e9' }, // oasis-500
    { name: 'Pendientes', value: pendingTasks, color: '#f59e0b' }, // sunlight-500
    { name: 'Vencidas', value: overdueTasks, color: '#dc2626' } // error-600
  ];

  const tasksByPriority = [
    { name: 'Alta', value: tasks.filter(t => t.priority === 'high').length, color: '#dc2626' }, // error-600
    { name: 'Media', value: tasks.filter(t => t.priority === 'medium').length, color: '#f59e0b' }, // sunlight-500
    { name: 'Baja', value: tasks.filter(t => t.priority === 'low').length, color: '#16a34a' } // cactus-600
  ];

  // Datos de productividad por usuario
  const userProductivity = users.map(user => {
    const userTasks = tasks.filter(task => 
      task.assignments?.some(assignment => assignment.assigned_to === user.id)
    );
    const userCompleted = userTasks.filter(task => task.status === 'completed').length;
    
    return {
      name: user.name,
      total: userTasks.length,
      completed: userCompleted,
      rate: userTasks.length > 0 ? Math.round((userCompleted / userTasks.length) * 100) : 0
    };
  }).filter(user => user.total > 0);

  // Datos de tendencia (simulados para demo)
  const trendData = [
    { name: 'Sem 1', completed: 12, created: 15 },
    { name: 'Sem 2', completed: 18, created: 20 },
    { name: 'Sem 3', completed: 25, created: 22 },
    { name: 'Sem 4', completed: 30, created: 28 }
  ];

  const metricCards: MetricCard[] = [
    {
      title: 'Total de Tareas',
      value: totalTasks,
      change: '+12%',
      changeType: 'positive',
      icon: <CheckCircle className="h-6 w-6" />
    },
    {
      title: 'Tasa de Completitud',
      value: `${completionRate}%`,
      change: '+5%',
      changeType: 'positive',
      icon: <Target className="h-6 w-6" />
    },
    {
      title: 'Usuarios Activos',
      value: activeUsers,
      change: '+3',
      changeType: 'positive',
      icon: <Users className="h-6 w-6" />
    },
    {
      title: 'Tareas Vencidas',
      value: overdueTasks,
      change: '-2',
      changeType: 'positive',
      icon: <Clock className="h-6 w-6" />
    }
  ];

  const exportData = () => {
    const data = {
      metrics: metricCards,
      tasks: tasks,
      users: userProductivity,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!canViewMetrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-primary mb-2">Acceso Denegado</h2>
          <p className="text-secondary">No tienes permisos para ver las métricas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Dashboard de Métricas</h1>
            <p className="text-secondary">Análisis de rendimiento y productividad del equipo</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-200 focus:border-transparent"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
            </select>
            <button
              onClick={exportData}
              className="flex items-center space-x-2 px-4 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cactus-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metricCards.map((card, index) => (
              <div key={index} className="bg-primary rounded-lg shadow-sm border border-border-secondary p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary">{card.title}</p>
                    <p className="text-2xl font-bold text-primary mt-1">{card.value}</p>
                  </div>
                  <div className="bg-cactus-50 p-3 rounded-full">
                    <div className="text-cactus-600">{card.icon}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className={cn(
                    'text-sm font-medium',
                    card.changeType === 'positive' ? 'text-cactus-600' : 
                    card.changeType === 'negative' ? 'text-error' : 'text-secondary'
                  )}>
                    {card.change}
                  </span>
                  <span className="text-sm text-secondary ml-2">vs período anterior</span>
                </div>
              </div>
            ))}
          </div>

          {/* Gráficos principales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Estado de tareas */}
            <div className="bg-primary rounded-lg shadow-sm border border-border-secondary p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Estado de Tareas</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {taskStatusData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-secondary">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tareas por prioridad */}
            <div className="bg-primary rounded-lg shadow-sm border border-border-secondary p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Tareas por Prioridad</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tasksByPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Productividad por usuario */}
          {userProductivity.length > 0 && (
            <div className="bg-primary rounded-lg shadow-sm border border-border-secondary p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Productividad por Usuario</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userProductivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#16a34a" name="Completadas" />
                  <Bar dataKey="total" fill="#d1d5db" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tendencia de tareas */}
          <div className="bg-primary rounded-lg shadow-sm border border-border-secondary p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Tendencia de Tareas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="#16a34a" strokeWidth={2} name="Completadas" />
                <Line type="monotone" dataKey="created" stroke="#0ea5e9" strokeWidth={2} name="Creadas" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla de resumen */}
          <div className="bg-primary rounded-lg shadow-sm border border-border-secondary p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Resumen Detallado</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border-secondary">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                        Tareas Asignadas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                        Completadas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-tertiary uppercase tracking-wider">
                        Tasa de Éxito
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-primary divide-y divide-border-secondary">
                  {userProductivity.map((user, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-tertiary">
                        {user.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-tertiary">
                        {user.completed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                          user.rate >= 80 ? 'bg-cactus-100 text-cactus-800' :
                          user.rate >= 60 ? 'bg-sunlight-100 text-sunlight-800' :
                          'bg-error-100 text-error-800'
                        )}>
                          {user.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Metrics;