import React, { useState, useEffect } from 'react';
import { Bug, X, Copy, Check } from 'lucide-react';
import { supabase } from '@cactus/database';
// import { LayoutConfig } from '../config/layoutConfig';

interface DebugInfo {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

interface DebugPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function DebugPanel({ isVisible, onClose }: DebugPanelProps) {
  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isVisible) {
      collectSystemInfo();
      setupConsoleInterception();
    }
  }, [isVisible]);

  const collectSystemInfo = async () => {
    try {
      const info = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'No configurado',
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurado' : 'No configurado',
        localStorage: Object.keys(localStorage).length,
        sessionStorage: Object.keys(sessionStorage).length,
        networkStatus: navigator.onLine ? 'Online' : 'Offline'
      };
      setSystemInfo(info);
    } catch (error) {
      console.error('Error recolectando información del sistema:', error);
    }
  };

  const setupConsoleInterception = () => {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error
    };

    console.log = (...args) => {
      originalConsole.log(...args);
      addDebugLog('info', args.join(' '), args);
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      addDebugLog('warn', args.join(' '), args);
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      addDebugLog('error', args.join(' '), args);
    };

    // Restaurar console original al cerrar
    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    };
  };

  const addDebugLog = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    const logEntry: DebugInfo = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    setDebugLogs(prev => [...prev.slice(-49), logEntry]); // Mantener solo los últimos 50 logs
  };

  const testSupabaseConnection = async () => {
    try {
      addDebugLog('info', 'Probando conexión con Supabase...');
      const { data, error } = await supabase.from('users').select('count').limit(1);
      
      if (error) {
        addDebugLog('error', 'Error en conexión Supabase', error);
      } else {
        addDebugLog('info', 'Conexión Supabase exitosa', data);
      }
    } catch (error) {
      addDebugLog('error', 'Error probando Supabase', error);
    }
  };

  const copyDebugInfo = async () => {
    const debugReport = {
      systemInfo,
      logs: debugLogs,
      timestamp: new Date().toISOString()
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(debugReport, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copiando debug info:', error);
    }
  };

  const clearLogs = () => {
    setDebugLogs([]);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <Bug className="h-5 w-5 text-cactus-600 dark:text-cactus-400 mr-2" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Panel de Debug</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Información del Sistema */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-neutral-900 dark:text-neutral-100 mb-3">Información del Sistema</h3>
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3 text-sm">
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(systemInfo, null, 2)}
              </pre>
            </div>
          </div>

          {/* Controles */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={testSupabaseConnection}
              className="px-3 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 transition-colors text-sm"
            >
              Probar Supabase
            </button>
            <button
              onClick={copyDebugInfo}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center"
            >
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? 'Copiado' : 'Copiar Info'}
            </button>
            <button
              onClick={clearLogs}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Limpiar Logs
            </button>
          </div>

          {/* Logs */}
          <div>
            <h3 className="text-md font-medium text-neutral-900 dark:text-neutral-100 mb-3">Logs de Debug ({debugLogs.length})</h3>
            <div className="bg-neutral-900 dark:bg-neutral-950 text-green-400 rounded-lg p-3 font-mono text-xs max-h-96 overflow-y-auto">
              {debugLogs.length === 0 ? (
                <p className="text-neutral-500 dark:text-neutral-400">No hay logs disponibles</p>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className={`mb-1 ${
                    log.level === 'error' ? 'text-red-400' : 
                    log.level === 'warn' ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="ml-2 uppercase text-xs">[{log.level}]</span>
                    <span className="ml-2">{log.message}</span>
                    {log.data && (
                      <pre className="ml-4 mt-1 text-xs text-gray-400 whitespace-pre-wrap">
                        {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : log.data}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}