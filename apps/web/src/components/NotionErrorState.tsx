/**
 * Componente de estado de error optimizado para Notion CRM
 * Proporciona manejo de errores mejorado con acciones de recuperación
 */

import React from 'react';
import { AlertTriangle, RefreshCw, ExternalLink, Settings } from 'lucide-react';

interface NotionErrorStateProps {
  error: string;
  type?: 'connection' | 'auth' | 'sync' | 'general';
  onRetry?: () => void;
  onConfigure?: () => void;
  className?: string;
}

const NotionErrorState: React.FC<NotionErrorStateProps> = ({
  error,
  type = 'general',
  onRetry,
  onConfigure,
  className = ''
}) => {
  const getErrorConfig = () => {
    switch (type) {
      case 'connection':
        return {
          title: 'Error de Conexión',
          description: 'No se pudo conectar con Notion. Verifica tu conexión a internet.',
          color: 'red',
          icon: <AlertTriangle className="w-8 h-8 text-red-500" />
        };
      case 'auth':
        return {
          title: 'Error de Autenticación',
          description: 'Tu sesión con Notion ha expirado o no tienes permisos.',
          color: 'orange',
          icon: <Settings className="w-8 h-8 text-orange-500" />
        };
      case 'sync':
        return {
          title: 'Error de Sincronización',
          description: 'No se pudieron sincronizar los datos con Notion.',
          color: 'yellow',
          icon: <RefreshCw className="w-8 h-8 text-yellow-500" />
        };
      default:
        return {
          title: 'Error Inesperado',
          description: 'Ha ocurrido un error inesperado.',
          color: 'red',
          icon: <AlertTriangle className="w-8 h-8 text-red-500" />
        };
    }
  };

  const config = getErrorConfig();
  const bgColor = `bg-${config.color}-50 border-${config.color}-200`;
  const textColor = `text-${config.color}-800`;
  const buttonColor = `bg-${config.color}-500 hover:bg-${config.color}-600`;

  return (
    <div className={`flex flex-col items-center justify-center p-8 rounded-lg border-2 ${bgColor} ${className}`}>
      <div className="mb-4">
        {config.icon}
      </div>
      
      <h3 className={`text-lg font-semibold ${textColor} mb-2`}>
        {config.title}
      </h3>
      
      <p className="text-gray-600 text-center mb-2">
        {config.description}
      </p>
      
      <div className="bg-gray-100 rounded-md p-3 mb-6 max-w-md">
        <p className="text-sm text-gray-700 font-mono break-words">
          {error}
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className={`flex items-center space-x-2 px-4 py-2 ${buttonColor} text-white rounded-md hover:shadow-md transition-all duration-200`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        )}
        
        {onConfigure && (
          <button
            onClick={onConfigure}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md hover:shadow-md transition-all duration-200"
          >
            <Settings className="w-4 h-4" />
            <span>Configurar</span>
          </button>
        )}
        
        <a
          href="https://developers.notion.com/docs/getting-started"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md hover:shadow-md transition-all duration-200"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Documentación</span>
        </a>
      </div>
    </div>
  );
};

export default NotionErrorState;