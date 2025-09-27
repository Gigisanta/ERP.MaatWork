import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip, CartesianGrid, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { Users, TrendingUp, Target, Clock, CheckCircle, Calendar, User, Zap, AlertCircle, Plus, Check, BarChart3, Download, Filter, Eye, UserCheck, Phone, Mail } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCRMStore } from '../../store/crmStore';
import { useMetricsStore } from '../../store/metricsStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { useTasksStore, Task } from '../../store/tasksStore';
import { useTeamStore } from '../../store/teamStore';
import { usePermissions } from '../../utils/permissions';
import LiveMetricsPanel from '../LiveMetricsPanel';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';


interface TeamMemberMetrics {
  id: string;
  name: string;
  role: string;
  totalContacts: number;
  activeProspects: number;
  conversions: number;
  conversionRate: number;
  tasksCompleted: number;
  tasksTotal: number;
  lastActivity: string;
  status: 'active' | 'inactive' | 'pending';
}

interface TeamOverviewData {
  totalMembers: number;
  activeMembers: number;
  totalContacts: number;
  totalConversions: number;
  averageConversionRate: number;
  totalTasks: number;
  completedTasks: number;
  pendingApprovals: number;
}

const ManagerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { contacts } = useCRMStore();
  const { currentMetrics, calculateMetrics, isCalculating } = useMetricsStore();
  const { refreshDashboard, getChartData, isRefreshing, lastUpdated } = useDashboardStore();
  const { tasks, getTeamTasksWithAssignments } = useTasksStore();
  const { teamMembers, fetchTeamMembers, getTeamAdvisors } = useTeamStore();
  const { canManageTeam, canViewAllUsers, canViewMetrics } = usePermissions();
  
  const [teamMetrics, setTeamMetrics] = useState<TeamMemberMetrics[]>([]);
  const [teamOverview, setTeamOverview] = useState<TeamOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');
  const [teamTasks, setTeamTasks] = useState<Task[]>([]);

  // Check permissions
  if (!canManageTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-error-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Acceso Denegado</h2>
          <p className="text-neutral-600">No tienes permisos para acceder al dashboard de manager.</p>
        </div>
      </div>
    );
  }

  // Load team data
  useEffect(() => {
    const loadTeamData = async () => {
      if (!user?.team_id) return;
      
      try {
        setLoading(true);
        
        // Fetch team members
        await fetchTeamMembers(user.team_id);
        
        // Fetch team tasks
        const tasks = await getTeamTasksWithAssignments(user.team_id);
        setTeamTasks(tasks);
        
        // Calculate metrics
        if (user?.id) {
          await calculateMetrics(user.id, 'month');
        }
        await refreshDashboard();
        
      } catch (error) {
        console.error('Error loading team data:', error);
        toast.error('Error al cargar los datos del equipo');
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [user?.team_id, fetchTeamMembers, getTeamTasksWithAssignments, calculateMetrics, refreshDashboard]);

  // Calculate team metrics
  useEffect(() => {
    if (teamMembers.length > 0) {
      const advisors = getTeamAdvisors(user?.team_id || '');
      
      const metrics: TeamMemberMetrics[] = advisors.map(advisor => {
        const advisorContacts = contacts.filter(c => c.assignedTo === advisor.user?.id);
        const advisorTasks = teamTasks.filter(task => 
          task.assignments?.some(assignment => assignment.assigned_to === advisor.user_id)
        );
        
        const conversions = advisorContacts.filter(c => c.status === 'Cliente').length;
        const activeProspects = advisorContacts.filter(c => 
          c.status !== 'Cliente' && c.status !== 'Cuenta Vacia'
        ).length;
        
        const completedTasks = advisorTasks.filter(task => task.status === 'completed').length;
        
        return {
          id: advisor.user_id,
          name: advisor.user?.full_name || 'Sin nombre',
          role: advisor.role,
          totalContacts: advisorContacts.length,
          activeProspects,
          conversions,
          conversionRate: advisorContacts.length > 0 ? (conversions / advisorContacts.length) * 100 : 0,
          tasksCompleted: completedTasks,
          tasksTotal: advisorTasks.length,
          lastActivity: new Date().toISOString(),
          status: advisor.status as 'active' | 'inactive' | 'pending'
        };
      });
      
      setTeamMetrics(metrics);
      
      // Calculate team overview
      const overview: TeamOverviewData = {
        totalMembers: teamMembers.length,
        activeMembers: teamMembers.filter(m => m.status === 'active').length,
        totalContacts: metrics.reduce((sum, m) => sum + m.totalContacts, 0),
        totalConversions: metrics.reduce((sum, m) => sum + m.conversions, 0),
        averageConversionRate: metrics.length > 0 
          ? metrics.reduce((sum, m) => sum + m.conversionRate, 0) / metrics.length 
          : 0,
        totalTasks: teamTasks.length,
        completedTasks: teamTasks.filter(task => task.status === 'completed').length,
        pendingApprovals: 0 // This would come from approval system
      };
      
      setTeamOverview(overview);
    }
  }, [teamMembers, contacts, teamTasks, user?.team_id, getTeamAdvisors]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) {
        calculateMetrics(user.id, 'month');
      }
      refreshDashboard();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [calculateMetrics, refreshDashboard]);

  // Chart data
  const teamPerformanceData = teamMetrics.map(member => ({
    name: member.name.split(' ')[0], // First name only for chart
    conversions: member.conversions,
    conversionRate: member.conversionRate,
    contacts: member.totalContacts,
    tasks: member.tasksCompleted
  }));

  const conversionTrendData = getChartData('conversion-trend', selectedTimeframe) || [];
  const pipelineDistributionRaw = getChartData('pipeline-distribution') || [];
  
  // Convertir ChartDataPoint[] a formato compatible con recharts
  const pipelineDistributionData = pipelineDistributionRaw.map(item => ({
    name: item.label,
    value: item.value,
    color: item.color || '#8884d8'
  }));

  const exportTeamReport = () => {
    const reportData = {
      teamOverview,
      teamMetrics,
      teamPerformanceData,
      generatedAt: new Date().toISOString(),
      generatedBy: user?.name,
      timeframe: selectedTimeframe
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Reporte exportado exitosamente');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cactus-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Dashboard de Manager</h1>
          <p className="text-secondary">Gestión y análisis del rendimiento del equipo</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as 'week' | 'month' | 'quarter')}
            className="px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
          >
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="quarter">Último trimestre</option>
          </select>
          <button
            onClick={exportTeamReport}
            className="flex items-center space-x-2 px-4 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Reporte</span>
          </button>
        </div>
      </div>

      {/* Live Metrics Panel */}
      <LiveMetricsPanel className="mb-8" />

      {/* Team Overview Cards */}
      {teamOverview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Miembros del Equipo</p>
                <p className="text-2xl font-bold text-primary">{teamOverview.totalMembers}</p>
                <p className="text-xs text-cactus-600">{teamOverview.activeMembers} activos</p>
              </div>
              <Users className="h-8 w-8 text-cactus-600" />
            </div>
          </div>

          <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Total Contactos</p>
                <p className="text-2xl font-bold text-primary">{teamOverview.totalContacts}</p>
                <p className="text-xs text-oasis-600">Del equipo completo</p>
              </div>
              <Phone className="h-8 w-8 text-oasis-600" />
            </div>
          </div>

          <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Conversiones</p>
                <p className="text-2xl font-bold text-primary">{teamOverview.totalConversions}</p>
                <p className="text-xs text-cactus-600">{teamOverview.averageConversionRate.toFixed(1)}% promedio</p>
              </div>
              <Target className="h-8 w-8 text-terracotta-600" />
            </div>
          </div>

          <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Tareas Completadas</p>
                <p className="text-2xl font-bold text-primary">{teamOverview.completedTasks}</p>
                <p className="text-xs text-secondary">de {teamOverview.totalTasks} totales</p>
              </div>
              <CheckCircle className="h-8 w-8 text-cactus-600" />
            </div>
          </div>
        </div>
      )}

      {/* Team Performance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Rendimiento por Asesor</h3>
          <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="conversions" fill="#16a34a" name="Conversiones" />
                <Bar dataKey="contacts" fill="#0ea5e9" name="Contactos" />
              </BarChart>
            </ResponsiveContainer>
        </div>

        <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Distribución del Pipeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pipelineDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#f97316"
                dataKey="value"
              >
                {pipelineDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="bg-primary rounded-lg shadow-sm border border-border-primary">
        <div className="px-6 py-4 border-b border-border-primary">
          <h3 className="text-lg font-semibold text-primary">Miembros del Equipo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-primary">
            <thead className="bg-soft">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Asesor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Contactos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Conversiones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Tasa de Conversión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Tareas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-primary divide-y divide-border-primary">
              {teamMetrics.map((member) => (
                <tr key={member.id} className="hover:bg-soft">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-soft flex items-center justify-center">
                          <User className="h-5 w-5 text-secondary" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-primary">{member.name}</div>
                        <div className="text-sm text-secondary">{member.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-primary">{member.totalContacts}</div>
                    <div className="text-sm text-secondary">{member.activeProspects} activos</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-primary">{member.conversions}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-primary">{member.conversionRate.toFixed(1)}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-primary">
                      {member.tasksCompleted}/{member.tasksTotal}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                      member.status === 'active' ? 'bg-cactus-100 text-cactus-800' :
                      member.status === 'pending' ? 'bg-sunlight-100 text-sunlight-800' :
                      'bg-error-100 text-error-800'
                    )}>
                      {member.status === 'active' ? 'Activo' :
                       member.status === 'pending' ? 'Pendiente' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-cactus-600 hover:text-cactus-900 mr-3">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-oasis-600 hover:text-oasis-900">
                      <Mail className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversion Trend Chart */}
      <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Tendencia de Conversiones</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={conversionTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#16a34a" 
              strokeWidth={2}
              name="Conversiones"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ManagerDashboard;