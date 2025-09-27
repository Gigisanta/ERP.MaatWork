/**
 * Componente de estado de carga optimizado para Notion CRM
 * Proporciona feedback visual mejorado durante operaciones
 */

import React from 'react';
import { Loader2, Database, Zap } from 'lucide-react';

interface NotionLoadingStateProps {
  message?: string;
  type?: 'connecting' | 'syncing' | 'loading' | 'migrating';
  progress?: number;
  className?: string;
}

const NotionLoadingState: React.FC<NotionLoadingStateProps> = ({
  message = 'Cargando...',
  type = 'loading',
  progress,
  className = ''
}) => {
  const getIcon = () => {
    switch (type) {
      case 'connecting':
        return <Zap className="w-8 h-8 text-blue-500" />;
      case 'syncing':
        return <Database className="w-8 h-8 text-green-500" />;
      case 'migrating':
        return <Database className="w-8 h-8 text-purple-500" />;
      default:
        return <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'connecting':
        return 'bg-blue-50 border-blue-200';
      case 'syncing':
        return 'bg-green-50 border-green-200';
      case 'migrating':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 rounded-lg border-2 ${getBackgroundColor()} ${className}`}>
      <div className="mb-4">
        {getIcon()}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        {message}
      </h3>
      
      {progress !== undefined && (
        <div className="w-full max-w-xs mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progreso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Por favor espera...</span>
      </div>
    </div>
  );
};

export default NotionLoadingState;