/**
 * Página principal del CRM integrado con Notion
 * Incluye gestión de contactos, deals, tareas y configuración OAuth
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  CheckSquare, 
  Settings, 
  Database, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink,
  Loader2,
  Bell,
  BarChart3,
  Calendar,
  TrendingUp,
  Cog,
  DollarSign
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { NotionWorkspace, MigrationLog, CRMStats } from '../types/notion';
import ContactsManager from '../components/ContactsManager';
import DealsManager from '../components/DealsManager';
import TasksManager from '../components/TasksManager';
import RedirectConfig from '../components/RedirectConfig';
import NotionLoadingState from '../components/NotionLoadingState';
import NotionErrorState from '../components/NotionErrorState';
import NotionStatsCard from '../components/NotionStatsCard';
import NotionDataTable from '../components/NotionDataTable';

const NotionCRM: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [workspaces, setWorkspaces] = useState<NotionWorkspace[]>([]);
  const [migrations, setMigrations] = useState<MigrationLog[]>([]);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);

  // Pestañas disponibles
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'contacts', label: 'Contactos', icon: Users },
    { id: 'deals', label: 'Deals', icon: Briefcase },
    { id: 'tasks', label: 'Tareas', icon: CheckSquare },
    { id: 'settings', label: 'Configuración', icon: Settings }
  ];

  // Cargar datos iniciales con autenticación automática - OPTIMIZADO
  const loadData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      // Verificar estado de conexión con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
      
      try {
        const connectionResponse = await fetch('/api/notion/connection/status', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (connectionResponse.ok) {
          const connectionResult = await connectionResponse.json();
          const isConnected = connectionResult.connected && connectionResult.healthy;
          
          setNotionConnected(isConnected);
          
          if (isConnected && connectionResult.workspace) {
            setWorkspaces([{
              id: connectionResult.workspace.id || 'default',
              workspace_name: connectionResult.workspace.name || 'Workspace Principal',
              workspace_id: connectionResult.workspace.id || 'default',
              access_token: 'encrypted',
              bot_id: 'bot',
              owner: user.email || 'Usuario',
              workspace_icon: '🏢',
              is_active: connectionResult.healthy,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
            
            // Cargar estadísticas solo si está conectado
            await loadStats(token);
          } else {
            // No hay conexión activa, mostrar opción de conectar
            setWorkspaces([]);
            setStats({
              contacts: 0,
              deals: 0,
              tasks: 0,
              completedTasks: 0,
              totalValue: 0,
              wonDeals: 0
            });
          }
        } else {
          // Error en la verificación, mostrar estado desconectado
          setNotionConnected(false);
          setWorkspaces([]);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Timeout verificando conexión con Notion');
        }
        throw fetchError;
      }
      
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError(err instanceof Error ? err.message : 'Error cargando datos');
      setNotionConnected(false);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  // Intentar conexión automática - MEJORADO
  const tryAutoConnect = async () => {
    try {
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const autoConnectResponse = await fetch('/api/auth/notion/auto-connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (autoConnectResponse.ok) {
        const result = await autoConnectResponse.json();
        if (result.success && result.connected) {
          setNotionConnected(true);
          setWorkspaces([{
            id: result.workspace?.id || 'default',
            workspace_name: result.workspace?.name || 'Workspace Principal',
            workspace_id: result.workspace?.id || 'default',
            access_token: 'encrypted',
            bot_id: 'bot',
            owner: user?.email || 'Usuario',
            workspace_icon: result.workspace?.icon || '🏢',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
          setError(null);
          return true; // Conexión exitosa
        }
      } else {
        const errorResult = await autoConnectResponse.json();
        if (errorResult.code === 'NO_PREVIOUS_CONFIG') {
          // No hay configuración previa, mostrar opción de conectar
          setNotionConnected(false);
          setWorkspaces([]);
        } else if (errorResult.code === 'TOKEN_EXPIRED' || errorResult.code === 'TOKEN_INVALID') {
          // Token expirado/inválido, requiere nueva autenticación
          setError('La sesión con Notion ha expirado. Reconecta tu cuenta.');
          setNotionConnected(false);
          setWorkspaces([]);
        }
      }
      return false; // No se pudo conectar automáticamente
    } catch (err) {
      console.error('Error en auto-connect:', err);
      setNotionConnected(false);
      setWorkspaces([]);
      return false;
    }
  };

  // Cargar estadísticas - OPTIMIZADO
  const loadStats = async (token?: string) => {
    try {
      let authToken = token;
      if (!authToken) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
          console.warn('No se pudo obtener el token para estadísticas');
          return;
        }
        authToken = session.access_token;
      }
      
      // Intentar obtener estadísticas reales del backend
      try {
        const statsResponse = await fetch('/api/crm/stats', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        } else {
          // Fallback a estadísticas vacías
          setStats({
            contacts: 0,
            deals: 0,
            tasks: 0,
            completedTasks: 0,
            totalValue: 0,
            wonDeals: 0
          });
        }
      } catch (statsError) {
        console.warn('Error obteniendo estadísticas, usando valores por defecto:', statsError);
        setStats({
          contacts: 0,
          deals: 0,
          tasks: 0,
          completedTasks: 0,
          totalValue: 0,
          wonDeals: 0
        });
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  // Iniciar sincronización de datos
  const startMigration = async () => {
    if (!user || migrating || !notionConnected) return;
    
    try {
      setMigrating(true);
      setError(null);
      
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const response = await fetch('/api/notion/sync/trigger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ syncType: 'full' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error iniciando sincronización');
      }
      
      const result = await response.json();
      
      // Actualizar estadísticas con los resultados
      if (result.success && result.result) {
        const newStats: CRMStats = {
          contacts: Array.isArray(result.result.contacts) ? result.result.contacts.length : 0,
          deals: Array.isArray(result.result.deals) ? result.result.deals.length : 0,
          tasks: Array.isArray(result.result.tasks) ? result.result.tasks.length : 0,
          completedTasks: Array.isArray(result.result.tasks) ? result.result.tasks.filter((t: any) => t.completed).length : 0,
          totalValue: Array.isArray(result.result.deals) ? result.result.deals.reduce((sum: number, deal: any) => sum + (deal.value || 0), 0) : 0,
          wonDeals: Array.isArray(result.result.deals) ? result.result.deals.filter((d: any) => d.status === 'won').length : 0
        };
        setStats(newStats);
        
        // Agregar log de migración exitosa
        const newMigration: MigrationLog = {
          id: result.syncId,
          migration_type: 'Sincronización completa',
          status: 'completed',
          records_migrated: (newStats.contacts + newStats.deals + newStats.tasks),
          total_records: (newStats.contacts + newStats.deals + newStats.tasks),
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        };
        setMigrations(prev => [newMigration, ...prev]);
        
        setError(null);
      }
      
    } catch (err) {
      console.error('Error durante la sincronización:', err);
      setError(err instanceof Error ? err.message : 'Error durante la sincronización');
      
      // Agregar log de migración fallida
      const failedMigration: MigrationLog = {
        id: crypto.randomUUID(),
        migration_type: 'Sincronización completa',
        status: 'failed',
        records_migrated: 0,
        total_records: 0,
        error_message: err instanceof Error ? err.message : 'Error desconocido',
        started_at: new Date().toISOString()
      };
      setMigrations(prev => [failedMigration, ...prev]);
    } finally {
      setMigrating(false);
    }
  };

  // Conectar con Notion OAuth - MEJORADO CON OAUTH AUTOMÁTICO
  const connectNotion = async () => {
    if (!user) return;
    
    try {
      setError(null);
      setLoading(true);
      
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      // Obtener URL de autorización OAuth
      const oauthResponse = await fetch('/api/auth/notion/connect', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (oauthResponse.ok) {
        const { authUrl } = await oauthResponse.json();
        // Redirigir a Notion OAuth
        window.location.href = authUrl;
      } else {
        const errorData = await oauthResponse.json();
        throw new Error(errorData.error || 'Error iniciando OAuth con Notion');
      }
    } catch (err) {
      console.error('Error conectando con Notion:', err);
      setError(err instanceof Error ? err.message : 'Error conectando con Notion');
    } finally {
      setLoading(false);
    }
  };

  // Desconectar workspace - MEJORADO
  const disconnectWorkspace = async (workspaceId: string) => {
    if (!user || !confirm('¿Estás seguro de desconectar este workspace?')) return;
    
    try {
      setError(null);
      setLoading(true);
      
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const response = await fetch('/api/auth/notion/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconectando workspace');
      }
      
      // Actualizar estado local
      setNotionConnected(false);
      setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
      
      // Limpiar estadísticas si no hay más workspaces
      const remainingWorkspaces = workspaces.filter(w => w.id !== workspaceId);
      if (remainingWorkspaces.length === 0) {
        setStats({
          contacts: 0,
          deals: 0,
          tasks: 0,
          completedTasks: 0,
          totalValue: 0,
          wonDeals: 0
        });
      }
      
    } catch (err) {
      console.error('Error desconectando workspace:', err);
      setError(err instanceof Error ? err.message : 'Error desconectando workspace');
    } finally {
      setLoading(false);
    }
  };

  // Verificar salud de la conexión
  const checkHealth = async () => {
    if (!user) return;
    
    try {
      setError(null);
      setLoading(true);
      
      // Obtener token de sesión de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      const token = session.access_token;
      
      const response = await fetch(`/api/notion/health/${user.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error verificando salud');
      }
      
      const healthData = await response.json();
      
      if (healthData.healthy) {
        setError(null);
        setNotionConnected(true);
        
        // Actualizar workspaces si están disponibles
        if (healthData.workspaces && Array.isArray(healthData.workspaces)) {
          setWorkspaces(healthData.workspaces);
        }
        
        // Actualizar estadísticas si están disponibles
        if (healthData.stats) {
          setStats(healthData.stats);
        }
        
        // Mostrar información de cache si está disponible
        if (healthData.cacheInfo) {
          console.log('Cache info:', healthData.cacheInfo);
        }
        
      } else {
        setError(healthData.error || 'La conexión con Notion no está funcionando correctamente');
        setNotionConnected(false);
        
        // Si hay problemas de autenticación, intentar reconectar
        if (healthData.error && healthData.error.includes('auth')) {
          await tryAutoConnect();
        }
      }
      
    } catch (err) {
      console.error('Error verificando salud de la conexión:', err);
      setError(err instanceof Error ? err.message : 'Error verificando salud de la conexión');
      setNotionConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos cuando cambie el usuario - OPTIMIZADO PARA EVITAR LOOPS
  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      if (user?.id && isMounted) {
        await loadData();
      } else if (!user && isMounted) {
        // Limpiar estado si no hay usuario
        setNotionConnected(false);
        setWorkspaces([]);
        setMigrations([]);
        setStats({
          contacts: 0,
          deals: 0,
          tasks: 0,
          completedTasks: 0,
          totalValue: 0,
          wonDeals: 0
        });
        setError(null);
        setLoading(false);
      }
    };
    
    initializeData();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id]); // Solo depender del ID del usuario

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <NotionLoadingState 
          message="Cargando CRM"
          type="loading"
          className="max-w-md"
        />
      </div>
    );
  }

  // Mostrar error si hay algún problema
  if (error && !notionConnected && workspaces.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <NotionErrorState 
          error={error}
          type="general"
          onRetry={() => window.location.reload()}
          className="max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <Database className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Notion CRM</h1>
                  <p className="text-sm text-gray-500">Sistema integrado de gestión</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Estado de conexión */}
              <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
                notionConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  notionConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {notionConnected ? 'Conectado a Notion' : 'Desconectado'}
              </div>
              
              {/* Botón de actualizar */}
              <button
                onClick={loadData}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Actualizar datos"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              
              {/* Verificar salud */}
              <button
                onClick={checkHealth}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Verificar estado del servicio"
              >
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Navegación por pestañas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Modal de migración */}
      {migrating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <NotionLoadingState 
              message="Migrando datos a Notion"
              type="migrating"
              className="border-0 bg-transparent"
            />
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Estadísticas principales */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <NotionStatsCard
                  title="Contactos"
                  value={stats.contacts}
                  icon={Users}
                  color="blue"
                  trend={{
                    value: 12,
                    isPositive: true
                  }}
                />
                
                <NotionStatsCard
                  title="Deals"
                  value={stats.deals}
                  icon={Briefcase}
                  color="green"
                  subtitle={`${stats.wonDeals} ganados`}
                  trend={{
                    value: 8,
                    isPositive: true
                  }}
                />
                
                <NotionStatsCard
                  title="Tareas"
                  value={stats.tasks}
                  icon={CheckSquare}
                  color="purple"
                  subtitle={`${stats.completedTasks} completadas`}
                  trend={{
                    value: -5,
                    isPositive: false
                  }}
                />
                
                <NotionStatsCard
                  title="Valor Total"
                  value={stats.totalValue}
                  icon={TrendingUp}
                  color="orange"
                  format="currency"
                  trend={{
                    value: 15,
                    isPositive: true
                  }}
                />
              </div>
            )}
            
            {/* Workspaces conectados */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Workspaces de Notion</h3>
              </div>
              <div className="p-6">
                {workspaces.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-4">No hay workspaces conectados</p>
                    <button
                      onClick={connectNotion}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Conectar con Notion
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workspaces.map((workspace) => (
                      <div key={workspace.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          {workspace.workspace_icon && (
                            <span className="text-2xl mr-3">{workspace.workspace_icon}</span>
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">{workspace.workspace_name}</h4>
                            <p className="text-sm text-gray-500">Propietario: {workspace.owner}</p>
                            <p className="text-xs text-gray-400">
                              Conectado: {new Date(workspace.created_at).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            workspace.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {workspace.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                          <button
                            onClick={() => disconnectWorkspace(workspace.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Desconectar
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={connectNotion}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      + Conectar otro workspace
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Sincronización de Datos */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Sincronización de Datos</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-600">Sincroniza todos tus datos entre Notion y el CRM</p>
                    <p className="text-sm text-gray-500">Esta operación actualizará contactos, deals y tareas desde Notion</p>
                  </div>
                  <button
                    onClick={startMigration}
                    disabled={migrating || !notionConnected}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {migrating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sincronizar Ahora
                      </>
                    )}
                  </button>
                </div>
                
                {/* Logs de sincronización */}
                {migrations.length > 0 && (
                  <NotionDataTable
                    title="Historial de Sincronizaciones"
                    data={migrations.slice(0, 5)}
                    columns={[
                      {
                        key: 'migration_type',
                        label: 'Tipo',
                        render: (value, item) => (
                          <div className="flex items-center">
                            {item.status === 'completed' ? (
                              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                            ) : item.status === 'failed' ? (
                              <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                            ) : (
                              <Loader2 className="w-4 h-4 text-blue-600 mr-2 animate-spin" />
                            )}
                            <span className="text-sm font-medium">{value}</span>
                          </div>
                        )
                      },
                      {
                        key: 'records_migrated',
                        label: 'Registros',
                        render: (value, item) => (
                          <span className="text-sm">
                            {value}/{item.total_records}
                          </span>
                        )
                      },
                      {
                        key: 'started_at',
                        label: 'Fecha',
                        render: (value) => (
                          <span className="text-sm text-gray-500">
                            {new Date(value).toLocaleDateString('es-ES')}
                          </span>
                        )
                      },
                      {
                        key: 'error_message',
                        label: 'Estado',
                        render: (value, item) => (
                          <div>
                            {item.status === 'completed' && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                Completado
                              </span>
                            )}
                            {item.status === 'failed' && (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                                Error
                              </span>
                            )}
                            {value && (
                              <p className="text-xs text-red-600 mt-1">{value}</p>
                            )}
                          </div>
                        )
                      }
                    ]}
                    className="mt-4"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contactos */}
        {activeTab === 'contacts' && (
          <ContactsManager className="" />
        )}

        {/* Deals */}
        {activeTab === 'deals' && (
          <DealsManager className="" />
        )}

        {/* Tareas */}
        {activeTab === 'tasks' && (
          <TasksManager className="" />
        )}

        {/* Configuración */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Configuración OAuth</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado de la conexión
                    </label>
                    <div className={`flex items-center px-3 py-2 rounded-lg ${
                      notionConnected 
                        ? 'bg-green-50 text-green-800' 
                        : 'bg-red-50 text-red-800'
                    }`}>
                      {notionConnected ? (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <AlertCircle className="w-4 h-4 mr-2" />
                      )}
                      {notionConnected 
                        ? 'Conectado correctamente a Notion' 
                        : 'No conectado a Notion'
                      }
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variables de entorno
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">NOTION_CLIENT_ID</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          import.meta.env.VITE_NOTION_CLIENT_ID 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {import.meta.env.VITE_NOTION_CLIENT_ID ? 'Configurado' : 'No configurado'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">NOTION_REDIRECT_URI</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          import.meta.env.VITE_NOTION_REDIRECT_URI 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {import.meta.env.VITE_NOTION_REDIRECT_URI ? 'Configurado' : 'No configurado'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <button
                      onClick={connectNotion}
                      disabled={!import.meta.env.VITE_NOTION_CLIENT_ID || !import.meta.env.VITE_NOTION_REDIRECT_URI}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {notionConnected ? 'Reconectar' : 'Conectar'} con Notion
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Configuración de Redirección</h3>
              </div>
              <div className="p-6">
                <RedirectConfig onConfigUpdate={(customUrl) => {
                  console.log('Configuración actualizada:', customUrl);
                }} />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Información del Sistema</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Estado del Servicio</h4>
                    <button
                      onClick={checkHealth}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Verificar estado
                    </button>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Documentación</h4>
                    <p className="text-sm text-gray-600">
                      Consulta NOTION_OAUTH_SETUP.md para configurar OAuth
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotionCRM;