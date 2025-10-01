import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface EmailDiagnosticProps {
  email?: string;
  className?: string;
}

const EmailDiagnostic: React.FC<EmailDiagnosticProps> = ({ email, className = '' }) => {
  // TODO: Descomentar cuando checkEmailConfiguration esté completamente implementado
  // const { checkEmailConfiguration } = useAuthStore();
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      // TODO: Descomentar cuando checkEmailConfiguration esté completamente implementado
      // const info = await checkEmailConfiguration();
      // setDiagnosticInfo(info);
      
      // Datos mock temporales para evitar errores
      setDiagnosticInfo({
        projectUrl: 'Configuración pendiente',
        recommendations: ['Implementar checkEmailConfiguration en authStore']
      });
    } catch (error) {
      console.error('Error en diagnóstico:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  if (!diagnosticInfo && !loading) return null;

  return (
    <div className={`bg-cactus-50 dark:bg-cactus-900/20 border border-cactus-200 dark:border-cactus-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <Info className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium text-blue-800">
            Diagnóstico del Sistema de Emails
          </h3>
        </div>
        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="mt-3 text-sm text-blue-600">
          Verificando configuración...
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {diagnosticInfo?.error ? (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Error: {diagnosticInfo.error}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Conexión a Supabase establecida</span>
              </div>
              
              {email && (
                <div className="text-sm text-blue-700">
                  <strong>Email destino:</strong> {email}
                </div>
              )}
              
              <div className="text-sm text-blue-700">
                <strong>Proyecto:</strong> {diagnosticInfo.projectUrl}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {showDetails ? 'Ocultar' : 'Ver'} recomendaciones
          </button>

          {showDetails && (
            <div className="mt-3 p-3 bg-blue-100 rounded border">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                💡 Recomendaciones:
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {(diagnosticInfo?.recommendations || []).map((rec: string, index: number) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-3 pt-3 border-t border-cactus-200 dark:border-cactus-700">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  🔍 Pasos adicionales de diagnóstico:
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Abre la consola del navegador (F12) para ver logs detallados</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Revisa tu dashboard de Supabase en Authentication {'>'} Settings</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Verifica que el proveedor de email esté configurado correctamente</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>Intenta con un email de un dominio diferente (Gmail, Outlook, etc.)</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailDiagnostic;