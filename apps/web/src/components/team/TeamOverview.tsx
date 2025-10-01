import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, Target, Clock, CheckCircle, Calendar, User, Zap, AlertCircle, Plus, Check, BarChart3, UserCheck, Phone, Mail, Settings, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCRMStore } from '../../store/crmStore';
import { useMetricsStore } from '../../store/metricsStore';
import { useTeamStore } from '../../store/teamStore';
import { usePermissions } from '../../utils/permissions';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
// Removed LayoutConfig import - using semantic Tailwind classes

interface TeamMemberSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  joinedAt: string;
  lastActivity: string;
  totalContacts: number;
  activeProspects: number;
  conversions: number;
  conversionRate: number;
  tasksCompleted: number;
  tasksTotal: number;
  performance: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  averagePerformance: number;
  topPerformer: string;
  totalTeamContacts: number;
  totalTeamConversions: number;
  teamConversionRate: number;
}

interface TeamOverviewProps {
  className?: string;
}

const TeamOverview: React.FC<TeamOverviewProps> = ({ className }) => {
  const { user } = useAuthStore();
  const { contacts } = useCRMStore();
  const { currentMetrics } = useMetricsStore();
  const { teamMembers, fetchTeamMembers, updateTeamMember, removeTeamMember } = useTeamStore();
  const { canManageTeams, canManageUsers, canDeleteUsers } = usePermissions();
  
  const [teamSummary, setTeamSummary] = useState<TeamMemberSummary[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);

  // Load team data
  useEffect(() => {
    const loadTeamData = async () => {
      if (!user?.team_id) return;
      
      try {
        setLoading(true);
        await fetchTeamMembers(user.team_id);
      } catch (error) {
        console.error('Error loading team data:', error);
        toast.error('Error al cargar los datos del equipo');
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [user?.team_id, fetchTeamMembers]);

  // Calculate team summary and stats
  useEffect(() => {
    if (teamMembers.length > 0) {
      const summary: TeamMemberSummary[] = teamMembers.map(member => {
        const memberContacts = contacts.filter(c => c.assignedTo === member.user?.id);
        const conversions = memberContacts.filter(c => c.status === 'Cliente').length;
        const activeProspects = memberContacts.filter(c => 
          c.status !== 'Cliente' && c.status !== 'Cuenta Vacia'
        ).length;
        
        const conversionRate = memberContacts.length > 0 ? (conversions / memberContacts.length) * 100 : 0;
        
        // Determine performance level
        let performance: 'excellent' | 'good' | 'average' | 'needs_improvement' = 'average';
        if (conversionRate >= 80) performance = 'excellent';
        else if (conversionRate >= 60) performance = 'good';
        else if (conversionRate >= 40) performance = 'average';
        else performance = 'needs_improvement';
        
        return {
          id: member.user_id,
          name: member.user?.full_name || 'Sin nombre',
          email: member.user?.email || '',
          role: member.role,
          status: member.status as 'active' | 'inactive' | 'pending',
          joinedAt: member.joined_at || new Date().toISOString(),
          lastActivity: new Date().toISOString(), // This would come from activity tracking
          totalContacts: memberContacts.length,
          activeProspects,
          conversions,
          conversionRate,
          tasksCompleted: 0, // This would come from tasks system
          tasksTotal: 0,
          performance
        };
      });
      
      setTeamSummary(summary);
      
      // Calculate team stats
      const activeMembers = summary.filter(m => m.status === 'active');
      const pendingMembers = summary.filter(m => m.status === 'pending');
      const totalContacts = summary.reduce((sum, m) => sum + m.totalContacts, 0);
      const totalConversions = summary.reduce((sum, m) => sum + m.conversions, 0);
      const averagePerformance = summary.length > 0 
        ? summary.reduce((sum, m) => sum + m.conversionRate, 0) / summary.length 
        : 0;
      
      const topPerformer = summary.reduce((top, current) => 
        current.conversionRate > top.conversionRate ? current : top
      , summary[0]);
      
      const stats: TeamStats = {
        totalMembers: summary.length,
        activeMembers: activeMembers.length,
        pendingMembers: pendingMembers.length,
        averagePerformance,
        topPerformer: topPerformer?.name || 'N/A',
        totalTeamContacts: totalContacts,
        totalTeamConversions: totalConversions,
        teamConversionRate: totalContacts > 0 ? (totalConversions / totalContacts) * 100 : 0
      };
      
      setTeamStats(stats);
    }
  }, [teamMembers, contacts]);

  const handleUpdateMemberStatus = async (memberId: string, newStatus: 'active' | 'inactive' | 'pending') => {
    try {
      await updateTeamMember(memberId, { status: newStatus });
      toast.success('Estado del miembro actualizado');
    } catch (error) {
      console.error('Error updating member status:', error);
      toast.error('Error al actualizar el estado del miembro');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('¿Estás seguro de que quieres remover este miembro del equipo?')) return;
    
    try {
      await removeTeamMember(memberId);
      toast.success('Miembro removido del equipo');
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Error al remover el miembro del equipo');
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent': return 'text-cactus-800 bg-cactus-100';
      case 'good': return 'text-sunlight-800 bg-sunlight-100';
      case 'average': return 'text-warning-600 bg-warning-100';
      case 'needs_improvement': return 'text-error-600 bg-error-100';
      default: return 'text-neutral-600 bg-neutral-100';
    }
  };

  const getPerformanceLabel = (performance: string) => {
    switch (performance) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Bueno';
      case 'average': return 'Promedio';
      case 'needs_improvement': return 'Necesita Mejora';
      default: return 'Sin Datos';
    }
  };

  if (!canManageTeams) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-error-500 mx-auto mb-4" />
        <p className="text-neutral-600">No tienes permisos para ver la información del equipo.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-success-600"></div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Team Stats Cards */}
      {teamStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Total Miembros</p>
                <p className="text-2xl font-bold text-primary">{teamStats.totalMembers}</p>
                <p className="text-xs text-cactus-600">{teamStats.activeMembers} activos</p>
              </div>
              <Users className="h-8 w-8 text-cactus-600" />
            </div>
          </div>

          <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Rendimiento Promedio</p>
                <p className="text-2xl font-bold text-primary">{teamStats.averagePerformance.toFixed(1)}%</p>
                <p className="text-xs text-oasis-600">Tasa de conversión</p>
              </div>
              <TrendingUp className="h-8 w-8 text-cactus-600" />
            </div>
          </div>

          <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Mejor Performer</p>
                <p className="text-lg font-bold text-primary truncate">{teamStats.topPerformer}</p>
                <p className="text-xs text-terracotta-600">Líder del equipo</p>
              </div>
              <Target className="h-8 w-8 text-terracotta-600" />
            </div>
          </div>

          <div className="bg-primary rounded-lg shadow-sm border border-border-primary p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Contactos del Equipo</p>
                <p className="text-2xl font-bold text-primary">{teamStats.totalTeamContacts}</p>
                <p className="text-xs text-cactus-600">{teamStats.totalTeamConversions} conversiones</p>
              </div>
              <Phone className="h-8 w-8 text-cactus-600" />
            </div>
          </div>
        </div>
      )}

      {/* Team Members Table */}
      <div className="bg-primary rounded-lg shadow-sm border border-border-primary">
        <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">Miembros del Equipo</h3>
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Miembro</span>
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-primary">
            <thead className="bg-soft">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Miembro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Contactos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Conversiones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Rendimiento
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
              {teamSummary.map((member) => (
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
                          <div className="text-sm text-secondary">{member.email}</div>
                        </div>
                      </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-cactus-100 text-cactus-800">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-primary">{member.totalContacts}</div>
                    <div className="text-sm text-secondary">{member.activeProspects} activos</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-primary">{member.conversions}</div>
                    <div className="text-sm text-secondary">{member.conversionRate.toFixed(1)}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                      getPerformanceColor(member.performance)
                    )}>
                      {getPerformanceLabel(member.performance)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={member.status}
                      onChange={(e) => handleUpdateMemberStatus(member.id, e.target.value as 'active' | 'inactive' | 'pending')}
                      disabled={!canManageUsers}
                      className="text-sm border border-border-primary rounded px-2 py-1 focus:ring-2 focus:ring-cactus-500 focus:border-transparent disabled:bg-soft"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="pending">Pendiente</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        className="text-cactus-600 hover:text-cactus-900"
                        onClick={() => setSelectedMember(member.id)}
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button className="text-cactus-600 hover:text-cactus-900">
                        <Mail className="h-4 w-4" />
                      </button>
                      {canDeleteUsers && (
                        <button 
                          className="text-error-600 hover:text-error-900"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Resumen de Rendimiento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['excellent', 'good', 'average', 'needs_improvement'].map(level => {
            const count = teamSummary.filter(m => m.performance === level).length;
            const percentage = teamSummary.length > 0 ? (count / teamSummary.length) * 100 : 0;
            
            return (
              <div key={level} className="text-center">
                <div className={cn(
                  "inline-flex px-3 py-1 text-sm font-semibold rounded-full mb-2",
                  getPerformanceColor(level)
                )}>
                  {getPerformanceLabel(level)}
                </div>
                <div className="text-2xl font-bold text-neutral-900">{count}</div>
                <div className="text-sm text-neutral-500">{percentage.toFixed(0)}% del equipo</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeamOverview;