import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, User, Mail, Calendar, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../utils/permissions';
import { cn } from '../../lib/utils';

interface PendingUser {
  id: string;
  name: string;
  email?: string;
  role: 'advisor' | 'manager' | 'admin';
  requestedAt: string;
  department?: string;
  experience?: string;
}

const Approvals: React.FC = () => {
  const { getPendingUsers, approveUser, rejectUser } = useAuthStore();
  const { canApproveUsers } = usePermissions();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      setLoading(true);
      const users = await getPendingUsers();
      const pendingUsersWithRequestDate = users.map(user => ({
        ...user,
        requestedAt: user.createdAt || new Date().toISOString()
      }));
      setPendingUsers(pendingUsersWithRequestDate);
    } catch (error) {
      console.error('Error loading pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!canApproveUsers) return;
    
    try {
      setProcessingId(userId);
      await approveUser(userId);
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error approving user:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!canApproveUsers) return;
    
    try {
      setProcessingId(userId);
      await rejectUser(userId);
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error rejecting user:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'advisor': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'manager': return 'Manager';
      case 'advisor': return 'Asesor';
      default: return role;
    }
  };

  if (!canApproveUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder al panel de aprobaciones.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Aprobaciones</h1>
        <p className="text-gray-600">Gestiona las solicitudes de registro pendientes</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes pendientes</h3>
          <p className="text-gray-600">Todas las solicitudes de registro han sido procesadas.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {pendingUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-gray-100 rounded-full p-3">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        getRoleColor(user.role)
                      )}>
                        {getRoleName(user.role)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      {user.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <span>{user.email}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Solicitado el {new Date(user.requestedAt).toLocaleDateString('es-ES')}</span>
                      </div>
                      {user.department && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Departamento:</span>
                          <span>{user.department}</span>
                        </div>
                      )}
                      {user.experience && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">Experiencia:</span>
                          <span>{user.experience}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={processingId === user.id}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Aprobar</span>
                  </button>
                  
                  <button
                    onClick={() => handleReject(user.id)}
                    disabled={processingId === user.id}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>
              
              {processingId === user.id && (
                <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>Procesando solicitud...</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Approvals;