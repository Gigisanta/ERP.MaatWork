import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { User, TrendingUp, Target, Clock, CheckCircle, Calendar, Phone, Mail, MessageSquare, Activity, Award, AlertTriangle, Eye, Edit } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCRMStore } from '../../store/crmStore';
import { useMetricsStore } from '../../store/metricsStore';
import { useTeamStore } from '../../store/teamStore';
import { useTasksStore } from '../../store/tasksStore';
import { usePermissions } from '../../utils/permissions';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface AdvisorDetailedMetrics {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  joinedAt: string;
  lastActivity: string;
  
  // Contact metrics
  totalContacts: number;
  newContactsThisMonth: number;
  activeProspects: number;
  coldLeads: number;
  hotLeads: number;
  conversions: number;
  conversionRate: number;
  
  // Activity metrics
  callsMade: number;
  emailsSent: number;
  meetingsScheduled: number;
  followUpsCompleted: number;
  
  // Task metrics
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
  taskCompletionRate: number;
  
  // Performance metrics
  monthlyGrowth: number;
  quarterlyGrowth: number;
  performanceScore: number;
  ranking: number;
  
  // Time-based data
  dailyActivity: Array<{ date: string; calls: number; emails: number; meetings: number }>;
  monthlyConversions: Array<{ month: string; conversions: number; target: number }>;
  pipelineDistribution: Array<{ stage: string; count: number; value: number }>;
}

interface AdvisorMetricsProps {
  advisorId?: string;
  className?: string;
  onAdvisorSelect?: (advisorId: string) => void;
}

