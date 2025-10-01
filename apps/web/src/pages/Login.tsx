import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, Loader2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, currentUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  useEffect(() => {
    // Si hay currentUser pendiente y el error indica pendiente, redirigir
    if (currentUser && currentUser.isApproved === false && currentUser.status === 'pending') {
      navigate('/approval-pending');
    }
  }, [currentUser, navigate]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    console.log('📝 LOGIN_FORM: Iniciando submit', {
      username: formData.username,
      rememberMe,
      timestamp: new Date().toISOString()
    });
    
    try {
      console.log('🚀 LOGIN_FORM: Llamando función login...');
      const success = await login(formData.username, formData.password, rememberMe);
      console.log('✅ LOGIN_FORM: Login completado', { success });
      
      if (success) {
        console.log('🎉 LOGIN_FORM: Login exitoso, esperando redirección automática...');
      }
    } catch (err) {
      console.error('❌ LOGIN_FORM: Error en login:', err);
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      if (message.toLowerCase().includes('pendiente de aprobación')) {
        // Redirigir directamente para mejor UX
        navigate('/approval-pending');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Limpiar error cuando el usuario empiece a escribir
    if (error) {
      setError('');
    }
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cactus-50 to-oasis-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌵</div>
          <h1 className="text-3xl font-bold text-cactus-800 mb-2">CRM Cactus</h1>
          <p className="text-secondary">Inicia sesión en tu dashboard</p>
        </div>

        {/* Formulario de login */}
        <div className="bg-primary rounded-2xl shadow-xl p-8 border border-border-primary">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-secondary mb-2">
                Nombre de usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent transition-all"
                  placeholder="tu_usuario"
                  required
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-border-primary rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-secondary"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Recordar sesión */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-cactus-300 text-cactus-600 focus:ring-cactus-500"
                />
                <span className="ml-2 text-sm text-cactus-700">Recordar sesión</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-cactus-600 hover:text-cactus-800 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-error-50 border border-error-200 flex items-center space-x-2">
                <AlertCircle className="text-error" size={20} />
                <span className="text-error text-sm">{error}</span>
              </div>
            )}

            {/* Botón de login */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cactus-600 hover:bg-cactus-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Enlace de registro */}
          <div className="mt-6 text-center">
            <p className="text-center text-muted text-sm">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-cactus-600 hover:underline font-medium">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Decoración de cactus */}
        <div className="text-center mt-8 space-x-2">
          <span className="text-2xl">🌵</span>
          <span className="text-xl">🌵</span>
          <span className="text-2xl">🌵</span>
        </div>
      </div>
    </div>
  );
}