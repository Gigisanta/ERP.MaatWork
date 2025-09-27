import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface RedirectConfigProps {
  onConfigUpdate?: (customUrl: string | null) => void;
}

const RedirectConfig: React.FC<RedirectConfigProps> = ({ onConfigUpdate }) => {
  const [customUrl, setCustomUrl] = useState('');
  const [currentConfig, setCurrentConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await fetch('/api/usuarios/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const config = data.configuracion || {};
        const url = config.custom_crm_url || '';
        setCurrentConfig(url);
        setCustomUrl(url);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!user?.id) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/notion/redirect/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customUrl: customUrl.trim() || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentConfig(customUrl.trim() || null);
        setMessage({ type: 'success', text: data.message });
        onConfigUpdate?.(customUrl.trim() || null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error guardando configuración' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    if (!user?.id) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/notion/redirect/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          resetToDefault: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        setCustomUrl('');
        setCurrentConfig(null);
        setMessage({ type: 'success', text: data.message });
        onConfigUpdate?.(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error restableciendo configuración' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  };

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid (means default)
    return url.startsWith('/');
  };

  const isValidUrl = validateUrl(customUrl);
  const hasChanges = customUrl.trim() !== (currentConfig || '');

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Configuración de Redirección</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900">Configuración de Redirección</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="customUrl" className="block text-sm font-medium text-gray-700 mb-2">
            URL de Redirección Personalizada
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Especifica dónde quieres ser redirigido después de conectar con Notion. 
            Deja vacío para usar la configuración por defecto.
          </p>
          <div className="relative">
            <input
              type="text"
              id="customUrl"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="/mi-crm-personalizado"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !isValidUrl ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              disabled={saving}
            />
            {customUrl && (
              <ExternalLink className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            )}
          </div>
          {!isValidUrl && (
            <p className="mt-1 text-sm text-red-600">
              La URL debe comenzar con '/'
            </p>
          )}
        </div>

        {currentConfig && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Configuración actual:</strong> {currentConfig}
            </p>
          </div>
        )}

        {message && (
          <div className={`border rounded-md p-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={saveConfiguration}
            disabled={saving || !isValidUrl || !hasChanges}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Guardando...' : 'Guardar'}</span>
          </button>

          {currentConfig && (
            <button
              onClick={resetToDefault}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Restablecer</span>
            </button>
          )}
        </div>

        <div className="text-xs text-gray-500">
          <p><strong>Ejemplos válidos:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>/notion-crm (página CRM por defecto)</li>
            <li>/dashboard (dashboard principal)</li>
            <li>/mi-crm-personalizado (página personalizada)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RedirectConfig;