const AdvisorMetrics: React.FC<AdvisorMetricsProps> = ({ 
  advisorId, 
  className, 
  onAdvisorSelect 
}) => {
  const { user } = useAuthStore();
  const { contacts } = useCRMStore();
  const { currentMetrics } = useMetricsStore();
  const { teamMembers, getTeamAdvisors } = useTeamStore();
  const { tasks } = useTasksStore();
  const { canViewAllUsers, canManageTeams } = usePermissions();
  
  const [selectedAdvisor, setSelectedAdvisor] = useState<string | null>(advisorId || null);
  const [advisorMetrics, setAdvisorMetrics] = useState<AdvisorDetailedMetrics | null>(null);
  const [allAdvisors, setAllAdvisors] = useState<AdvisorDetailedMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  // Get team advisors
  const teamAdvisors = getTeamAdvisors(user?.team_id || '');

  // Calculate detailed metrics for an advisor
  const calculateAdvisorMetrics = (advisorId: string): AdvisorDetailedMetrics | null => {
    const advisor = teamMembers.find(m => m.user_id === advisorId);
    if (!advisor || !advisor.user) return null;

    const advisorContacts = contacts.filter(c => c.assignedTo === advisor.user?.id);
    const advisorTasks = tasks.filter(task => 
      task.assignments?.some(assignment => assignment.assigned_to === advisorId)
    );

    // Contact metrics
    const conversions = advisorContacts.filter(c => c.status === 'Cliente').length;
    const activeProspects = advisorContacts.filter(c => 
      c.status !== 'Cliente' && c.status !== 'Cuenta Vacia'
    ).length;
    const hotLeads = advisorContacts.filter(c => c.status === 'Contactado').length;
    const coldLeads = advisorContacts.filter(c => c.status === 'Prospecto').length;
    
    // Task metrics
    const completedTasks = advisorTasks.filter(task => task.status === 'completed').length;
    const overdueTasks = advisorTasks.filter(task => 
      task.status !== 'completed' && new Date(task.due_date || '') < new Date()
    ).length;
    
    // Generate mock activity data (in real app, this would come from activity tracking)
    const dailyActivity = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        calls: Math.floor(Math.random() * 10) + 1,
        emails: Math.floor(Math.random() * 15) + 2,
        meetings: Math.floor(Math.random() * 3)
      };
    }).reverse();

    // Generate monthly conversions data
    const monthlyConversions = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
      return {
        month: monthName,
        conversions: Math.floor(Math.random() * 10) + 2,
        target: 8
      };
    }).reverse();

    // Pipeline distribution
    const pipelineDistribution = [
      { stage: 'Prospecto', count: coldLeads, value: coldLeads * 1000 },
      { stage: 'Interesado', count: hotLeads, value: hotLeads * 2500 },
      { stage: 'Negociación', count: Math.floor(hotLeads * 0.6), value: Math.floor(hotLeads * 0.6) * 5000 },
      { stage: 'Cliente', count: conversions, value: conversions * 10000 }
    ];

    // Calculate performance score (0-100)
    const conversionRate = advisorContacts.length > 0 ? (conversions / advisorContacts.length) * 100 : 0;
    const taskCompletionRate = advisorTasks.length > 0 ? (completedTasks / advisorTasks.length) * 100 : 0;
    const performanceScore = Math.round((conversionRate * 0.6) + (taskCompletionRate * 0.4));

    return {
      id: advisorId,
      name: advisor.user.full_name || 'Sin nombre',
      email: advisor.user.email || '',
      role: advisor.role,
      joinedAt: advisor.joined_at || new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      
      // Contact metrics
      totalContacts: advisorContacts.length,
      newContactsThisMonth: Math.floor(advisorContacts.length * 0.3), // Mock data
      activeProspects,
      coldLeads,
      hotLeads,
      conversions,
      conversionRate,
      
      // Activity metrics (mock data - would come from activity tracking)
      callsMade: dailyActivity.reduce((sum, day) => sum + day.calls, 0),
      emailsSent: dailyActivity.reduce((sum, day) => sum + day.emails, 0),
      meetingsScheduled: dailyActivity.reduce((sum, day) => sum + day.meetings, 0),
      followUpsCompleted: Math.floor(Math.random() * 20) + 5,
      
      // Task metrics
      tasksAssigned: advisorTasks.length,
      tasksCompleted: completedTasks,
      tasksOverdue: overdueTasks,
      taskCompletionRate,
      
      // Performance metrics
      monthlyGrowth: Math.floor(Math.random() * 30) - 10, // -10% to +20%
      quarterlyGrowth: Math.floor(Math.random() * 50) - 15, // -15% to +35%
      performanceScore,
      ranking: 1, // Would be calculated based on team comparison
      
      // Time-based data
      dailyActivity,
      monthlyConversions,
      pipelineDistribution
    };
  };

  // Load advisor metrics
  useEffect(() => {
    const loadMetrics = () => {
      try {
        setLoading(true);
        
        // Calculate metrics for all advisors
        const allMetrics = teamAdvisors.map(advisor => 
          calculateAdvisorMetrics(advisor.user_id)
        ).filter(Boolean) as AdvisorDetailedMetrics[];
        
        // Sort by performance score and assign rankings
        allMetrics.sort((a, b) => b.performanceScore - a.performanceScore);
        allMetrics.forEach((advisor, index) => {
          advisor.ranking = index + 1;
        });
        
        setAllAdvisors(allMetrics);
        
        // Set selected advisor metrics
        if (selectedAdvisor) {
          const metrics = allMetrics.find(m => m.id === selectedAdvisor);
          setAdvisorMetrics(metrics || null);
        } else if (allMetrics.length > 0) {
          setSelectedAdvisor(allMetrics[0].id);
          setAdvisorMetrics(allMetrics[0]);
        }
        
      } catch (error) {
        console.error('Error calculating advisor metrics:', error);
        toast.error('Error al calcular las métricas del asesor');
      } finally {
        setLoading(false);
      }
    };

    if (teamAdvisors.length > 0) {
      loadMetrics();
    }
  }, [teamAdvisors, contacts, tasks, selectedAdvisor]);

  const handleAdvisorSelect = (advisorId: string) => {
    setSelectedAdvisor(advisorId);
    const metrics = allAdvisors.find(m => m.id === advisorId);
    setAdvisorMetrics(metrics || null);
    onAdvisorSelect?.(advisorId);
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-cactus-800 bg-cactus-100';
    if (score >= 60) return 'text-oasis-800 bg-oasis-100';
    if (score >= 40) return 'text-sunlight-800 bg-sunlight-100';
    return 'text-error-800 bg-error-100';
  };

  const getRankingColor = (ranking: number) => {
    if (ranking === 1) return 'text-sunlight-800 bg-sunlight-100';
    if (ranking <= 3) return 'text-cactus-800 bg-cactus-100';
    if (ranking <= 5) return 'text-oasis-800 bg-oasis-100';
    return 'text-secondary bg-soft';
  };

  if (!canViewAllUsers && !canManageTeams) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <p className="text-secondary">No tienes permisos para ver las métricas de los asesores.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cactus-600"></div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Advisor Selector */}
      <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Seleccionar Asesor</h3>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as 'week' | 'month' | 'quarter')}
            className="px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
          >
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="quarter">Último trimestre</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allAdvisors.map((advisor) => (
            <div
              key={advisor.id}
              onClick={() => handleAdvisorSelect(advisor.id)}
              className={cn(
                "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                selectedAdvisor === advisor.id 
                  ? "border-cactus-500 bg-cactus-50" 
                  : "border-border-primary hover:border-border-secondary"
              )}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-soft flex items-center justify-center">
                  <User className="h-5 w-5 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{advisor.name}</p>
                  <p className="text-sm text-secondary">{advisor.role}</p>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                    getRankingColor(advisor.ranking)
                  )}>
                    #{advisor.ranking}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-primary">{advisor.conversions}</p>
                  <p className="text-xs text-secondary">Conversiones</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{advisor.conversionRate.toFixed(1)}%</p>
                  <p className="text-xs text-secondary">Tasa</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{advisor.performanceScore}</p>
                  <p className="text-xs text-secondary">Score</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Metrics for Selected Advisor */}
      {advisorMetrics && (
        <>
          {/* Advisor Header */}
          <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-soft flex items-center justify-center">
                  <User className="h-8 w-8 text-secondary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-primary">{advisorMetrics.name}</h2>
                  <p className="text-secondary">{advisorMetrics.email}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-cactus-100 text-cactus-800">
                      {advisorMetrics.role}
                    </span>
                    <span className={cn(
                      "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                      getRankingColor(advisorMetrics.ranking)
                    )}>
                      Ranking #{advisorMetrics.ranking}
                    </span>
                    <span className={cn(
                      "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                      getPerformanceColor(advisorMetrics.performanceScore)
                    )}>
                      Score: {advisorMetrics.performanceScore}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-secondary hover:text-primary">
                    <Mail className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-secondary hover:text-primary">
                    <Phone className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-secondary hover:text-primary">
                    <Edit className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary">Total Contactos</p>
                  <p className="text-2xl font-bold text-primary">{advisorMetrics.totalContacts}</p>
                  <p className="text-xs text-cactus-600">+{advisorMetrics.newContactsThisMonth} este mes</p>
                </div>
                <Phone className="h-8 w-8 text-oasis-600" />
              </div>
            </div>

            <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary">Conversiones</p>
                  <p className="text-2xl font-bold text-primary">{advisorMetrics.conversions}</p>
                  <p className="text-xs text-cactus-600">{advisorMetrics.conversionRate.toFixed(1)}% tasa</p>
                </div>
                <Target className="h-8 w-8 text-cactus-600" />
              </div>
            </div>

            <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary">Tareas Completadas</p>
                  <p className="text-2xl font-bold text-primary">{advisorMetrics.tasksCompleted}</p>
                  <p className="text-xs text-oasis-600">{advisorMetrics.taskCompletionRate.toFixed(1)}% completadas</p>
                </div>
                <CheckCircle className="h-8 w-8 text-sunlight-600" />
              </div>
            </div>

            <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary">Actividad</p>
                  <p className="text-2xl font-bold text-primary">{advisorMetrics.callsMade}</p>
                  <p className="text-xs text-sunlight-600">llamadas realizadas</p>
                </div>
                <Activity className="h-8 w-8 text-sunlight-600" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily Activity Chart */}
            <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Actividad Diaria (Últimos 30 días)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={advisorMetrics.dailyActivity.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(date) => new Date(date).getDate().toString()} />
                  <YAxis />
                  <Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
                  <Line type="monotone" dataKey="calls" stroke="#16a34a" name="Llamadas" />
                  <Line type="monotone" dataKey="emails" stroke="#2563eb" name="Emails" />
                  <Line type="monotone" dataKey="meetings" stroke="#dc2626" name="Reuniones" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pipeline Distribution */}
            <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Distribución del Pipeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={advisorMetrics.pipelineDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ stage, count }) => `${stage}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {advisorMetrics.pipelineDistribution.map((entry, index) => {
                      const COLORS = ['#3b82f6', '#16a34a', '#f59e0b', '#dc2626'];
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Performance */}
          <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Rendimiento Mensual</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={advisorMetrics.monthlyConversions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="conversions" fill="#16a34a" name="Conversiones" />
                <Bar dataKey="target" fill="#d1d5db" name="Objetivo" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Summary */}
          <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Resumen de Actividad</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <Phone className="h-8 w-8 text-cactus-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-primary">{advisorMetrics.callsMade}</p>
                <p className="text-sm text-secondary">Llamadas Realizadas</p>
              </div>
              
              <div className="text-center">
                <Mail className="h-8 w-8 text-oasis-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-primary">{advisorMetrics.emailsSent}</p>
                <p className="text-sm text-secondary">Emails Enviados</p>
              </div>
              
              <div className="text-center">
                <Calendar className="h-8 w-8 text-sunlight-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-primary">{advisorMetrics.meetingsScheduled}</p>
                <p className="text-sm text-secondary">Reuniones Programadas</p>
              </div>
              
              <div className="text-center">
                <Clock className="h-8 w-8 text-sunlight-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-primary">{advisorMetrics.followUpsCompleted}</p>
                <p className="text-sm text-secondary">Seguimientos Completados</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvisorMetrics;