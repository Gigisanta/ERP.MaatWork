import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Mail, Phone, User, Building, FileText, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useApprovalStore } from '../stores/approvalStore';
import { useNotificationStore } from '../stores/notificationStore';

const ApprovalPendingPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const { approvalRequests, fetchApprovalRequests, isLoading } = useApprovalStore();
  const { notifications, fetchNotifications } = useNotificationStore();

  // Redirect if user is not pending approval
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser.status !== 'pending') {
      navigate('/dashboard');
      return;
    }

    // Fetch user's approval request and notifications
    fetchApprovalRequests();
    fetchNotifications();
  }, [currentUser, navigate, fetchApprovalRequests, fetchNotifications]);

  // Find the current user's approval request
  const userApprovalRequest = approvalRequests.find(
    request => request.user_id === currentUser?.id && request.status === 'pending'
  );

  // Get relevant notifications
  const relevantNotifications = notifications.filter(
    notification => notification.user_id === currentUser?.id
  ).slice(0, 3);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cactus-50 to-cactus-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full mb-4">
            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Solicitud en Revisión
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300">
            Tu solicitud para rol de Manager está siendo revisada por un administrador
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          {/* User Info */}
          <div className="border-b border-neutral-200 dark:border-neutral-700 pb-6 mb-6">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Información de la Solicitud</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-cactus-500" />
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Nombre</p>
                  <p className="font-medium">{currentUser.name}</p>
                </div>
              </div>
              
              {currentUser.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-cactus-500" />
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Email</p>
                    <p className="font-medium">{currentUser.email}</p>
                  </div>
                </div>
              )}
              
              {currentUser.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-cactus-500" />
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Teléfono</p>
                    <p className="font-medium">{currentUser.phone}</p>
                  </div>
                </div>
              )}
              
              {currentUser.department && (
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-cactus-500" />
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Departamento</p>
                    <p className="font-medium">{currentUser.department}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Approval Request Details */}
          {userApprovalRequest && (
            <div className="border-b border-neutral-200 dark:border-neutral-700 pb-6 mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Detalles de la Solicitud</h3>
              
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                <div className="flex items-start space-x-3 mb-4">
                  <FileText className="w-5 h-5 text-neutral-500 dark:text-neutral-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Justificación</p>
                    <p className="text-neutral-900 dark:text-neutral-100">{userApprovalRequest.justification}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
                  <span>Solicitud enviada: {new Date(userApprovalRequest.created_at).toLocaleDateString('es-ES')}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Pendiente
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">¿Qué sigue?</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                  <Clock className="w-3 h-3 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">Revisión en Proceso</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Un administrador está revisando tu solicitud y la justificación proporcionada.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-sky-100 dark:bg-sky-900/20 rounded-full flex items-center justify-center mt-0.5">
                  <Mail className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">Notificación de Resultado</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Recibirás una notificación cuando se tome una decisión sobre tu solicitud.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mt-0.5">
                  <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">Acceso al Sistema</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Una vez aprobada, tendrás acceso completo con permisos de Manager.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Notifications */}
          {relevantNotifications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Notificaciones Recientes</h3>
              <div className="space-y-2">
                {relevantNotifications.map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div className="w-2 h-2 bg-sky-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{notification.title}</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300">{notification.message}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {new Date(notification.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleBackToLogin}
            className="flex-1 flex items-center justify-center px-6 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Login
          </button>
          
          <button
            onClick={handleLogout}
            className="flex-1 px-6 py-3 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-sm text-cactus-600">
            ¿Tienes preguntas? Contacta al administrador del sistema para más información.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApprovalPendingPage;