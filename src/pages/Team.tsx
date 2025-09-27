import React, { useState } from 'react';
import { Users, UserPlus, UserCheck, UserX, Search, Filter, Mail, Phone, Calendar, MoreVertical, CheckCircle, XCircle, Clock, Settings, BarChart3, ClipboardList, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/utils/permissions';
import { useAuthStore } from '@/store/authStore';
import DebugAuth from '@/components/DebugAuth';


interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'advisor' | 'manager';
  status: 'active' | 'inactive' | 'pending';
  joinDate: string;
  assignedContacts: number;
  conversionsThisMonth: number;
  callsThisWeek: number;
  manager?: string;
}

interface PendingApproval {
  id: string;
  name: string;
  email: string;
  phone: string;
  requestDate: string;
  experience: string;
}

const Team: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'team' | 'approvals'>('team');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const { user } = useAuthStore();
  const { 
    canManageTeams: canManageTeam, 
    canViewMetrics, 
    canAccessSystemSettings: canManageSettings 
  } = usePermissions(user);

  // Mock data - esto se reemplazará con datos reales
  const teamMembers: TeamMember[] = [
    {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan.perez@empresa.com',
      phone: '+54 11 1234-5678',
      role: 'advisor',
      status: 'active',
      joinDate: '2023-06-15',
      assignedContacts: 45,
      conversionsThisMonth: 5,
      callsThisWeek: 28,
      manager: 'Carlos Manager'
    },
    {
      id: '2',
      name: 'María González',
      email: 'maria.gonzalez@empresa.com',
      phone: '+54 11 2345-6789',
      role: 'advisor',
      status: 'active',
      joinDate: '2023-08-20',
      assignedContacts: 38,
      conversionsThisMonth: 7,
      callsThisWeek: 32,
      manager: 'Carlos Manager'
    },
    {
      id: '3',
      name: 'Roberto Silva',
      email: 'roberto.silva@empresa.com',
      phone: '+54 11 3456-7890',
      role: 'advisor',
      status: 'inactive',
      joinDate: '2023-04-10',
      assignedContacts: 12,
      conversionsThisMonth: 1,
      callsThisWeek: 8,
      manager: 'Carlos Manager'
    }
  ];

  const pendingApprovals: PendingApproval[] = [
    {
      id: '1',
      name: 'Ana Martín',
      email: 'ana.martin@email.com',
      phone: '+54 11 4567-8901',
      requestDate: '2024-01-14',
      experience: '3 años en ventas de seguros'
    },
    {
      id: '2',
      name: 'Diego López',
      email: 'diego.lopez@email.com',
      phone: '+54 11 5678-9012',
      requestDate: '2024-01-12',
      experience: '5 años en atención al cliente'
    }
  ];

  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const StatusBadge: React.FC<{ status: 'active' | 'inactive' | 'pending' }> = ({ status }) => {
    const colors = {
      active: "bg-cactus-50 text-cactus-700",
      inactive: "bg-error-50 text-error-700",
      pending: "bg-sunlight-50 text-sunlight-700"
    };
    
    const labels = {
      active: 'Activo',
      inactive: 'Inactivo',
      pending: 'Pendiente'
    };

    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>
        {labels[status]}
      </span>
    );
  };

  const TeamMemberCard: React.FC<{ member: TeamMember }> = ({ member }) => (
    <div className="bg-primary rounded-lg shadow-md border border-border-primary p-4 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-cactus-600 rounded-full flex items-center justify-center">
            <Users className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-primary">{member.name}</h3>
            <p className="text-sm text-secondary capitalize">{member.role}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <StatusBadge status={member.status} />
          <button className="p-1 hover:bg-soft rounded">
            <MoreVertical className="text-muted" size={16} />
          </button>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-secondary">
          <Mail className="mr-2" size={14} />
          {member.email}
        </div>
        <div className="flex items-center text-sm text-secondary">
          <Phone className="mr-2" size={14} />
          {member.phone}
        </div>
        <div className="flex items-center text-sm text-secondary">
          <Calendar className="mr-2" size={14} />
          Desde: {new Date(member.joinDate).toLocaleDateString()}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-primary">{member.assignedContacts}</div>
          <div className="text-xs text-muted">Contactos</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-primary">{member.conversionsThisMonth}</div>
          <div className="text-xs text-muted">Conversiones</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-primary">{member.callsThisWeek}</div>
          <div className="text-xs text-muted">Llamadas</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-secondary">Manager: {member.manager}</span>
        <div className="flex items-center space-x-2">
          <Link 
                to={`/team/advisor/${member.id}`}
                className="p-2 hover:bg-soft rounded-lg transition-colors"
                title="Ver perfil"
              >
                <UserCheck className="text-cactus-600 hover:text-cactus-700" size={16} />
              </Link>
              {canManageTeam && (
                <button className="p-2 hover:bg-error-50 rounded-lg transition-colors" title="Desactivar">
                  <UserX className="text-error hover:text-error-700" size={16} />
                </button>
              )}
        </div>
      </div>
    </div>
  );

  const ApprovalCard: React.FC<{ approval: PendingApproval }> = ({ approval }) => (
    <div className="bg-secondary rounded-lg shadow-md border border-sunlight-200 p-4 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-sunlight-500 rounded-full flex items-center justify-center">
            <Clock className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-primary">{approval.name}</h3>
            <p className="text-sm text-secondary">Solicitud de asesor</p>
          </div>
        </div>
        <span className="text-xs text-sunlight-600">
          {new Date(approval.requestDate).toLocaleDateString()}
        </span>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-secondary">
          <Mail className="mr-2" size={14} />
          {approval.email}
        </div>
        <div className="flex items-center text-sm text-secondary">
          <Phone className="mr-2" size={14} />
          {approval.phone}
        </div>

        <div className="text-sm text-secondary">
          <strong>Experiencia:</strong> {approval.experience}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button className="flex-1 bg-cactus-600 text-white px-3 py-2 rounded-lg hover:bg-cactus-700 transition-colors flex items-center justify-center space-x-1">
          <CheckCircle size={16} />
          <span>Aprobar</span>
        </button>
        <button className="flex-1 bg-error text-white px-3 py-2 rounded-lg hover:bg-error-700 transition-colors flex items-center justify-center space-x-1">
          <XCircle size={16} />
          <span>Rechazar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <DebugAuth />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center">
            <span className="mr-3">🌵</span>
            Mi Equipo
          </h1>
          <p className="text-secondary mt-1">
            Gestiona tu equipo de asesores y aprobaciones pendientes
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {canManageTeam && (
            <Link 
              to="/team/invitations"
              className="bg-cactus-600 text-white px-4 py-2 rounded-lg hover:bg-cactus-700 transition-colors flex items-center space-x-2"
            >
              <UserPlus size={20} />
              <span>Invitar Asesor</span>
            </Link>
          )}
        </div>
      </div>

      {/* Quick Actions - Solo para managers */}
      {canManageTeam && (
        <div className="bg-primary rounded-xl shadow-lg border border-border-primary p-6">
          <h2 className="text-lg font-semibold text-primary mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              to="/team/tasks"
              className="flex flex-col items-center p-4 bg-oasis-50 rounded-lg hover:bg-oasis-100 transition-colors group"
            >
              <ClipboardList className="text-oasis-600 group-hover:text-oasis-700 mb-2" size={24} />
              <span className="text-sm font-medium text-oasis-700">Gestionar Tareas</span>
            </Link>
            
            <Link 
              to="/team/invitations"
              className="flex flex-col items-center p-4 bg-terracotta-50 rounded-lg hover:bg-terracotta-100 transition-colors group"
            >
              <Send className="text-terracotta-600 group-hover:text-terracotta-700 mb-2" size={24} />
              <span className="text-sm font-medium text-terracotta-700">Invitaciones</span>
            </Link>
            
            {canViewMetrics && (
              <Link 
                to="/team/metrics"
                className="flex flex-col items-center p-4 bg-cactus-50 rounded-lg hover:bg-cactus-100 transition-colors group"
              >
                <BarChart3 className="text-cactus-600 group-hover:text-cactus-700 mb-2" size={24} />
                <span className="text-sm font-medium text-cactus-700">Métricas</span>
              </Link>
            )}
            
            {canManageSettings && (
              <Link 
                to="/team/settings"
                className="flex flex-col items-center p-4 bg-sunlight-50 rounded-lg hover:bg-sunlight-100 transition-colors group"
              >
                <Settings className="text-sunlight-600 group-hover:text-sunlight-700 mb-2" size={24} />
                <span className="text-sm font-medium text-sunlight-700">Configuración</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-primary rounded-xl shadow-lg border border-border-primary">
        <div className="flex border-b border-border-primary">
          <button
            onClick={() => setActiveTab('team')}
            className={cn(
              "flex-1 px-6 py-4 text-center font-medium transition-colors",
              activeTab === 'team'
                ? "text-primary border-b-2 border-cactus-600 bg-soft"
                : "text-muted hover:text-primary hover:bg-soft"
            )}
          >
            <div className="flex items-center justify-center space-x-2">
              <Users size={20} />
              <span>Equipo ({teamMembers.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={cn(
              "flex-1 px-6 py-4 text-center font-medium transition-colors relative",
              activeTab === 'approvals'
                ? "text-primary border-b-2 border-cactus-600 bg-soft"
                : "text-muted hover:text-primary hover:bg-soft"
            )}
          >
            <div className="flex items-center justify-center space-x-2">
              <Clock size={20} />
              <span>Aprobaciones</span>
              {pendingApprovals.length > 0 && (
                <span className="bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingApprovals.length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Contenido de las tabs */}
        <div className="p-6">
          {activeTab === 'team' ? (
            <div className="space-y-6">
              {/* Filtros y búsqueda */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="text-muted" size={20} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                    <option value="pending">Pendientes</option>
                  </select>
                </div>
              </div>

              {/* Estadísticas del equipo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-cactus-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-cactus-700">{teamMembers.filter(m => m.status === 'active').length}</div>
                  <div className="text-sm text-cactus-600">Asesores Activos</div>
                </div>
                <div className="bg-oasis-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-oasis-700">{teamMembers.reduce((sum, m) => sum + m.assignedContacts, 0)}</div>
                  <div className="text-sm text-oasis-600">Contactos Asignados</div>
                </div>
                <div className="bg-terracotta-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-terracotta-700">{teamMembers.reduce((sum, m) => sum + m.conversionsThisMonth, 0)}</div>
                  <div className="text-sm text-terracotta-600">Conversiones Mensuales</div>
                </div>
                <div className="bg-sunlight-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-sunlight-700">{teamMembers.reduce((sum, m) => sum + m.callsThisWeek, 0)}</div>
                  <div className="text-sm text-sunlight-600">Llamadas esta Semana</div>
                </div>
              </div>

              {/* Lista de miembros del equipo */}
              <div className="bg-primary rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTeamMembers.map(member => (
                    <TeamMemberCard key={member.id} member={member} />
                  ))}
                </div>
              </div>

              {filteredTeamMembers.length === 0 && (
                <div className="bg-primary rounded-lg p-12 text-center">
                  <Users className="mx-auto mb-4 text-muted" size={48} />
                  <h3 className="text-lg font-medium mb-2 text-primary">No se encontraron miembros</h3>
                  <p className="text-secondary">No hay miembros que coincidan con los filtros seleccionados.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-primary mb-2">Solicitudes de Aprobación</h2>
                <p className="text-secondary">Revisa y aprueba las solicitudes de nuevos asesores</p>
              </div>

              {pendingApprovals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingApprovals.map(approval => (
                    <ApprovalCard key={approval.id} approval={approval} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-semibold text-primary mb-2">No hay solicitudes pendientes</h3>
                  <p className="text-secondary">Todas las solicitudes han sido procesadas.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <DebugAuth />
    </div>
  );
};

export default Team;