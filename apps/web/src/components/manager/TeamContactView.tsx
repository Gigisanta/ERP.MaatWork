import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Filter, Download, Eye, Edit, Phone, Mail, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { useCRMStore } from '../../store/crmStore';
import { formatCurrency } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import { useTeamStore } from '../../store/teamStore';
import { Contact, ContactStatus } from '../../types/crm';
import { exportTeamContacts } from '../../utils/exportUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';


interface ContactFilters {
  status: ContactStatus | 'all';
  assignedTo: string | 'all';
  source: string | 'all';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

const TeamContactView: React.FC = () => {
  const { user } = useAuthStore();
  const { contacts, isLoading, loadContacts, updateContact } = useCRMStore();
  const { teamMembers, fetchTeamMembers } = useTeamStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ContactFilters>({
    status: 'all',
    assignedTo: 'all',
    source: 'all',
    dateRange: 'all'
  });
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Check if user has manager permissions
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    if (!isManager) return;
    
    loadContacts();
    fetchTeamMembers('default-team-id'); // TODO: Get actual team ID from context
  }, [isManager, loadContacts, fetchTeamMembers]);

  // Filter and search contacts
  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(term) ||
        contact.email.toLowerCase().includes(term) ||
        contact.phone?.toLowerCase().includes(term) ||
        contact.assignedTo?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(contact => contact.status === filters.status);
    }

    // Assigned to filter
    if (filters.assignedTo !== 'all') {
      filtered = filtered.filter(contact => contact.assignedTo === filters.assignedTo);
    }

    // Source filter
    if (filters.source !== 'all') {
      filtered = filtered.filter(contact => contact.source === filters.source);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay.getTime() - (startOfDay.getDay() * 24 * 60 * 60 * 1000));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter(contact => {
        const contactDate = new Date(contact.createdAt);
        switch (filters.dateRange) {
          case 'today':
            return contactDate >= startOfDay;
          case 'week':
            return contactDate >= startOfWeek;
          case 'month':
            return contactDate >= startOfMonth;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [contacts, searchTerm, filters]);

  // Get unique sources and advisors for filters
  const uniqueSources = useMemo(() => {
    const sources = contacts.map(c => c.source).filter(Boolean);
    return [...new Set(sources)];
  }, [contacts]);

  const uniqueAdvisors = useMemo(() => {
    const advisors = contacts.map(c => c.assignedTo).filter(Boolean);
    return [...new Set(advisors)];
  }, [contacts]);

  // Contact statistics
  const contactStats = useMemo(() => {
    const total = filteredContacts.length;
    const byStatus = filteredContacts.reduce((acc, contact) => {
      acc[contact.status] = (acc[contact.status] || 0) + 1;
      return acc;
    }, {} as Record<ContactStatus, number>);

    const totalValue = filteredContacts.reduce((sum, contact) => 
      sum + (contact.estimatedValue || 0), 0
    );

    return {
      total,
      byStatus,
      totalValue,
      avgValue: total > 0 ? totalValue / total : 0
    };
  }, [filteredContacts]);

  const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    try {
      await exportTeamContacts(filteredContacts, format);
    } catch (error) {
      console.error('Error exporting contacts:', error);
    }
  };

  const handleContactSelect = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleBulkAssign = async (advisorId?: string) => {
    if (!advisorId) {
      // Show advisor selection modal or use first available advisor
      const firstAdvisor = uniqueAdvisors[0];
      if (!firstAdvisor) return;
      advisorId = firstAdvisor;
    }
    
    try {
      for (const contactId of selectedContacts) {
        await updateContact(contactId, { assignedTo: advisorId });
      }
      setSelectedContacts([]);
    } catch (error) {
      console.error('Error assigning contacts:', error);
    }
  };

  const handleBulkStatusChange = async (newStatus: ContactStatus) => {
    try {
      for (const contactId of selectedContacts) {
        await updateContact(contactId, { status: newStatus });
      }
      setSelectedContacts([]);
    } catch (error) {
      console.error('Error updating contact status:', error);
    }
  };

  const handleViewContact = (contactId: string) => {
    // Navigate to contact detail view
    console.log('Viewing contact:', contactId);
    // TODO: Implement navigation to contact detail
  };

  const handleEditContact = (contactId: string) => {
    // Navigate to contact edit form
    console.log('Editing contact:', contactId);
    // TODO: Implement navigation to contact edit form
  };

  const getStatusColor = (status: ContactStatus) => {
    switch (status) {
      case 'Prospecto': return 'bg-cactus-100 text-cactus-800';
      case 'Contactado': return 'bg-oasis-100 text-oasis-800';
      case 'Primera Reunion': return 'bg-sunlight-100 text-sunlight-800';
      case 'Segunda Reunion': return 'bg-terracotta-100 text-terracotta-800';
      case 'Apertura': return 'bg-terracotta-100 text-terracotta-800';
      case 'Cliente': return 'bg-cactus-100 text-cactus-900';
      case 'Cuenta Vacia': return 'bg-error-100 text-error-800';
      case 'Caido': return 'bg-gray-100 text-gray-800';
      default: return 'bg-soft text-secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (!isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
          <h3 className="text-lg font-medium text-primary mb-2">Acceso Denegado</h3>
          <p className="text-secondary">No tienes permisos para ver esta sección.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cactus-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Contactos del Equipo</h1>
          <p className="text-secondary">Gestiona todos los contactos asignados al equipo</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-border-primary rounded-lg hover:bg-soft"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </button>
          <div className="relative">
            <button className="flex items-center px-4 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-primary rounded-md shadow-lg z-10 hidden group-hover:block">
              <button
                onClick={() => handleExport('xlsx')}
                className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-soft"
              >
                Exportar a Excel
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-soft"
              >
                Exportar a CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-soft"
              >
                Exportar a PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-primary p-6 rounded-lg shadow-sm border border-border-primary">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-cactus-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary">Total Contactos</p>
            <p className="text-2xl font-bold text-primary">{contactStats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-primary p-6 rounded-lg shadow-sm border border-border-primary">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-oasis-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary">Valor Total</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(contactStats.totalValue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-primary p-6 rounded-lg shadow-sm border border-border-primary">
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-terracotta-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary">Valor Promedio</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(contactStats.avgValue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-primary p-6 rounded-lg shadow-sm border border-border-primary">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-sunlight-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-secondary">Clientes</p>
            <p className="text-2xl font-bold text-primary">{contactStats.byStatus.Cliente || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-primary p-6 rounded-lg shadow-sm border border-border-primary">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar contactos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
            />
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as ContactStatus | 'all' }))}
              className="px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500"
            >
              <option value="all">Todos los estados</option>
              <option value="Prospecto">Prospecto</option>
              <option value="Contactado">Contactado</option>
              <option value="Primera Reunion">Primera Reunion</option>
              <option value="Segunda Reunion">Segunda Reunion</option>
              <option value="Apertura">Apertura</option>
              <option value="Cliente">Cliente</option>
              <option value="Cuenta Vacia">Cuenta Vacia</option>
              <option value="Caido">Caido</option>
            </select>

            <select
              value={filters.assignedTo}
              onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
              className="px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500"
            >
              <option value="all">Todos los asesores</option>
              {uniqueAdvisors.map(advisor => (
                <option key={advisor} value={advisor}>{advisor}</option>
              ))}
            </select>

            <select
              value={filters.source}
              onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las fuentes</option>
              {uniqueSources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>

            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
            </select>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedContacts.length > 0 && (
        <div className="bg-primary p-4 rounded-lg border border-border-primary mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary">
              {selectedContacts.length} contacto(s) seleccionado(s)
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAssign()}
                className="px-3 py-1 text-sm bg-cactus-600 text-white rounded hover:bg-cactus-700"
              >
                Asignar
              </button>
              <button
                onClick={() => handleBulkStatusChange('Prospecto')}
                className="px-3 py-1 text-sm bg-oasis-600 text-white rounded hover:bg-oasis-700"
              >
                Marcar como Prospecto
              </button>
              <button
                onClick={() => setSelectedContacts([])}
                className="px-3 py-1 text-sm border border-border-primary text-secondary rounded hover:bg-soft"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div className="bg-primary rounded-lg shadow-sm border border-border-primary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-primary">
            <thead className="bg-soft">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedContacts(filteredContacts.map(c => c.id));
                      } else {
                        setSelectedContacts([]);
                      }
                    }}
                    checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                    className="rounded border-border-primary"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Asesor Asignado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Valor Estimado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Última Actividad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-primary divide-y divide-border-primary">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-soft">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => handleContactSelect(contact.id)}
                      className="rounded border-border-primary"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-cactus-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-primary">{contact.name}</div>
                        <div className="text-sm text-secondary">{contact.email}</div>
                        <div className="text-sm text-secondary">{contact.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contact.status)}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {contact.assignedTo || 'Sin asignar'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {formatCurrency(contact.estimatedValue || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {contact.lastActivity ? new Date(contact.lastActivity).toLocaleDateString() : 'Sin actividad'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewContact(contact.id)}
                      className="text-cactus-600 hover:text-cactus-900 mr-4"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => handleEditContact(contact.id)}
                      className="text-oasis-600 hover:text-oasis-900"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredContacts.length === 0 && (
          <div className="text-center py-12 text-secondary">
            <Users className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">No hay contactos</h3>
            <p>No se encontraron contactos que coincidan con los filtros seleccionados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamContactView;