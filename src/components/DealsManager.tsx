/**
 * Componente para gestión de deals/oportunidades del CRM integrado con Notion
 * Permite crear, editar, eliminar y visualizar deals con pipeline de ventas
 */

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  User, 
  Building, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Tag,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Target
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

// Tipos
interface Deal {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  expected_close_date?: string;
  contact_id?: string;
  contact_name?: string;
  company?: string;
  tags: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface DealsManagerProps {
  className?: string;
}

const DealsManager: React.FC<DealsManagerProps> = ({ className = '' }) => {
  const { user } = useAuthStore();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: 0,
    currency: 'USD',
    stage: 'lead' as Deal['stage'],
    probability: 10,
    expected_close_date: '',
    contact_id: '',
    contact_name: '',
    company: '',
    tags: [] as string[],
    notes: ''
  });

  // Configuración de stages
  const stages = [
    { value: 'lead', label: 'Lead', color: 'bg-gray-100 text-gray-800', probability: 10 },
    { value: 'qualified', label: 'Calificado', color: 'bg-blue-100 text-blue-800', probability: 25 },
    { value: 'proposal', label: 'Propuesta', color: 'bg-yellow-100 text-yellow-800', probability: 50 },
    { value: 'negotiation', label: 'Negociación', color: 'bg-orange-100 text-orange-800', probability: 75 },
    { value: 'closed_won', label: 'Ganado', color: 'bg-green-100 text-green-800', probability: 100 },
    { value: 'closed_lost', label: 'Perdido', color: 'bg-red-100 text-red-800', probability: 0 }
  ];

  // Cargar deals
  const loadDeals = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const response = await fetch('/api/crm/deals', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error cargando deals');
      }

      const result = await response.json();
      setDeals(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Crear deal
  const createDeal = async () => {
    if (!user || !formData.title.trim()) return;
    
    try {
      setSubmitting(true);
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const response = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error creando deal');
      }

      await loadDeals();
      resetForm();
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando deal');
    } finally {
      setSubmitting(false);
    }
  };

  // Actualizar deal
  const updateDeal = async () => {
    if (!user || !editingDeal || !formData.title.trim()) return;
    
    try {
      setSubmitting(true);
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const response = await fetch(`/api/crm/deals/${editingDeal.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error actualizando deal');
      }

      await loadDeals();
      resetForm();
      setEditingDeal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando deal');
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar deal
  const deleteDeal = async (dealId: string) => {
    if (!user || !confirm('¿Estás seguro de eliminar este deal?')) return;
    
    try {
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const response = await fetch(`/api/crm/deals/${dealId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error eliminando deal');
      }

      await loadDeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando deal');
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: 0,
      currency: 'USD',
      stage: 'lead',
      probability: 10,
      expected_close_date: '',
      contact_id: '',
      contact_name: '',
      company: '',
      tags: [],
      notes: ''
    });
  };

  // Abrir modal de edición
  const openEditModal = (deal: Deal) => {
    setFormData({
      title: deal.title,
      description: deal.description || '',
      amount: deal.amount,
      currency: deal.currency,
      stage: deal.stage,
      probability: deal.probability,
      expected_close_date: deal.expected_close_date || '',
      contact_id: deal.contact_id || '',
      contact_name: deal.contact_name || '',
      company: deal.company || '',
      tags: deal.tags,
      notes: deal.notes || ''
    });
    setEditingDeal(deal);
  };

  // Actualizar probabilidad cuando cambia el stage
  const handleStageChange = (stage: Deal['stage']) => {
    const stageConfig = stages.find(s => s.value === stage);
    setFormData({
      ...formData,
      stage,
      probability: stageConfig?.probability || 10
    });
  };

  // Filtrar deals
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || deal.stage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  // Obtener configuración del stage
  const getStageConfig = (stage: Deal['stage']) => {
    return stages.find(s => s.value === stage) || stages[0];
  };

  // Formatear moneda
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Calcular estadísticas
  const stats = {
    total: filteredDeals.length,
    totalValue: filteredDeals.reduce((sum, deal) => sum + deal.amount, 0),
    weightedValue: filteredDeals.reduce((sum, deal) => sum + (deal.amount * deal.probability / 100), 0),
    wonDeals: filteredDeals.filter(deal => deal.stage === 'closed_won').length,
    lostDeals: filteredDeals.filter(deal => deal.stage === 'closed_lost').length
  };

  useEffect(() => {
    loadDeals();
  }, [user]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando deals...</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Pipeline de Ventas ({filteredDeals.length})
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Deal
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-600 font-medium">Valor Total</span>
            </div>
            <p className="text-lg font-semibold text-blue-900">
              {formatCurrency(stats.totalValue, 'USD')}
            </p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm text-green-600 font-medium">Valor Ponderado</span>
            </div>
            <p className="text-lg font-semibold text-green-900">
              {formatCurrency(stats.weightedValue, 'USD')}
            </p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-emerald-600 mr-2" />
              <span className="text-sm text-emerald-600 font-medium">Ganados</span>
            </div>
            <p className="text-lg font-semibold text-emerald-900">{stats.wonDeals}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
              <span className="text-sm text-red-600 font-medium">Perdidos</span>
            </div>
            <p className="text-lg font-semibold text-red-900">{stats.lostDeals}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar deals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center">
            <Filter className="w-4 h-4 mr-2 text-gray-400" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los stages</option>
              {stages.map(stage => (
                <option key={stage.value} value={stage.value}>{stage.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
          <span className="text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Lista de deals */}
      <div className="divide-y divide-gray-200">
        {filteredDeals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No se encontraron deals</p>
            <p className="text-sm">Crea tu primer deal para comenzar</p>
          </div>
        ) : (
          filteredDeals.map((deal) => {
            const stageConfig = getStageConfig(deal.stage);
            return (
              <div key={deal.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="font-medium text-gray-900 mr-3">{deal.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${stageConfig.color}`}>
                        {stageConfig.label}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {deal.probability}%
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center font-medium text-green-600">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {formatCurrency(deal.amount, deal.currency)}
                      </div>
                      {deal.contact_name && (
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {deal.contact_name}
                        </div>
                      )}
                      {deal.company && (
                        <div className="flex items-center">
                          <Building className="w-4 h-4 mr-1" />
                          {deal.company}
                        </div>
                      )}
                      {deal.expected_close_date && (
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(deal.expected_close_date).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </div>
                    
                    {deal.description && (
                      <p className="text-sm text-gray-600 mb-2">{deal.description}</p>
                    )}
                    
                    {deal.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {deal.tags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => openEditModal(deal)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar deal"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteDeal(deal.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar deal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de creación/edición */}
      {(showCreateModal || editingDeal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingDeal ? 'Editar Deal' : 'Nuevo Deal'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Título del deal"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción del deal"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Moneda
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="MXN">MXN</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stage
                    </label>
                    <select
                      value={formData.stage}
                      onChange={(e) => handleStageChange(e.target.value as Deal['stage'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {stages.map(stage => (
                        <option key={stage.value} value={stage.value}>{stage.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Probabilidad (%)
                    </label>
                    <input
                      type="number"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha esperada de cierre
                  </label>
                  <input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contacto
                    </label>
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nombre del contacto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Empresa
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(false);
                    setEditingDeal(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  onClick={editingDeal ? updateDeal : createDeal}
                  disabled={submitting || !formData.title.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingDeal ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealsManager;