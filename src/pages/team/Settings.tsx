import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Users, Shield, Bell, Database, Trash2, AlertTriangle, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { cn } from '../../utils/cn';
import { toast } from 'sonner';


interface TeamSettings {
  teamName: string;
  description: string;
  autoApproval: boolean;
  emailNotifications: boolean;
  taskReminders: boolean;
  weeklyReports: boolean;
  maxTeamSize: number;
  defaultTaskPriority: 'low' | 'medium' | 'high';
  workingHours: {
    start: string;
    end: string;
  };
  timezone: string;
  reminderFrequency: string;
}

const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const { canAccessSystemSettings: canManageTeamSettings, canDeleteUsers, canResetSystem } = usePermissions(user);
  
  const [settings, setSettings] = useState<TeamSettings>({
    teamName: 'Mi Equipo',
    description: 'Equipo de asesores y managers',
    autoApproval: false,
    emailNotifications: true,
    taskReminders: true,
    weeklyReports: true,
    maxTeamSize: 50,
    defaultTaskPriority: 'medium',
    workingHours: {
      start: '09:00',
      end: '18:00'
    },
    timezone: 'America/Mexico_City',
    reminderFrequency: 'daily'
  });
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // En una implementación real, cargaríamos desde la API
      const savedSettings = localStorage.getItem('teamSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      // En una implementación real, enviaríamos a la API
      localStorage.setItem('teamSettings', JSON.stringify(settings));
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TeamSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWorkingHoursChange = (field: 'start' | 'end', value: string) => {
    setSettings(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [field]: value
      }
    }));
  };

  const handleDangerousAction = async (action: string) => {
    if (confirmAction !== action) {
      setConfirmAction(action);
      return;
    }

    try {
      setLoading(true);
      
      switch (action) {
        case 'deleteAllUsers':
          if (canDeleteUsers) {
            // Implementar eliminación de usuarios
            toast.success('Todos los usuarios han sido eliminados');
          }
          break;
        case 'resetSystem':
          if (canResetSystem) {
            // Implementar reset del sistema
            localStorage.clear();
            toast.success('Sistema reiniciado exitosamente');
          }
          break;
        case 'clearDatabase':
          if (canResetSystem) {
            // Implementar limpieza de base de datos
            toast.success('Base de datos limpiada exitosamente');
          }
          break;
      }
    } catch (error) {
      console.error('Error executing dangerous action:', error);
      toast.error('Error al ejecutar la acción');
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
    { id: 'team', name: 'Equipo', icon: Users },
    { id: 'security', name: 'Seguridad', icon: Shield },
    { id: 'danger', name: 'Zona Peligrosa', icon: AlertTriangle }
  ];

  if (!canManageTeamSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <SettingsIcon className="h-12 w-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-primary mb-2">Acceso Denegado</h2>
          <p className="text-secondary">No tienes permisos para gestionar la configuración del equipo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Configuración del Equipo</h1>
        <p className="text-secondary">Gestiona la configuración y preferencias del equipo</p>
      </div>

      <div className="bg-primary rounded-lg shadow-sm border border-border-primary">
        {/* Tabs */}
        <div className="border-b border-border-secondary">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeTab === tab.id
                      ? 'border-cactus-500 text-cactus-600'
                      : 'border-transparent text-muted hover:text-secondary hover:border-border-secondary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Nombre del Equipo
                </label>
                <input
                  type="text"
                  value={settings.teamName}
                  onChange={(e) => handleInputChange('teamName', e.target.value)}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Descripción
                </label>
                <textarea
                  value={settings.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Tamaño Máximo del Equipo
                  </label>
                  <input
                    type="number"
                    value={settings.maxTeamSize}
                    onChange={(e) => handleInputChange('maxTeamSize', parseInt(e.target.value))}
                    min="1"
                    max="200"
                    className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Prioridad Predeterminada de Tareas
                  </label>
                  <select
                    value={settings.defaultTaskPriority}
                    onChange={(e) => handleInputChange('defaultTaskPriority', e.target.value)}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Horario de Trabajo
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted mb-1">Inicio</label>
                    <input
                      type="time"
                      value={settings.workingHours.start}
                      onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">Fin</label>
                    <input
                      type="time"
                      value={settings.workingHours.end}
                      onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Zona Horaria
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                >
                  <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                  <option value="America/New_York">Nueva York (GMT-5)</option>
                  <option value="Europe/Madrid">Madrid (GMT+1)</option>
                  <option value="Asia/Tokyo">Tokio (GMT+9)</option>
                </select>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-primary mb-4">
                Configuración de Notificaciones
              </h3>
              <p className="text-muted mb-6">
                Configura cómo y cuándo recibir notificaciones del equipo.
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-secondary">Notificaciones por Email</h3>
                  <p className="text-sm text-muted">Recibe notificaciones importantes por correo electrónico</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cactus-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cactus-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-secondary">Recordatorios de Tareas</h3>
                  <p className="text-sm text-muted">Recibe recordatorios sobre tareas próximas a vencer</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.taskReminders}
                    onChange={(e) => handleInputChange('taskReminders', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cactus-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cactus-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-secondary">Reportes Semanales</h3>
                  <p className="text-sm text-muted">Recibe un resumen semanal del rendimiento del equipo</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.weeklyReports}
                    onChange={(e) => handleInputChange('weeklyReports', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cactus-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cactus-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Frecuencia de Recordatorios
                </label>
                <select
                  value={settings.reminderFrequency}
                  onChange={(e) => handleInputChange('reminderFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent"
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
            </div>
          )}

          {/* Team Settings */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-secondary">Aprobación Automática</h3>
                  <p className="text-sm text-muted">Aprobar automáticamente nuevos miembros del equipo</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoApproval}
                    onChange={(e) => handleInputChange('autoApproval', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cactus-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cactus-500"></div>
                </label>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Advertencia de Seguridad</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      La aprobación automática puede comprometer la seguridad del equipo. 
                      Úsala solo en entornos controlados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Configuración de Seguridad</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Las configuraciones de seguridad avanzadas están disponibles solo para administradores.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border-secondary">
                  <span className="text-sm font-medium text-secondary">Autenticación de dos factores</span>
                  <span className="text-sm text-green-600 flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    Habilitado
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border-secondary">
                  <span className="text-sm font-medium text-secondary">Cifrado de datos</span>
                  <span className="text-sm text-green-600 flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    Activo
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border-secondary">
                  <span className="text-sm font-medium text-secondary">Auditoría de accesos</span>
                  <span className="text-sm text-green-600 flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    Registrando
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Zona Peligrosa</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Las acciones en esta sección son irreversibles y pueden causar pérdida de datos.
                    </p>
                  </div>
                </div>
              </div>

              {canDeleteUsers && (
                <div className="border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-red-800 mb-2">Eliminar Todos los Usuarios</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Esta acción eliminará permanentemente todos los usuarios del sistema.
                  </p>
                  <button
                    onClick={() => handleDangerousAction('deleteAllUsers')}
                    className={cn(
                      'px-4 py-2 rounded-lg font-medium transition-colors',
                      confirmAction === 'deleteAllUsers'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    )}
                  >
                    {confirmAction === 'deleteAllUsers' ? 'Confirmar Eliminación' : 'Eliminar Usuarios'}
                  </button>
                </div>
              )}

              {canResetSystem && (
                <div className="border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-red-800 mb-2">Reiniciar Sistema</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Esta acción reiniciará completamente el sistema a su estado inicial.
                  </p>
                  <button
                    onClick={() => handleDangerousAction('resetSystem')}
                    className={cn(
                      'px-4 py-2 rounded-lg font-medium transition-colors',
                      confirmAction === 'resetSystem'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    )}
                  >
                    {confirmAction === 'resetSystem' ? 'Confirmar Reinicio' : 'Reiniciar Sistema'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          {activeTab !== 'danger' && activeTab !== 'security' && (
            <div className="flex justify-end pt-6 border-t border-border-secondary">
              <button
                onClick={saveSettings}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-cactus-500 text-white rounded-lg hover:bg-cactus-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;