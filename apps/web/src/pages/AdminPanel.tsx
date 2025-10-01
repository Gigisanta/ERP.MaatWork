import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { User } from '../store/authStore';
import { useApprovalStore } from '../store/approvalStore';
import { useNotificationStore } from '../store/notificationStore';

import { CheckCircle, XCircle, Users, Clock, UserCheck, Trash2, AlertTriangle, Settings, Database, FileText, Download, Calendar, RotateCcw } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { 
    getPendingUsers, 
    approveUser, 
    rejectUser, 
    getAllUsers, 
    deleteUser, 
    deleteAllUserData, 
    resetSystem, 
    deleteAllPendingUsers,
    clearCompleteDatabase,
    isLoading 
  } = useAuthStore();
  const { 
    approvalRequests, 
    isLoading: approvalLoading, 
    fetchApprovalRequests, 
    approveRequest,
    rejectRequest 
  } = useApprovalStore();
  const { createNotification } = useNotificationStore();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'management' | 'report' | 'approvals'>('pending');
  const [showDeleteModal, setShowDeleteModal] = useState<{ show: boolean; userId: string; userName: string; type: 'delete' | 'deleteAll' }>({ show: false, userId: '', userName: '', type: 'delete' });
  const [showSystemModal, setShowSystemModal] = useState<{ show: boolean; type: 'resetSystem' | 'deletePending' | 'clearDatabase' }>({ show: false, type: 'resetSystem' });
  const [confirmText, setConfirmText] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Función para exportar informe de usuarios
  const exportUserReport = () => {
    const reportData = allUsers.map(user => ({
      Nombre: user.name,
      Email: user.email,
      Rol: user.role === 'manager' ? 'Manager' : 'Asesor',

      Departamento: user.department,
      Teléfono: user.phone,
      Estado: user.isApproved ? 'Aprobado' : 'Pendiente',
      'Fecha de Registro': new Date().toLocaleDateString('es-ES') // Simulada ya que no tenemos fecha real
    }));

    const csvContent = [
      Object.keys(reportData[0] || {}).join(','),
      ...reportData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `informe_usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setMessage({ text: 'Informe exportado exitosamente', type: 'success' });
  };

  const refreshData = async () => {
    const [pending, all] = await Promise.all([
      getPendingUsers(),
      getAllUsers()
    ]);
    setPendingUsers(pending);
    setAllUsers(all);
  };

  useEffect(() => {
    refreshData();
    fetchApprovalRequests();
  }, [fetchApprovalRequests]);

  // Iniciar realtime de approvals (disabled for now)
  // useEffect(() => {
  //   const { startApprovalsSubscription, stopApprovalsSubscription } = useApprovalStore.getState();
  //   startApprovalsSubscription?.();
  //   return () => {
  //     stopApprovalsSubscription?.();
  //   };
  // }, []);

  // Iniciar realtime de users
  useEffect(() => {
    const { startUsersSubscription, stopUsersSubscription, fetchUsersFromSupabase } = useAuthStore.getState();
    fetchUsersFromSupabase?.();
    startUsersSubscription?.();
    return () => {
      stopUsersSubscription?.();
    };
  }, []);

  const handleApprove = async (userId: string) => {
    try {
      const user = allUsers.find(u => u.id === userId);
      const approvalRequest = approvalRequests.find(req => req.user_id === userId);
      
      // Process approval in approval store
      if (approvalRequest) {
        await approveRequest(approvalRequest.id, 'Solicitud aprobada por administrador');
      }
      
      // Approve user in auth store
      const success = await approveUser(userId);
      
      if (success) {
        // Create notification for user
        if (user) {
          await createNotification({
            user_id: userId,
            title: '¡Solicitud Aprobada!',
            message: `Tu solicitud para el rol de ${user.role === 'manager' ? 'Manager' : 'Asesor'} ha sido aprobada. Ya puedes acceder al sistema.`,
            type: 'approval_approved',
            priority: 'high'
          });
        }
        
        setMessage({ text: 'Usuario aprobado exitosamente', type: 'success' });
        refreshData();
        fetchApprovalRequests();
      }
    } catch (error) {
      setMessage({ text: 'Error al aprobar usuario', type: 'error' });
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const user = allUsers.find(u => u.id === userId);
      const approvalRequest = approvalRequests.find(req => req.user_id === userId);
      
      // Process rejection in approval store
      if (approvalRequest) {
        await rejectRequest(approvalRequest.id, 'Solicitud rechazada por administrador');
      }
      
      // Reject user in auth store
      const success = await rejectUser(userId);
      
      if (success) {
        // Create notification for user
        if (user) {
          await createNotification({
            user_id: userId,
            title: 'Solicitud Rechazada',
            message: `Tu solicitud para el rol de ${user.role === 'manager' ? 'Manager' : 'Asesor'} ha sido rechazada. Contacta al administrador para más información.`,
            type: 'approval_rejected',
            priority: 'high'
          });
        }
        
        setMessage({ text: 'Usuario rechazado exitosamente', type: 'success' });
        refreshData();
        fetchApprovalRequests();
      }
    } catch (error) {
      setMessage({ text: 'Error al rechazar usuario', type: 'error' });
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const request = approvalRequests.find(req => req.id === requestId);
      if (!request) {
        setMessage({ text: 'Solicitud no encontrada', type: 'error' });
        return;
      }

      // Aprobar la solicitud en el approval store
      await approveRequest(requestId, 'Solicitud aprobada por administrador');
      
      setMessage({ text: 'Solicitud aprobada exitosamente', type: 'success' });
      fetchApprovalRequests();
    } catch (error) {
      setMessage({ text: 'Error al aprobar solicitud', type: 'error' });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const request = approvalRequests.find(req => req.id === requestId);
      if (!request) {
        setMessage({ text: 'Solicitud no encontrada', type: 'error' });
        return;
      }

      // Rechazar la solicitud en el approval store
      await rejectRequest(requestId, 'Solicitud rechazada por administrador');
      
      setMessage({ text: 'Solicitud rechazada exitosamente', type: 'success' });
      fetchApprovalRequests();
    } catch (error) {
      setMessage({ text: 'Error al rechazar solicitud', type: 'error' });
    }
  };

  const handleDeleteUser = async () => {
    try {
      const success = await deleteUser(showDeleteModal.userId);
      if (success) {
        setMessage({ text: 'Usuario eliminado exitosamente', type: 'success' });
        refreshData();
      } else {
        setMessage({ text: 'Error al eliminar el usuario', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Error al eliminar el usuario', type: 'error' });
    }
    setShowDeleteModal({ show: false, userId: '', userName: '', type: 'delete' });
    setConfirmText('');
  };

  const handleDeleteAllUserData = async () => {
    try {
      const success = await deleteAllUserData(showDeleteModal.userId);
      if (success) {
        setMessage({ text: 'Todos los datos del usuario eliminados exitosamente', type: 'success' });
        refreshData();
      } else {
        setMessage({ text: 'Error al eliminar los datos del usuario', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Error al eliminar los datos del usuario', type: 'error' });
    }
    setShowDeleteModal({ show: false, userId: '', userName: '', type: 'deleteAll' });
    setConfirmText('');
  };

  const handleSystemAction = async () => {
    try {
      if (showSystemModal.type === 'resetSystem') {
        const success = await resetSystem();
        if (success) {
          setMessage({ text: 'Sistema reseteado exitosamente', type: 'success' });
          refreshData();
        }
      } else if (showSystemModal.type === 'deletePending') {
        const success = await deleteAllPendingUsers();
        if (success) {
          setMessage({ text: 'Usuarios pendientes eliminados exitosamente', type: 'success' });
          refreshData();
        }
      } else if (showSystemModal.type === 'clearDatabase') {
        const success = await clearCompleteDatabase();
        if (success) {
          // No necesitamos mostrar mensaje ya que la página se recargará
          // setMessage({ text: 'Base de datos limpiada completamente', type: 'success' });
        }
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Error en la operación', type: 'error' });
    }
    setShowSystemModal({ show: false, type: 'resetSystem' });
    setConfirmText('');
  };

  const openDeleteModal = (userId: string, userName: string, type: 'delete' | 'deleteAll') => {
    setShowDeleteModal({ show: true, userId, userName, type });
  };

  const openSystemModal = (type: 'resetSystem' | 'deletePending' | 'clearDatabase') => {
    setShowSystemModal({ show: true, type });
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const UserCard: React.FC<{ user: User; showActions?: boolean }> = ({ user, showActions = false }) => (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-cactus-50 dark:bg-cactus-900/20 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-cactus-600 dark:text-cactus-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{user.name}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{user.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Rol:</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                user.role === 'manager' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300' : 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
              }`}>
                {user.role === 'manager' ? 'Manager' : 'Asesor'}
              </span>
            </div>

            <div>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Departamento:</span>
              <span className="ml-2 text-neutral-600 dark:text-neutral-400">{user.department}</span>
            </div>
            <div>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Teléfono:</span>
              <span className="ml-2 text-neutral-600 dark:text-neutral-400">{user.phone}</span>
            </div>
          </div>
          
          <div className="mt-3">
            <span className="font-medium text-neutral-800 dark:text-neutral-200">Estado:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
              user.isApproved ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
            }`}>
              {user.isApproved ? 'Aprobado' : 'Pendiente'}
            </span>
          </div>
        </div>
        
        {showActions && (
          <div className="flex gap-2 ml-4">
            {!user.isApproved && (
              <>
                <button
                  onClick={() => handleApprove(user.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprobar
                </button>
                <button
                  onClick={() => handleReject(user.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Panel de Administración</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Gestiona usuarios, aprobaciones y configuraciones del sistema</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700' : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-neutral-200 dark:border-neutral-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'text-cactus-600 dark:text-cactus-400 border-current'
                  : 'border-transparent text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-current'
              }`}
            >
              Solicitudes Pendientes
              {pendingUsers.length > 0 && (
                <span className="ml-2 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {pendingUsers.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'text-cactus-600 dark:text-cactus-400 border-current'
                  : 'border-transparent text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-current'
              }`}
            >
              Todos los Usuarios
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'approvals'
                  ? 'text-emerald-600 dark:text-emerald-400 border-current'
                  : 'border-transparent text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-current'
              }`}
            >
              Gestión de Aprobaciones
              {approvalRequests.filter(req => req.status === 'pending').length > 0 && (
                <span className="ml-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {approvalRequests.filter(req => req.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('management')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'management'
                  ? 'text-cactus-600 dark:text-cactus-400 border-current'
                  : 'border-transparent text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-current'
              }`}
            >
              Gestión del Sistema
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'report'
                  ? 'text-cactus-600 dark:text-cactus-400 border-current'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              Informes
            </button>
          </nav>
        </div>

        {activeTab === 'pending' && (
          <div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-300">
                  Solicitudes de Manager Pendientes ({pendingUsers.length})
                </h2>
              </div>
              <p className="text-amber-700 dark:text-amber-400 mt-1">
                Revisa y aprueba las solicitudes de usuarios que desean convertirse en managers.
              </p>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="w-16 h-16 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200 mb-2">No hay solicitudes pendientes</h3>
                <p className="text-neutral-600 dark:text-neutral-400">Todas las solicitudes han sido procesadas.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pendingUsers.map((user) => (
                  <UserCard key={user.id} user={user} showActions={true} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div>
            <div className="bg-cactus-50 dark:bg-cactus-900/20 border border-cactus-200 dark:border-cactus-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
                <h2 className="text-lg font-semibold text-cactus-800 dark:text-cactus-300">
                  Todos los Usuarios ({allUsers.length})
                </h2>
              </div>
              <p className="text-cactus-700 dark:text-cactus-400 mt-1">
                Vista general de todos los usuarios registrados en el sistema.
              </p>
            </div>

            {allUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200 mb-2">No hay usuarios registrados</h3>
                <p className="text-neutral-600 dark:text-neutral-400">Aún no se han registrado usuarios en el sistema.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {allUsers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'approvals' && (
          <div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                  Gestión de Aprobaciones
                </h2>
              </div>
              <p className="text-emerald-700 dark:text-emerald-400 mt-1">
                Administra todas las solicitudes de aprobación del sistema.
              </p>
            </div>

            {/* Estadísticas de Aprobaciones */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Pendientes</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {approvalRequests.filter(req => req.status === 'pending').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Aprobadas</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {approvalRequests.filter(req => req.status === 'approved').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Rechazadas</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {approvalRequests.filter(req => req.status === 'rejected').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cactus-100 dark:bg-cactus-900/20 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Total</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {approvalRequests.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Solicitudes de Aprobación */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-700">
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Solicitudes de Aprobación</h3>
              </div>
              
              {approvalRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200 mb-2">No hay solicitudes</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">No se han encontrado solicitudes de aprobación.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {approvalRequests.map((request) => {
                    const user = allUsers.find(u => u.id === request.user_id);
                    return (
                      <div key={request.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-cactus-100 dark:bg-cactus-900/20 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
                              </div>
                              <div>
                                <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                                  {user?.name || 'Usuario no encontrado'}
                                </h4>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">{user?.email}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                request.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300' :
                                request.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' :
                                'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                              }`}>
                                {request.status === 'pending' ? 'Pendiente' :
                                 request.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                              <div>
                                <span className="font-medium text-neutral-700 dark:text-neutral-300">Tipo:</span>
                                <span className="ml-2 text-neutral-600 dark:text-neutral-400">{request.request_type}</span>
                              </div>
                              <div>
                                <span className="font-medium text-neutral-700 dark:text-neutral-300">Prioridad:</span>
                                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                  request.priority === 'high' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' :
                                  request.priority === 'medium' ? 'bg-cactus-100 dark:bg-cactus-900/20 text-cactus-800 dark:text-cactus-300' :
                                  'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300'
                                }`}>
                                  {request.priority === 'high' ? 'Alta' :
                                   request.priority === 'medium' ? 'Media' : 'Baja'}
                                </span>
                              </div>
                            </div>
                            
                            {request.justification && (
                              <div className="mb-3">
                                <span className="font-medium text-neutral-700 dark:text-neutral-300">Justificación:</span>
                                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-md">
                                  {request.justification}
                                </p>
                              </div>
                            )}
                            
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              Solicitado el {new Date(request.created_at).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                          
                          {request.status === 'pending' && (
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleApproveRequest(request.id)}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Aprobar
                              </button>
                              <button
                                onClick={() => handleRejectRequest(request.id)}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                                Rechazar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'management' && (
          <div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
                  Gestión del Sistema
                </h2>
              </div>
              <p className="text-red-700 dark:text-red-400 mt-1">
                Herramientas avanzadas para la administración del sistema. Usar con precaución.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Eliminar Pendientes</h3>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Elimina todos los usuarios pendientes de aprobación.
                </p>
                <button
                  onClick={() => openSystemModal('deletePending')}
                  disabled={isLoading || pendingUsers.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Pendientes ({pendingUsers.length})
                </button>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Reiniciar Sistema</h3>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Reinicia el sistema manteniendo la configuración básica.
                </p>
                <button
                  onClick={() => openSystemModal('resetSystem')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reiniciar Sistema
                </button>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <Database className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Limpiar Base de Datos</h3>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Elimina TODOS los datos del sistema. Esta acción es irreversible.
                </p>
                <button
                  onClick={() => openSystemModal('clearDatabase')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Database className="w-4 h-4" />
                  Limpiar Base de Datos
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div>
            <div className="bg-cactus-50 dark:bg-cactus-900/20 border border-cactus-200 dark:border-cactus-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
                  <h2 className="text-lg font-semibold text-cactus-800 dark:text-cactus-300">
                    Informe Detallado de Usuarios ({allUsers.length})
                  </h2>
                </div>
                <button
                  onClick={exportUserReport}
                  disabled={allUsers.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-cactus-600 hover:bg-cactus-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
              </div>
              <p className="text-cactus-700 dark:text-cactus-400 mt-1">
                Informe completo de todos los usuarios registrados en el sistema con sus roles y estado de aprobación.
              </p>
            </div>

            {/* Estadísticas Generales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cactus-100 dark:bg-cactus-900/20 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Usuarios</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{allUsers.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Usuarios Aprobados</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{allUsers.filter(u => u.isApproved).length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cactus-100 dark:bg-cactus-900/20 rounded-full flex items-center justify-center">
                    <Settings className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Managers</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{allUsers.filter(u => u.role === 'manager').length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Pendientes</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{pendingUsers.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla Detallada de Usuarios */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Lista Completa de Usuarios</h3>
              </div>
              
              {allUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">No hay usuarios registrados</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">Aún no se han registrado usuarios en el sistema.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Usuario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Rol
                        </th>

                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Departamento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Fecha Registro
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                      {allUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-cactus-100 dark:bg-cactus-900/20 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{user.name}</div>
                                <div className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'manager' 
                                ? 'bg-cactus-100 dark:bg-cactus-900/20 text-cactus-800 dark:text-cactus-300' 
                                : 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                            }`}>
                              {user.role === 'manager' ? 'Manager' : 'Asesor'}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100">
                            {user.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isApproved 
                                ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' 
                                : 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
                            }`}>
                              {user.isApproved ? 'Aprobado' : 'Pendiente'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date().toLocaleDateString('es-ES')}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-neutral-200 dark:border-neutral-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-cactus-500 text-cactus-600 dark:text-cactus-400'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Solicitudes Pendientes ({pendingUsers.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-cactus-500 text-cactus-600 dark:text-cactus-400'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Todos los Usuarios ({allUsers.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('management')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'management'
                    ? 'border-cactus-500 text-cactus-600 dark:text-cactus-400'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Gestión de Datos
                </div>
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'approvals'
                    ? 'border-cactus-500 text-cactus-600 dark:text-cactus-400'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Gestión de Aprobaciones ({approvalRequests.filter(req => req.status === 'pending').length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'report'
                    ? 'border-cactus-500 text-cactus-600 dark:text-cactus-400'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Informe de Usuarios
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'pending' && (
          <div>
            {pendingUsers.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">No hay solicitudes pendientes</h3>
                <p className="text-neutral-600 dark:text-neutral-400">Todas las solicitudes de manager han sido procesadas.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                <div className="bg-cactus-50 dark:bg-cactus-900/20 border border-cactus-200 dark:border-cactus-700 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
                    <h2 className="text-lg font-semibold text-cactus-800 dark:text-cactus-300">
                      Solicitudes de Manager Pendientes ({pendingUsers.length})
                    </h2>
                  </div>
                  <p className="text-cactus-700 dark:text-cactus-400 mt-1">
                    Estas cuentas requieren tu aprobación antes de poder acceder al sistema.
                  </p>
                </div>
                
                {pendingUsers.map((user) => (
                  <UserCard key={user.id} user={user} showActions={true} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div>
            <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Todos los Usuarios ({allUsers.length})
                </h2>
              </div>
              <p className="text-neutral-700 dark:text-neutral-400 mt-1">
                Vista general de todos los usuarios registrados en el sistema.
              </p>
            </div>
            
            <div className="grid gap-6">
              {allUsers.map((user) => (
                <UserCard key={user.id} user={user} showActions={true} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                  Gestión de Aprobaciones ({approvalRequests.length})
                </h2>
              </div>
              <p className="text-emerald-700 dark:text-emerald-400 mt-1">
                Administra todas las solicitudes de aprobación del sistema.
              </p>
            </div>
            
            {/* Approval Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Pendientes</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {approvalRequests.filter(req => req.status === 'pending').length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-400 dark:text-amber-500" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Aprobadas</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {approvalRequests.filter(req => req.status === 'approved').length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-400 dark:text-emerald-500" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Rechazadas</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {approvalRequests.filter(req => req.status === 'rejected').length}
                    </p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-400 dark:text-red-500" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total</p>
                    <p className="text-2xl font-bold text-cactus-600 dark:text-cactus-400">
                      {approvalRequests.length}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-cactus-400 dark:text-cactus-500" />
                </div>
              </div>
            </div>
            
            {/* Approval Requests List */}
            <div className="grid gap-6">
              {approvalRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">No hay solicitudes de aprobación</h3>
                  <p className="text-neutral-600 dark:text-neutral-400">Todas las solicitudes han sido procesadas.</p>
                </div>
              ) : (
                approvalRequests.map((request) => {
                  const user = allUsers.find(u => u.id === request.user_id);
                  if (!user) return null;
                  
                  return (
                    <div key={request.id} className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-cactus-100 dark:bg-cactus-900/20 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-cactus-600 dark:text-cactus-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{user.name}</h3>
                            <p className="text-neutral-600 dark:text-neutral-400">{user.email}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          request.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' :
                          request.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' :
                          'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300'
                        }`}>
                          {request.status === 'approved' ? 'Aprobada' :
                           request.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Tipo de solicitud</p>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {request.request_type === 'role_upgrade' ? 'Actualización de Rol' : 'Nuevo Registro'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Rol solicitado</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            user.role === 'manager' ? 'bg-cactus-100 dark:bg-cactus-900/20 text-cactus-800 dark:text-cactus-300 border-cactus-200 dark:border-cactus-700' : 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                          }`}>
                            {user.role === 'manager' ? 'Manager' : 'Asesor'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Prioridad</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            request.priority === 'high' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' :
                            request.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300' :
                            'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                          }`}>
                            {request.priority === 'high' ? 'Alta' : 
                             request.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                        </div>
                      </div>
                      
                      {request.justification && (
                        <div className="mb-4">
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Justificación</p>
                          <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                            <p className="text-neutral-900 dark:text-neutral-100">{request.justification}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
                        <p>Solicitado el {new Date(request.created_at).toLocaleDateString('es-ES')}</p>
                        
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveRequest(request.id)}
                              disabled={isLoading || approvalLoading}
                              className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id)}
                              disabled={isLoading || approvalLoading}
                              className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'management' && (
          <div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
                  Gestión de Datos del Sistema
                </h2>
              </div>
              <p className="text-red-700 dark:text-red-400 mt-1">
                ⚠️ Estas acciones son irreversibles. Úsalas con extrema precaución.
              </p>
            </div>
            
            <div className="grid gap-6">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6 border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Eliminar Usuarios Pendientes</h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Elimina todos los usuarios que están pendientes de aprobación.
                </p>
                <button
                  onClick={() => openSystemModal('deletePending')}
                  disabled={isLoading || pendingUsers.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Usuarios Pendientes ({pendingUsers.length})
                </button>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6 border border-red-200 dark:border-red-700">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-4">Resetear Sistema Completo</h3>
                <p className="text-red-700 dark:text-red-400 mb-4">
                  ⚠️ Esta acción eliminará TODOS los usuarios excepto el administrador y TODOS los datos del sistema.
                  Esta acción es completamente irreversible.
                </p>
                <button
                  onClick={() => openSystemModal('resetSystem')}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Database className="w-4 h-4" />
                  Resetear Sistema Completo
                </button>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-600 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-4">Limpiar Base de Datos Completa</h3>
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-700 dark:text-red-400">
                      <p className="font-semibold mb-2">⚠️ ADVERTENCIA EXTREMA ⚠️</p>
                      <p className="mb-2">
                        Esta acción eliminará <strong>ABSOLUTAMENTE TODO</strong> del sistema:
                      </p>
                      <ul className="list-disc list-inside space-y-1 mb-2">
                        <li>TODOS los usuarios (incluyendo el administrador)</li>
                        <li>TODAS las credenciales de acceso</li>
                        <li>TODOS los datos del CRM</li>
                        <li>TODAS las métricas y estadísticas</li>
                        <li>TODO el historial del sistema</li>
                      </ul>
                      <p className="font-semibold text-red-800 dark:text-red-300">
                        Después de esta acción, será necesario crear nuevamente un usuario administrador desde cero.
                        Esta acción es COMPLETAMENTE IRREVERSIBLE.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openSystemModal('clearDatabase')}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-2 border-red-300 dark:border-red-600"
                >
                  <Database className="w-4 h-4" />
                  Limpiar Base de Datos Completa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Modal */}
        {showDeleteModal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {showDeleteModal.type === 'delete' ? 'Eliminar Usuario' : 'Eliminar Todos los Datos'}
                </h3>
              </div>
              
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                {showDeleteModal.type === 'delete' 
                  ? `¿Estás seguro de que quieres eliminar al usuario "${showDeleteModal.userName}"? Esta acción no se puede deshacer.`
                  : `¿Estás seguro de que quieres eliminar TODOS los datos del usuario "${showDeleteModal.userName}"? Esto incluye el usuario y todos sus contactos asociados. Esta acción no se puede deshacer.`
                }
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-400 mb-2">
                  Para confirmar, escribe "ELIMINAR" en mayúsculas:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  placeholder="ELIMINAR"
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal({ show: false, userId: '', userName: '', type: 'delete' });
                    setConfirmText('');
                  }}
                  className="px-4 py-2 text-neutral-700 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-700 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={showDeleteModal.type === 'delete' ? handleDeleteUser : handleDeleteAllUserData}
                  disabled={confirmText !== 'ELIMINAR' || isLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Action Modal */}
        {showSystemModal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {showSystemModal.type === 'resetSystem' 
                    ? 'Resetear Sistema' 
                    : showSystemModal.type === 'clearDatabase'
                    ? 'Limpiar Base de Datos Completa'
                    : 'Eliminar Usuarios Pendientes'
                  }
                </h3>
              </div>
              
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                {showSystemModal.type === 'resetSystem'
                  ? '⚠️ Esta acción eliminará TODOS los usuarios excepto el administrador y TODOS los datos del sistema. Esta acción es completamente irreversible.'
                  : showSystemModal.type === 'clearDatabase'
                  ? '⚠️ ESTA ACCIÓN ELIMINARÁ ABSOLUTAMENTE TODO DEL SISTEMA, incluyendo TODOS los usuarios (incluyendo el administrador), TODAS las credenciales, TODOS los datos del CRM y TODAS las métricas. Será necesario crear un nuevo administrador desde cero. ESTA ACCIÓN ES COMPLETAMENTE IRREVERSIBLE.'
                  : `¿Estás seguro de que quieres eliminar todos los usuarios pendientes (${pendingUsers.length})? Esta acción no se puede deshacer.`
                }
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-400 mb-2">
                  Para confirmar, escribe "{showSystemModal.type === 'resetSystem' 
                    ? 'CONFIRMAR' 
                    : showSystemModal.type === 'clearDatabase'
                    ? 'LIMPIAR TODO'
                    : 'CONFIRMAR'
                  }" en mayúsculas:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  placeholder={showSystemModal.type === 'resetSystem' 
                    ? 'CONFIRMAR' 
                    : showSystemModal.type === 'clearDatabase'
                    ? 'LIMPIAR TODO'
                    : 'CONFIRMAR'
                  }
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowSystemModal({ show: false, type: 'resetSystem' });
                    setConfirmText('');
                  }}
                  className="px-4 py-2 text-neutral-700 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-700 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSystemAction}
                  disabled={confirmText !== (showSystemModal.type === 'resetSystem' 
                    ? 'CONFIRMAR' 
                    : showSystemModal.type === 'clearDatabase'
                    ? 'LIMPIAR TODO'
                    : 'CONFIRMAR'
                  ) || isLoading}
                  className={`px-4 py-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    showSystemModal.type === 'clearDatabase' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isLoading ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;