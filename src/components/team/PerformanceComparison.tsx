import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, TrendingDown, Award, Target, Users, Activity, Calendar, Phone, Mail, CheckCircle, AlertTriangle, Download, Filter, Eye } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCRMStore } from '../../store/crmStore';
import { useMetricsStore } from '../../store/metricsStore';
import { useTeamStore } from '../../store/teamStore';
import { useTasksStore } from '../../store/tasksStore';
import { usePermissions } from '../../utils/permissions';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface AdvisorComparison {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  
  // Core metrics
  totalContacts: number;
  conversions: number;
  conversionRate: number;
  tasksCompleted: number;
  taskCompletionRate: number;
  
  // Activity metrics
  callsMade: number;
  emailsSent: number;
  meetingsScheduled: number;
  
  // Performance scores
  performanceScore: number;
  ranking: number;
  monthlyGrowth: number;
  quarterlyGrowth: number;
  
  // Efficiency metrics
  avgResponseTime: number; // hours
  customerSatisfaction: number; // 1-5 scale
  followUpRate: number; // percentage
  
  // Time-based performance
  weeklyPerformance: Array<{ week: string; score: number }>;
  monthlyTrends: Array<{ month: string; conversions: number; contacts: number }>;
}

interface PerformanceComparisonProps {
  className?: string;
  selectedAdvisors?: string[];
  onAdvisorToggle?: (advisorId: string) => void;
}

