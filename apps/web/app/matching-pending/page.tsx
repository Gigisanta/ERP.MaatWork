'use client';

/**
 * Bandeja de Pendientes - UI para resolver matching manual
 * Implementa STORY 5 - KAN-126
 */

import { useState, useEffect } from 'react';

interface PendingItem {
  id: string;
  sourceTable: string;
  sourceRecordId: string;
  matchStatus: string;
  matchRule: string | null;
  confidence: string;
  context: any;
  stagingData: any;
  createdAt: string;
}

interface Candidate {
  id: string;
  comitente: number;
  cuotapartista: number;
  cuentaNorm: string;
  equipo: string | null;
  score: number;
}

export default function MatchingPendingPage() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<string>('pending');
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  // Cargar items
  const loadItems = async (status: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/matching-pending?status=${status}&limit=100`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Cargar stats
  const loadStats = async () => {
    try {
      const res = await fetch(`${API_URL}/matching-pending/stats`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  
  // Cargar candidatos para un item
  const loadCandidates = async (itemId: string) => {
    try {
      const res = await fetch(`${API_URL}/matching-pending/${itemId}/candidates`);
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (error) {
      console.error('Error loading candidates:', error);
      setCandidates([]);
    }
  };
  
  // Resolver un pendiente
  const resolvePending = async (itemId: string, clientId: string | null, action: string, comment?: string) => {
    try {
      const res = await fetch(`${API_URL}/matching-pending/${itemId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, action, comment })
      });
      
      if (res.ok) {
        // Recargar lista
        await loadItems(selectedTab);
        await loadStats();
        setSelectedItem(null);
        setCandidates([]);
      }
    } catch (error) {
      console.error('Error resolving:', error);
      alert('Error al resolver el pendiente');
    }
  };
  
  // Resolver múltiples
  const bulkResolve = async () => {
    if (selectedItems.size === 0) {
      alert('Selecciona al menos un item');
      return;
    }
    
    const resolutions = Array.from(selectedItems).map(id => ({
      id,
      clientId: null,
      action: 'ignore',
      comment: 'Resolución masiva - ignorado'
    }));
    
    try {
      const res = await fetch(`${API_URL}/matching-pending/bulk-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutions })
      });
      
      const data = await res.json();
      alert(`Resueltos: ${data.resolved}, Errores: ${data.errors?.length || 0}`);
      
      setSelectedItems(new Set());
      await loadItems(selectedTab);
      await loadStats();
    } catch (error) {
      console.error('Error in bulk resolve:', error);
      alert('Error en resolución masiva');
    }
  };
  
  useEffect(() => {
    loadItems(selectedTab);
    loadStats();
  }, [selectedTab]);
  
  useEffect(() => {
    if (selectedItem) {
      loadCandidates(selectedItem.id);
    }
  }, [selectedItem]);
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Bandeja de Pendientes
          </h1>
          <p className="text-gray-600">
            Resolver clientes sin coincidencia o con conflicto de asesoría
          </p>
        </div>
        
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.byStatus?.pending || 0}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">No Match</div>
              <div className="text-2xl font-bold text-red-600">
                {stats.byStatus?.no_match || 0}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Multi Match</div>
              <div className="text-2xl font-bold text-orange-600">
                {stats.byStatus?.multi_match || 0}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Total Pendientes</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalPending || 0}
              </div>
            </div>
          </div>
        )}
        
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {['pending', 'no_match', 'multi_match', 'matched'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Actions */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedItems.size > 0 && `${selectedItems.size} seleccionados`}
            </div>
            <div className="space-x-2">
              {selectedItems.size > 0 && (
                <>
                  <button
                    onClick={bulkResolve}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Ignorar seleccionados
                  </button>
                  <button
                    onClick={() => setSelectedItems(new Set())}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Limpiar selección
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Lista */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                Cargando...
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No hay pendientes en esta categoría
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(new Set(items.map(i => i.id)));
                          } else {
                            setSelectedItems(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Comitente/Cuota
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cuenta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Asesor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Regla
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedItems);
                            if (e.target.checked) {
                              newSet.add(item.id);
                            } else {
                              newSet.delete(item.id);
                            }
                            setSelectedItems(newSet);
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {item.stagingData?.comitente} / {item.stagingData?.cuotapartista}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {item.stagingData?.cuenta || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {item.stagingData?.asesor || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                          {item.matchRule || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {(parseFloat(item.confidence) * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        
        {/* Modal de detalles */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Resolver Pendiente</h2>
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setCandidates([]);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Datos origen */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3">Datos Origen (Comisiones)</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-500">Comitente:</span>
                        <div className="font-medium">{selectedItem.stagingData?.comitente}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Cuotapartista:</span>
                        <div className="font-medium">{selectedItem.stagingData?.cuotapartista}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Cuenta:</span>
                        <div className="font-medium">{selectedItem.stagingData?.cuenta || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Asesor:</span>
                        <div className="font-medium">{selectedItem.stagingData?.asesor || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Candidatos */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-3">
                    Candidatos ({candidates.length})
                  </h3>
                  {candidates.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No hay candidatos disponibles
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {candidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="border border-gray-200 rounded p-4 hover:border-blue-500 cursor-pointer"
                          onClick={() => {
                            const comment = prompt('Comentario (opcional):');
                            resolvePending(selectedItem.id, candidate.id, 'assign', comment || undefined);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">
                                {candidate.comitente} / {candidate.cuotapartista}
                              </div>
                              <div className="text-sm text-gray-600">
                                {candidate.cuentaNorm}
                              </div>
                              {candidate.equipo && (
                                <div className="text-xs text-gray-500">
                                  Equipo: {candidate.equipo}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-green-600">
                                Score: {(candidate.score * 100).toFixed(1)}%
                              </div>
                              <button className="mt-1 text-xs text-blue-600 hover:text-blue-800">
                                Asignar →
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Acciones */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const comment = prompt('Comentario:');
                      if (comment) {
                        resolvePending(selectedItem.id, null, 'ignore', comment);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Ignorar
                  </button>
                  <button
                    onClick={() => {
                      alert('Funcionalidad "Crear nuevo cliente" pendiente de implementación');
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Crear nuevo cliente
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




