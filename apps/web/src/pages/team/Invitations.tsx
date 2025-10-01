import React, { useEffect, useState } from 'react';
import { Send, Mail, Clock, CheckCircle, XCircle, Plus, RefreshCw, User } from 'lucide-react';
import { useInvitationsStore } from '../../store/invitationsStore';
import { usePermissions } from '../../utils/permissions';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';


interface InvitationForm {
  email: string;
  role: 'advisor' | 'manager';
  message: string;
}

const Invitations: React.FC = () => {
  const {
    invitations,
    loading,
    error,
    fetchInvitations,
    sendInvitation,
    resendInvitation,
    cancelInvitation
  } = useInvitationsStore();
  
  const { user } = useAuthStore();
  const permissions = usePermissions();
  const { canManageInvitations, isAdmin } = permissions;
  const canInviteUsers = canManageInvitations; // Alias for backward compatibility
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<InvitationForm>({
    email: '',
    role: 'advisor',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (canInviteUsers) {
      fetchInvitations();
    }
  }, [canInviteUsers, fetchInvitations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canInviteUsers) return;

    try {
      setSubmitting(true);
      await sendInvitation({
        email: formData.email,
        role: formData.role,
        message: formData.message || undefined
      });
      
      setFormData({ email: '', role: 'advisor', message: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error sending invitation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    try {
      setProcessingId(invitationId);
      await resendInvitation(invitationId);
    } catch (error) {
      console.error('Error resending invitation:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (invitationId: string) => {
    try {
      setProcessingId(invitationId);
      await cancelInvitation(invitationId);
    } catch (error) {
      console.error('Error canceling invitation:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300';
      case 'accepted': return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300';
      case 'expired': return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      case 'cancelled': return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300';
      default: return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'expired': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'accepted': return 'Aceptada';
      case 'expired': return 'Expirada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-cactus-100 dark:bg-cactus-900/20 text-cactus-700 dark:text-cactus-300';
      case 'advisor': return 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300';
      default: return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'manager': return 'Manager';
      case 'advisor': return 'Asesor';
      default: return role;
    }
  };

  if (!canInviteUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Mail className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Acceso Denegado</h2>
          <p className="text-neutral-600 dark:text-neutral-300">No tienes permisos para gestionar invitaciones.</p>
          
          {/* DEBUG INFO */}
          <div className="mt-6 p-4 bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-left max-w-md mx-auto">
            <h3 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">Debug Info:</h3>
            <div className="text-sm text-amber-600 dark:text-amber-400 space-y-1">
              <p><strong>Usuario:</strong> {user?.username || 'No definido'}</p>
              <p><strong>Email:</strong> {user?.email || 'No definido'}</p>
              <p><strong>Rol:</strong> {user?.role || 'No definido'}</p>
              <p><strong>Aprobado:</strong> {user?.isApproved ? 'Sí' : 'No'}</p>
              <p><strong>Es Admin:</strong> {isAdmin ? 'Sí' : 'No'}</p>
              <p><strong>Puede invitar:</strong> {canInviteUsers ? 'Sí' : 'No'}</p>
              <p><strong>Puede gestionar invitaciones:</strong> {canManageInvitations ? 'Sí' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Centro de Invitaciones</h1>
            <p className="text-neutral-600 dark:text-neutral-300">Invita nuevos miembros al equipo</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Invitación</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-8 bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Enviar Nueva Invitación</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
                  Email del invitado
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                  placeholder="ejemplo@empresa.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'advisor' | 'manager' }))}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="advisor">Asesor</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
                Mensaje personalizado (opcional)
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                rows={3}
                placeholder="Mensaje de bienvenida personalizado..."
              />
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? 'Enviando...' : 'Enviar Invitación'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="h-12 w-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">No hay invitaciones</h3>
          <p className="text-neutral-600 dark:text-neutral-300">Comienza enviando tu primera invitación al equipo.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-neutral-100 dark:bg-neutral-700 rounded-full p-3">
                    <User className="h-6 w-6 text-neutral-600 dark:text-neutral-300" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{invitation.email}</h3>
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        getRoleColor(invitation.role)
                      )}>
                        {getRoleName(invitation.role)}
                      </span>
                      <span className={cn(
                        'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                        getStatusColor(invitation.status)
                      )}>
                        {getStatusIcon(invitation.status)}
                        <span>{getStatusText(invitation.status)}</span>
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
                      <p>Enviada el {new Date(invitation.sentAt).toLocaleDateString('es-ES')}</p>
                      <p>Expira el {new Date(invitation.expiresAt).toLocaleDateString('es-ES')}</p>
                      {invitation.message && (
                        <p className="italic">\"${invitation.message}\"</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {invitation.status === 'pending' && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleResend(invitation.id)}
                      disabled={processingId === invitation.id}
                      className="flex items-center space-x-1 px-3 py-1 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-600 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className={cn('h-3 w-3', processingId === invitation.id && 'animate-spin')} />
                      <span>Reenviar</span>
                    </button>
                    <button
                      onClick={() => handleCancel(invitation.id)}
                      disabled={processingId === invitation.id}
                      className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <XCircle className="h-3 w-3" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Invitations;