const PerformanceComparison: React.FC<PerformanceComparisonProps> = ({ 
  className, 
  selectedAdvisors = [], 
  onAdvisorToggle 
}) => {
  const { user } = useAuthStore();
  const { contacts } = useCRMStore();
  const { currentMetrics } = useMetricsStore();
  const { teamMembers, getTeamAdvisors } = useTeamStore();
  const { tasks } = useTasksStore();
  const { canViewAllUsers, canManageTeams } = usePermissions();
  
  const [advisorData, setAdvisorData] = useState<AdvisorComparison[]>([]);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>(selectedAdvisors);
  const [loading, setLoading] = useState(true);
  const [comparisonMetric, setComparisonMetric] = useState<'conversions' | 'conversionRate' | 'performanceScore' | 'taskCompletion'>('performanceScore');
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('month');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'radar' | 'scatter'>('bar');

  // Get team advisors
  const teamAdvisors = getTeamAdvisors(user?.team_id || '');

  // Calculate comparison data for advisors
  const calculateAdvisorComparison = (advisorId: string): AdvisorComparison | null => {
    const advisor = teamMembers.find(m => m.user_id === advisorId);
    if (!advisor || !advisor.user) return null;

    const advisorContacts = contacts.filter(c => c.assignedTo === advisor.user?.full_name);
    const advisorTasks = tasks.filter(task => 
      task.assignments?.some(assignment => assignment.assigned_to === advisorId)
    );

    // Core metrics
    const conversions = advisorContacts.filter(c => c.status === 'Cliente').length;
    const conversionRate = advisorContacts.length > 0 ? (conversions / advisorContacts.length) * 100 : 0;
    const completedTasks = advisorTasks.filter(task => task.status === 'completed').length;
    const taskCompletionRate = advisorTasks.length > 0 ? (completedTasks / advisorTasks.length) * 100 : 0;
    
    // Generate mock activity data
    const callsMade = Math.floor(Math.random() * 100) + 20;
    const emailsSent = Math.floor(Math.random() * 150) + 30;
    const meetingsScheduled = Math.floor(Math.random() * 20) + 5;
    
    // Performance score calculation
    const performanceScore = Math.round(
      (conversionRate * 0.4) + 
      (taskCompletionRate * 0.3) + 
      (Math.min(callsMade / 50, 1) * 20) + 
      (Math.min(emailsSent / 100, 1) * 10)
    );
    
    // Generate weekly performance data
    const weeklyPerformance = Array.from({ length: 12 }, (_, i) => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      return {
        week: `S${12 - i}`,
        score: Math.max(20, performanceScore + (Math.random() * 20 - 10))
      };
    });
    
    // Generate monthly trends
    const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
      return {
        month: monthName,
        conversions: Math.max(0, conversions + (Math.random() * 10 - 5)),
        contacts: Math.max(0, advisorContacts.length + (Math.random() * 20 - 10))
      };
    }).reverse();

    return {
      id: advisorId,
      name: advisor.user.full_name || 'Sin nombre',
      role: advisor.role,
      
      // Core metrics
      totalContacts: advisorContacts.length,
      conversions,
      conversionRate,
      tasksCompleted: completedTasks,
      taskCompletionRate,
      
      // Activity metrics
      callsMade,
      emailsSent,
      meetingsScheduled,
      
      // Performance scores
      performanceScore,
      ranking: 1, // Will be calculated after sorting
      monthlyGrowth: Math.floor(Math.random() * 30) - 10,
      quarterlyGrowth: Math.floor(Math.random() * 50) - 15,
      
      // Efficiency metrics
      avgResponseTime: Math.random() * 24 + 1, // 1-25 hours
      customerSatisfaction: Math.random() * 2 + 3, // 3-5 scale
      followUpRate: Math.random() * 40 + 60, // 60-100%
      
      // Time-based data
      weeklyPerformance,
      monthlyTrends
    };
  };

  // Load advisor data
  useEffect(() => {
    const loadData = () => {
      try {
        setLoading(true);
        
        const allData = teamAdvisors.map(advisor => 
          calculateAdvisorComparison(advisor.user_id)
        ).filter(Boolean) as AdvisorComparison[];
        
        // Sort by performance score and assign rankings
        allData.sort((a, b) => b.performanceScore - a.performanceScore);
        allData.forEach((advisor, index) => {
          advisor.ranking = index + 1;
        });
        
        setAdvisorData(allData);
        
        // Auto-select top 3 performers if no selection
        if (selectedForComparison.length === 0 && allData.length > 0) {
          setSelectedForComparison(allData.slice(0, Math.min(3, allData.length)).map(a => a.id));
        }
        
      } catch (error) {
        console.error('Error loading advisor comparison data:', error);
        toast.error('Error al cargar los datos de comparación');
      } finally {
        setLoading(false);
      }
    };

    if (teamAdvisors.length > 0) {
      loadData();
    }
  }, [teamAdvisors, contacts, tasks]);

  const handleAdvisorToggle = (advisorId: string) => {
    const newSelection = selectedForComparison.includes(advisorId)
      ? selectedForComparison.filter(id => id !== advisorId)
      : [...selectedForComparison, advisorId];
    
    setSelectedForComparison(newSelection);
    onAdvisorToggle?.(advisorId);
  };

  const getSelectedData = () => {
    return advisorData.filter(advisor => selectedForComparison.includes(advisor.id));
  };

  const getMetricValue = (advisor: AdvisorComparison, metric: string) => {
    switch (metric) {
      case 'conversions': return advisor.conversions;
      case 'conversionRate': return advisor.conversionRate;
      case 'performanceScore': return advisor.performanceScore;
      case 'taskCompletion': return advisor.taskCompletionRate;
      default: return advisor.performanceScore;
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'conversions': return 'Conversiones';
      case 'conversionRate': return 'Tasa de Conversión (%)';
      case 'performanceScore': return 'Puntuación de Rendimiento';
      case 'taskCompletion': return 'Completación de Tareas (%)';
      default: return 'Puntuación';
    }
  };

  const getRankingColor = (ranking: number) => {
    if (ranking === 1) return 'text-yellow-600 bg-yellow-100';
    if (ranking <= 3) return 'text-green-600 bg-green-100';
    if (ranking <= 5) return 'text-blue-600 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Prepare radar chart data
  const radarData = getSelectedData().map(advisor => ({
    name: advisor.name.split(' ')[0], // First name only
    conversiones: advisor.conversions,
    'tasa-conversion': advisor.conversionRate,
    'tareas-completadas': advisor.taskCompletionRate,
    llamadas: Math.min(advisor.callsMade / 2, 50), // Normalize to 0-50
    emails: Math.min(advisor.emailsSent / 3, 50), // Normalize to 0-50
    satisfaccion: advisor.customerSatisfaction * 20 // Scale to 0-100
  }));

  if (!canViewAllUsers && !canManageTeams) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-secondary">No tienes permisos para ver la comparación de rendimiento.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cactus-500"></div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">Comparación de Rendimiento</h3>
            <span className="text-sm text-gray-500">
              {selectedForComparison.length} de {advisorData.length} asesores seleccionados
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={comparisonMetric}
              onChange={(e) => setComparisonMetric(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="performanceScore">Puntuación General</option>
              <option value="conversions">Conversiones</option>
              <option value="conversionRate">Tasa de Conversión</option>
              <option value="taskCompletion">Completación de Tareas</option>
            </select>
            
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="bar">Barras</option>
              <option value="line">Líneas</option>
              <option value="radar">Radar</option>
              <option value="scatter">Dispersión</option>
            </select>
            
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Advisor Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h4 className="text-md font-medium text-gray-900 mb-4">Seleccionar Asesores para Comparar</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {advisorData.map((advisor) => (
            <div
              key={advisor.id}
              onClick={() => handleAdvisorToggle(advisor.id)}
              className={cn(
                "p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                selectedForComparison.includes(advisor.id)
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{advisor.name}</p>
                  <p className="text-xs text-gray-500">{advisor.role}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                    getRankingColor(advisor.ranking)
                  )}>
                    #{advisor.ranking}
                  </span>
                </div>
              </div>
              
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-gray-600">Score: {advisor.performanceScore}</span>
                <span className={getPerformanceColor(advisor.performanceScore)}>
                  {advisor.conversions} conv.
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Charts */}
      {selectedForComparison.length > 0 && (
        <>
          {/* Main Comparison Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Comparación: {getMetricLabel(comparisonMetric)}
            </h4>
            
            <ResponsiveContainer width="100%" height={400}>
              {chartType === 'bar' ? (
                <BarChart data={getSelectedData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey={(data) => getMetricValue(data, comparisonMetric)} 
                    fill="#10B981" 
                    name={getMetricLabel(comparisonMetric)}
                  />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={getSelectedData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey={(data) => getMetricValue(data, comparisonMetric)} 
                    stroke="#10B981" 
                    strokeWidth={3}
                    name={getMetricLabel(comparisonMetric)}
                  />
                </LineChart>
              ) : chartType === 'radar' && radarData.length > 0 ? (
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Conversiones" dataKey="conversiones" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
                  <Radar name="Tasa Conv." dataKey="tasa-conversion" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} />
                  <Radar name="Tareas" dataKey="tareas-completadas" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              ) : chartType === 'scatter' ? (
                <ScatterChart data={getSelectedData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="conversionRate" name="Tasa de Conversión" />
                  <YAxis dataKey="performanceScore" name="Puntuación" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Asesores" data={getSelectedData()} fill="#10B981" />
                </ScatterChart>
              ) : null}
            </ResponsiveContainer>
          </div>

          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Trends */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Tendencias Semanales</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {getSelectedData().map((advisor, index) => {
                    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
                    return (
                      <Line
                        key={advisor.id}
                        type="monotone"
                        data={advisor.weeklyPerformance}
                        dataKey="score"
                        stroke={colors[index % colors.length]}
                        name={advisor.name.split(' ')[0]}
                        strokeWidth={2}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Activity Comparison */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Comparación de Actividad</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getSelectedData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="callsMade" fill="#10B981" name="Llamadas" />
                  <Bar dataKey="emailsSent" fill="#3B82F6" name="Emails" />
                  <Bar dataKey="meetingsScheduled" fill="#8B5CF6" name="Reuniones" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Comparison Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Comparación Detallada</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asesor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ranking</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversiones</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasa Conv.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tareas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actividad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crecimiento</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSelectedData().map((advisor) => (
                    <tr key={advisor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {advisor.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{advisor.name}</div>
                            <div className="text-sm text-gray-500">{advisor.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                          getRankingColor(advisor.ranking)
                        )}>
                          #{advisor.ranking}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {advisor.performanceScore}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {advisor.conversions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {advisor.conversionRate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {advisor.tasksCompleted}/{advisor.tasksCompleted + Math.floor(Math.random() * 5)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3 w-3 text-green-600" />
                          <span>{advisor.callsMade}</span>
                          <Mail className="h-3 w-3 text-blue-600" />
                          <span>{advisor.emailsSent}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className={cn(
                          "flex items-center",
                          advisor.monthlyGrowth >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {advisor.monthlyGrowth >= 0 ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          )}
                          {Math.abs(advisor.monthlyGrowth)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedForComparison.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona asesores para comparar</h3>
          <p className="text-gray-600">Elige al menos un asesor para ver la comparación de rendimiento.</p>
        </div>
      )}
    </div>
  );
};

export default PerformanceComparison;