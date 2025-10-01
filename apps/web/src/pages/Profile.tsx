import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Calendar, Save, Lock, Camera, Edit2, Crown, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useApprovalStore } from '../store/approvalStore';
import { useNotificationStore } from '../store/notificationStore';
import { toast } from 'sonner';

interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  joinDate: string;
  avatar?: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface Preferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  darkMode: boolean;
  language: string;
  timezone: string;
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { createApprovalRequest } = useApprovalStore();
  const { createNotification } = useNotificationStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showManagerRequestModal, setShowManagerRequestModal] = useState(false);
  const [justificacionSolicitud, setJustificacionSolicitud] = useState('');
  const [profile, setProfile] = useState<UserProfile>({
    fullName: user?.name || 'Usuario Demo',
    email: user?.email || 'usuario@company.com',
    phone: '+34 600 123 456',
    role: user?.role === 'advisor' ? 'Asesor' : 'Manager',
    joinDate: '2024-01-15',
    avatar: undefined
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState<Preferences>({
    emailNotifications: true,
    smsNotifications: false,
    darkMode: false,
    language: 'es',
    timezone: 'Europe/Madrid'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const handleProfileSave = () => {
    const newErrors: { [key: string]: string } = {};

    if (!profile.fullName.trim()) {
      newErrors.fullName = 'El nombre completo es requerido';
    }
    if (!profile.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Aquí se implementaría la lógica para guardar el perfil
      setIsEditing(false);
      setSuccessMessage('Perfil actualizado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handlePasswordChange = () => {
    const newErrors: { [key: string]: string } = {};

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = 'La contraseña actual es requerida';
    }
    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'La nueva contraseña es requerida';
    } else if (passwordForm.newPassword.length < 6) {
      newErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Aquí se implementaría la lógica para cambiar la contraseña
      setShowPasswordForm(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccessMessage('Contraseña actualizada correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handlePreferencesSave = () => {
    // Aquí se implementaría la lógica para guardar las preferencias
    setSuccessMessage('Preferencias guardadas correctamente');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSolicitarManager = async () => {
    if (!user || !justificacionSolicitud.trim()) {
      toast.error('Por favor, proporciona una justificación para tu solicitud');
      return;
    }

    try {
      await createApprovalRequest(user.id, 'manager');
      
      toast.success('Solicitud enviada correctamente. Recibirás una notificación cuando sea revisada.');
      setShowManagerRequestModal(false);
      setJustificacionSolicitud('');
    } catch (error) {
      toast.error('Error al enviar la solicitud. Inténtalo de nuevo.');
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfile(prev => ({ ...prev, avatar: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-cactus-gradient p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-cactus-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-cactus-primary flex items-center">
                <User className="mr-3" size={28} />
                Mi Perfil
              </h1>
              <p className="text-cactus-secondary mt-1">Gestiona tu información personal y preferencias</p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-cactus-600 hover:bg-cactus-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <Edit2 className="mr-2" size={20} />
                Editar Perfil
              </button>
            )}
          </div>
        </div>

        {/* Mensaje de éxito */}
        {successMessage && (
          <div className="bg-cactus-100 border border-cactus-300 text-cactus-800 px-4 py-3 rounded-lg animate-fade-in">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información del perfil */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos personales */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-cactus-200">
              <h2 className="text-lg font-semibold text-cactus-primary mb-4">Información Personal</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cactus-700 mb-1">Nombre Completo</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500 ${
                        errors.fullName ? 'border-error' : 'border-cactus-300'
                      }`}
                    />
                  ) : (
                    <p className="text-cactus-800 font-medium flex items-center">
                      <User className="mr-2" size={16} />
                      {profile.fullName}
                    </p>
                  )}
                  {errors.fullName && <p className="text-error text-xs mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-cactus-700 mb-1">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500 ${
                        errors.email ? 'border-error' : 'border-cactus-300'
                      }`}
                    />
                  ) : (
                    <p className="text-cactus-800 font-medium flex items-center">
                      <Mail className="mr-2" size={16} />
                      {profile.email}
                    </p>
                  )}
                  {errors.email && <p className="text-error text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-cactus-700 mb-1">Teléfono</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-cactus-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500"
                    />
                  ) : (
                    <p className="text-cactus-800 font-medium flex items-center">
                      <Phone className="mr-2" size={16} />
                      {profile.phone}
                    </p>
                  )}
                </div>



                <div>
                  <label className="block text-sm font-medium text-cactus-700 mb-1">Rol</label>
                  <p className="text-cactus-800 font-medium">{profile.role}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cactus-700 mb-1">Fecha de Ingreso</label>
                  <p className="text-cactus-800 font-medium flex items-center">
                    <Calendar className="mr-2" size={16} />
                    {new Date(profile.joinDate).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-cactus-600 hover:bg-cactus-50 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleProfileSave}
                    className="px-4 py-2 bg-cactus-600 hover:bg-cactus-700 text-white rounded-lg flex items-center transition-colors"
                  >
                    <Save className="mr-2" size={16} />
                    Guardar Cambios
                  </button>
                </div>
              )}
            </div>

            {/* Solicitud de Manager */}
            {user?.role === 'advisor' && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-cactus-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Crown className="mr-3 text-sunlight-600" size={24} />
                    <div>
                      <h2 className="text-lg font-semibold text-cactus-primary">Solicitar Promoción</h2>
                      <p className="text-sm text-cactus-600">Solicita ser promovido a Manager</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowManagerRequestModal(true)}
                    className="bg-sunlight-500 hover:bg-sunlight-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                  >
                    <Crown className="mr-2" size={16} />
                    Solicitar ser Manager
                  </button>
                </div>
                <p className="text-sm text-cactus-600">
                  Como Advisor, puedes solicitar una promoción a Manager. Tu solicitud será revisada por los administradores.
                </p>
              </div>
            )}

            {/* Cambio de contraseña */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-cactus-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-cactus-primary">Seguridad</h2>
                {!showPasswordForm && (
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="bg-terracotta-600 hover:bg-terracotta-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                  >
                    <Lock className="mr-2" size={16} />
                    Cambiar Contraseña
                  </button>
                )}
              </div>

              {showPasswordForm && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-cactus-700 mb-1">Contraseña Actual</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500 ${
                        errors.currentPassword ? 'border-error' : 'border-cactus-300'
                      }`}
                    />
                    {errors.currentPassword && <p className="text-error text-xs mt-1">{errors.currentPassword}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cactus-700 mb-1">Nueva Contraseña</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500 ${
                        errors.newPassword ? 'border-error' : 'border-cactus-300'
                      }`}
                    />
                    {errors.newPassword && <p className="text-error text-xs mt-1">{errors.newPassword}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-cactus-700 mb-1">Confirmar Nueva Contraseña</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500 ${
                        errors.confirmPassword ? 'border-error' : 'border-cactus-300'
                      }`}
                    />
                    {errors.confirmPassword && <p className="text-error text-xs mt-1">{errors.confirmPassword}</p>}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowPasswordForm(false)}
                      className="px-4 py-2 text-cactus-600 hover:bg-cactus-50 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handlePasswordChange}
                      className="px-4 py-2 bg-terracotta-600 hover:bg-terracotta-700 text-white rounded-lg transition-colors"
                    >
                      Actualizar Contraseña
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar con avatar y preferencias */}
          <div className="space-y-6">
            {/* Avatar */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-cactus-200">
              <h3 className="text-lg font-semibold text-cactus-primary mb-4">Foto de Perfil</h3>
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-cactus-gradient rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-cactus-600" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-cactus-600 hover:bg-cactus-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                    <Camera size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-cactus-600">Haz clic en el ícono para cambiar tu foto</p>
              </div>
            </div>

            {/* Preferencias */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-cactus-200">
              <h3 className="text-lg font-semibold text-cactus-primary mb-4">Preferencias</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-cactus-700">Notificaciones por Email</label>
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={(e) => setPreferences(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                    className="w-4 h-4 text-cactus-600 bg-white border-neutral-300 rounded focus:ring-cactus-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-cactus-700">Notificaciones por SMS</label>
                  <input
                    type="checkbox"
                    checked={preferences.smsNotifications}
                    onChange={(e) => setPreferences(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                    className="w-4 h-4 text-cactus-600 bg-white border-neutral-300 rounded focus:ring-cactus-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cactus-700 mb-1">Idioma</label>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-3 py-2 border border-cactus-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cactus-700 mb-1">Zona Horaria</label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full px-3 py-2 border border-cactus-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500"
                  >
                    <option value="Europe/Madrid">Madrid (GMT+1)</option>
                    <option value="Europe/London">London (GMT+0)</option>
                    <option value="America/New_York">New York (GMT-5)</option>
                  </select>
                </div>

                <button
                  onClick={handlePreferencesSave}
                  className="w-full bg-desert-600 hover:bg-desert-700 text-white py-2 rounded-lg transition-colors"
                >
                  Guardar Preferencias
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación para Solicitud de Manager */}
      {showManagerRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="mr-3 text-sunlight-600" size={24} />
              <h3 className="text-lg font-semibold text-cactus-primary">Confirmar Solicitud</h3>
            </div>
            
            <p className="text-cactus-600 mb-4">
              ¿Estás seguro de que deseas solicitar ser promovido a Manager? Esta solicitud será enviada a los administradores para su revisión.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-cactus-700 mb-2">
                Justificación (opcional)
              </label>
              <textarea
                value={justificacionSolicitud}
                onChange={(e) => setJustificacionSolicitud(e.target.value)}
                placeholder="Explica por qué consideras que deberías ser promovido a Manager..."
                className="w-full px-3 py-2 border border-cactus-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cactus-500 resize-none"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowManagerRequestModal(false);
                  setJustificacionSolicitud('');
                }}
                className="px-4 py-2 text-cactus-600 hover:bg-cactus-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSolicitarManager}
                className="px-4 py-2 bg-sunlight-500 hover:bg-sunlight-600 text-white rounded-lg flex items-center transition-colors"
              >
                <Crown className="mr-2" size={16} />
                Enviar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;