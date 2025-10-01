import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const NotionCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Procesando conexión con Notion...');
  const [workspace, setWorkspace] = useState<any>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Verificar que el usuario esté autenticado
        if (!user) {
          setStatus('error');
          setMessage('Usuario no autenticado. Redirigiendo al login...');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // Obtener parámetros de la URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Error de autorización: ${error}`);
          setTimeout(() => navigate('/notion-crm'), 3000);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('Parámetros de autorización faltantes');
          setTimeout(() => navigate('/notion-crm'), 3000);
          return;
        }

        // Obtener token de sesión de Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
          setStatus('error');
          setMessage('Error de autenticación. Redirigiendo al login...');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        setMessage('Completando conexión con Notion...');

        // Procesar el callback de OAuth
        const response = await fetch('/api/auth/notion/callback', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code, state })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setStatus('success');
          setWorkspace(result.workspace);
          setMessage(`¡Conexión exitosa con ${result.workspace?.name || 'Notion'}!`);
          
          // Redirigir al CRM después de 2 segundos
          setTimeout(() => {
            navigate('/notion-crm', { replace: true });
          }, 2000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Error procesando la conexión');
          setTimeout(() => navigate('/notion-crm'), 3000);
        }
      } catch (err) {
        console.error('Error en callback de Notion:', err);
        setStatus('error');
        setMessage('Error inesperado procesando la conexión');
        setTimeout(() => navigate('/notion-crm'), 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate, user]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          {getStatusIcon()}
        </div>
        
        <h1 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
          {status === 'processing' && 'Conectando con Notion'}
          {status === 'success' && '¡Conexión Exitosa!'}
          {status === 'error' && 'Error de Conexión'}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        {status === 'success' && workspace && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">{workspace.icon || '🏢'}</span>
              <span className="font-semibold text-green-800">
                {workspace.name}
              </span>
            </div>
            <p className="text-green-600 text-sm mt-2">
              Workspace conectado correctamente
            </p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex items-center justify-center text-blue-600 text-sm">
            <span>Redirigiendo al CRM</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </div>
        )}
        
        {status === 'error' && (
          <button
            onClick={() => navigate('/notion-crm')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Volver al CRM
          </button>
        )}
      </div>
    </div>
  );
};

export default NotionCallback;