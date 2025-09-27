import React, { useState, useEffect } from 'react';
import { Users, UserPlus, CheckCircle, XCircle, Mail, Phone, Calendar, Target, TrendingUp, Award } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Advisor {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'pending' | 'inactive';
  joinDate: string;
  contactsAssigned: number;
  conversionsThisMonth: number;
  callsThisWeek: number;
  performance: number; // 0-100
}

interface PendingApproval {
  id: string;
  name: string;
  email: string;
  requestDate: string;
  type: 'new_advisor' | 'contact_assignment';
  details: string;
}

const TeamManagement: React.FC = () => {
  const { user } = useAuthStore();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [showAddAdvisor, setShowAddAdvisor] = useState(false);
  const [newAdvisor, setNewAdvisor] = useState({ name: '', email: '', phone: '' });
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('');
  const [contactsToAssign, setContactsToAssign] = useState<number>(0);

  // Mock data initialization
  useEffect(() => {
    const mockAdvisors: Advisor[] = [
      {
        id: '1',
        name: 'Ana García',
        email: 'ana.garcia@company.com',
        phone: '+34 600 123 456',
        status: 'active',
        joinDate: '2024-01-15',
        contactsAssigned: 45,
        conversionsThisMonth: 8,
        callsThisWeek: 23,
        performance: 85
      },
      {
        id: '2',
        name: 'Carlos Ruiz',
        email: 'carlos.ruiz@company.com',
        phone: '+34 600 789 012',
        status: 'active',
        joinDate: '2024-02-20',
        contactsAssigned: 38,
        conversionsThisMonth: 6,
        callsThisWeek: 19,
        performance: 78
      },
      {
        id: '3',
        name: 'María López',
        email: 'maria.lopez@company.com',
        phone: '+34 600 345 678',
        status: 'pending',
        joinDate: '2024-03-10',
        contactsAssigned: 0,
        conversionsThisMonth: 0,
        callsThisWeek: 0,
        performance: 0
      }
    ];

    const mockPendingApprovals: PendingApproval[] = [
      {
        id: '1',
        name: 'Pedro Martínez',
        email: 'pedro.martinez@company.com',
        requestDate: '2024-03-15',
        type: 'new_advisor',
        details: 'Solicitud de nuevo asesor con experiencia en seguros'
      },
      {
        id: '2',
        name: 'Ana García',
        email: 'ana.garcia@company.com',
        requestDate: '2024-03-14',
        type: 'contact_assignment',
        details: 'Solicita asignación de 10 contactos adicionales'
      }
    ];

    setAdvisors(mockAdvisors);
    setPendingApprovals(mockPendingApprovals);
  }, []);

  const handleApproveRequest = (id: string) => {
    setPendingApprovals(prev => prev.filter(approval => approval.id !== id));
    // Aquí se implementaría la lógica real de aprobación
  };

  const handleRejectRequest = (id: string) => {
    setPendingApprovals(prev => prev.filter(approval => approval.id !== id));
    // Aquí se implementaría la lógica real de rechazo
  };

  const handleAddAdvisor = () => {
    if (newAdvisor.name && newAdvisor.email) {
      const advisor: Advisor = {
        id: Date.now().toString(),
        name: newAdvisor.name,
        email: newAdvisor.email,
        phone: newAdvisor.phone,
        status: 'pending',
        joinDate: new Date().toISOString().split('T')[0],
        contactsAssigned: 0,
        conversionsThisMonth: 0,
        callsThisWeek: 0,
        performance: 0
      };
      setAdvisors(prev => [...prev, advisor]);
      setNewAdvisor({ name: '', email: '', phone: '' });
      setShowAddAdvisor(false);
    }
  };

  const handleAssignContacts = () => {
    if (selectedAdvisor && contactsToAssign > 0) {
      setAdvisors(prev => prev.map(advisor => 
        advisor.id === selectedAdvisor 
          ? { ...advisor, contactsAssigned: advisor.contactsAssigned + contactsToAssign }
          : advisor
      ));
      setSelectedAdvisor('');
      setContactsToAssign(0);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-cactus-50 text-cactus-700 border border-cactus-200';
      case 'pending':
        return 'bg-sunlight-50 text-sunlight-700 border border-sunlight-200';
      case 'inactive':
        return 'bg-error-50 text-error-700 border border-error-200';
      default:
        return 'bg-neutral-50 text-neutral-700 border border-neutral-200';
    }
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 80) return 'text-cactus-600';
    if (performance >= 60) return 'text-sunlight-600';
    return 'text-error-600';
  };

  // Verificar que el usuario sea Manager
  if (user?.role !== 'manager') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-primary rounded-xl shadow-lg p-8 text-center">
          <XCircle className="mx-auto mb-4 text-error" size={48} />
          <h2 className="text-xl font-semibold text-primary mb-2">Acceso Restringido</h2>
          <p className="text-secondary">Solo los Managers pueden acceder a la gestión de equipo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-primary rounded-xl shadow-lg p-6 border border-border-primary">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center">
                <Users className="mr-3" size={28} />
                Gestión de Equipo
              </h1>
              <p className="text-secondary mt-1">Administra tu equipo de asesores y aprobaciones</p>
            </div>
            <button
              onClick={() => setShowAddAdvisor(true)}
              className="bg-cactus-600 hover:bg-cactus-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
            >
              <UserPlus className="mr-2" size={20} />
              Agregar Asesor
            </button>
          </div>
        </div>

        {/* Estadísticas del equipo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-primary rounded-xl shadow-lg p-6 border border-border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Total Asesores</p>
                <p className="text-2xl font-bold text-primary">{advisors.length}</p>
              </div>
              <Users className="text-primary" size={24} />
            </div>
          </div>
          <div className="bg-primary rounded-xl shadow-lg p-6 border border-border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Asesores Activos</p>
                <p className="text-2xl font-bold text-primary">
                  {advisors.filter(a => a.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="text-primary" size={24} />
            </div>
          </div>
          <div className="bg-primary rounded-xl shadow-lg p-6 border border-border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Ventas Cerradas</p>
                <p className="text-2xl font-bold text-primary">
                  {advisors.reduce((sum, a) => sum + a.conversionsThisMonth, 0)}
                </p>
              </div>
              <Target className="text-primary" size={24} />
            </div>
          </div>
          <div className="bg-primary rounded-xl shadow-lg p-6 border border-border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">Rendimiento Promedio</p>
                <p className="text-2xl font-bold text-primary">
                  {Math.round(advisors.reduce((sum, a) => sum + a.performance, 0) / advisors.length || 0)}%
                </p>
              </div>
              <TrendingUp className="text-primary" size={24} />
            </div>
          </div>
        </div>

        {/* Solicitudes pendientes */}
        {pendingApprovals.length > 0 && (
          <div className="bg-primary rounded-xl shadow-lg p-6 border border-border-primary">
            <h2 className="text-lg font-semibold text-primary mb-4 flex items-center">
              <Award className="mr-2" size={20} />
              Solicitudes Pendientes de Aprobación ({pendingApprovals.length})
            </h2>
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="border border-border-secondary rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-primary">{approval.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          approval.type === 'new_advisor' ? 'bg-cactus-50 text-cactus-700 border border-cactus-200' : 'bg-sunlight-50 text-sunlight-700 border border-sunlight-200'
                        }`}>
                          {approval.type === 'new_advisor' ? 'Nuevo Asesor' : 'Asignación de Contactos'}
                        </span>
                      </div>
                      <p className="text-sm text-secondary mt-1">{approval.email}</p>
                      <p className="text-sm text-muted mt-2">{approval.details}</p>
                      <p className="text-xs text-muted mt-1">Solicitado: {approval.requestDate}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApproveRequest(approval.id)}
                        className="bg-cactus-600 hover:bg-cactus-700 text-white px-3 py-1 rounded text-sm flex items-center transition-colors"
                      >
                        <CheckCircle className="mr-1" size={16} />
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleRejectRequest(approval.id)}
                        className="bg-error hover:bg-error-600 text-white px-3 py-1 rounded text-sm flex items-center transition-colors"
                      >
                        <XCircle className="mr-1" size={16} />
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de asesores */}
        <div className="bg-primary rounded-xl shadow-lg p-6 border border-border-primary">
          <h2 className="text-lg font-semibold text-primary mb-4">Equipo de Asesores</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-secondary">
                  <th className="text-left py-3 px-4 text-primary font-semibold">Asesor</th>
                  <th className="text-left py-3 px-4 text-primary font-semibold">Estado</th>
                  <th className="text-left py-3 px-4 text-primary font-semibold">Contactos</th>
                  <th className="text-left py-3 px-4 text-primary font-semibold">Conversiones</th>
                  <th className="text-left py-3 px-4 text-primary font-semibold">Llamadas</th>
                  <th className="text-left py-3 px-4 text-primary font-semibold">Rendimiento</th>
                  <th className="text-left py-3 px-4 text-primary font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {advisors.map((advisor) => (
                  <tr key={advisor.id} className="border-b border-border-secondary hover:bg-soft transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-primary">{advisor.name}</p>
                        <p className="text-sm text-secondary flex items-center">
                          <Mail className="mr-1" size={12} />
                          {advisor.email}
                        </p>
                        {advisor.phone && (
                          <p className="text-sm text-secondary flex items-center">
                            <Phone className="mr-1" size={12} />
                            {advisor.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(advisor.status)}`}>
                        {advisor.status === 'active' ? 'Activo' : advisor.status === 'pending' ? 'Pendiente' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-primary font-semibold">{advisor.contactsAssigned}</td>
                    <td className="py-3 px-4 text-primary font-semibold">{advisor.conversionsThisMonth}</td>
                    <td className="py-3 px-4 text-primary font-semibold">{advisor.callsThisWeek}</td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${getPerformanceColor(advisor.performance)}`}>
                        {advisor.performance}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedAdvisor(advisor.id)}
                        className="bg-cactus-600 hover:bg-cactus-700 text-white px-2 py-1 rounded text-xs transition-colors"
                      >
                        Asignar Contactos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal para agregar asesor */}
        {showAddAdvisor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-primary rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-primary mb-4">Agregar Nuevo Asesor</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={newAdvisor.name}
                    onChange={(e) => setNewAdvisor(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500"
                    placeholder="Ingresa el nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Email</label>
                  <input
                    type="email"
                    value={newAdvisor.email}
                    onChange={(e) => setNewAdvisor(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500"
                    placeholder="email@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Teléfono (Opcional)</label>
                  <input
                    type="tel"
                    value={newAdvisor.phone}
                    onChange={(e) => setNewAdvisor(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500"
                    placeholder="+34 600 123 456"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddAdvisor(false)}
                  className="px-4 py-2 text-secondary hover:bg-soft rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddAdvisor}
                  className="px-4 py-2 bg-cactus-600 hover:bg-cactus-700 text-white rounded-lg transition-colors"
                >
                  Agregar Asesor
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para asignar contactos */}
        {selectedAdvisor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-primary rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-primary mb-4">Asignar Contactos</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Asesor Seleccionado</label>
                  <p className="text-primary font-semibold">
                    {advisors.find(a => a.id === selectedAdvisor)?.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Número de Contactos</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={contactsToAssign}
                    onChange={(e) => setContactsToAssign(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500"
                    placeholder="Número de contactos a asignar"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedAdvisor('')}
                  className="px-4 py-2 text-secondary hover:bg-soft rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAssignContacts}
                  className="px-4 py-2 bg-cactus-600 hover:bg-cactus-700 text-white rounded-lg transition-colors"
                >
                  Asignar Contactos
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;