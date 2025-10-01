import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, UserCheck, Loader2, Phone, AlertCircle, CheckCircle, Mail, Bug, AtSign } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { supabase } from '../config/supabase';

import DebugPanel from '../components/DebugPanel';

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, setLoading } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    role: 'advisor' as 'advisor' | 'manager',
    password: '',
    confirmPassword: ''
  });
  const [passwordStrength, setPasswordStrength] = useState<{score: number; label: string; color: string}>({ score: 0, label: 'Débil', color: 'bg-error-50' });
  const [showApprovalPending, setShowApprovalPending] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean;
    requiresApproval: boolean;
    message: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugClickCount, setDebugClickCount] = useState(0);
  const [error, setError] = useState('');

  // Función para validar la configuración de Supabase (no depende de permisos RLS)
  const validateSupabaseConfig = async (): Promise<boolean> => {
    try {
      console.log('Validando configuración de Supabase...');

      // Verificar que el cliente de Supabase esté inicializado
      if (!supabase) {
        console.error('Cliente de Supabase no inicializado');
        setError('Error de configuración del sistema. Por favor, contacta al administrador.');
        return false;
      }

      // Chequeo de sesión/auth como prueba de conectividad
      const { error: authErr } = await supabase.auth.getSession();
      if (authErr) {
        console.error('Error de conectividad con Supabase (auth):', authErr);
        setError('Error de conexión con el servicio de autenticación. Intenta nuevamente.');
        return false;
      }

      // Probe ligero a la tabla users; si falla por RLS, seguimos igual.
      const probe = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });
      if (probe.error) {
        console.warn('Aviso: RLS/permiso en tabla users durante verificación, continúo:', probe.error?.message);
      }

      console.log('Configuración de Supabase validada correctamente');
      return true;
    } catch (error) {
      console.error('Error validando configuración de Supabase:', error);
      setError('Error de configuración del sistema. Por favor, contacta al administrador.');
      return false;
    }
   };

  // Función para activar el panel de debug con múltiples clics
  const handleDebugActivation = () => {
    const newCount = debugClickCount + 1;
    setDebugClickCount(newCount);
    
    if (newCount >= 5) {
      setShowDebugPanel(true);
      setDebugClickCount(0);
      console.log('Panel de debug activado');
    }
    
    // Reset counter after 3 seconds
    setTimeout(() => {
      setDebugClickCount(0);
    }, 3000);
  };

  // Función para validar el formulario
  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setError('El nombre completo es requerido');
      return false;
    }
    if (!formData.username.trim()) {
      setError('El nombre de usuario es requerido');
      return false;
    }
    if (!formData.email.trim()) {
      setError('El email es requerido');
      return false;
    }

    if (!formData.password) {
      setError('La contraseña es requerida');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    console.log('🎯 REGISTER: handleSubmit iniciado');
    
    console.log('🚀 REGISTER: Iniciando proceso de registro');
    console.log('📝 REGISTER: Datos del formulario:', {
      fullName: formData.fullName,
      username: formData.username,
      email: formData.email,
      role: formData.role,
      phone: formData.phone || 'No especificado'
    });

    // Limpiar estados previos
    setError('');
    setSuccessMessage('');
    
    // Validar formulario
    console.log('🔍 REGISTER: Validando formulario...');
    if (!validateForm()) {
      console.error('❌ REGISTER: Error de validación del formulario');
      return;
    }
    console.log('✅ REGISTER: Formulario válido');

    // Validar configuración de Supabase
    console.log('🔍 REGISTER: Validando configuración de Supabase...');
    const isSupabaseValid = await validateSupabaseConfig();
    if (!isSupabaseValid) {
      console.error('❌ REGISTER: Configuración de Supabase inválida');
      return;
    }
    console.log('✅ REGISTER: Configuración de Supabase válida');

    // Establecer estado de carga
    setLoading(true);
    console.log('🔄 REGISTER: Estado de carga activado');
    
    // Configurar timeout más corto para mejor UX
    const timeoutId = setTimeout(() => {
      console.error('⏰ REGISTER: Timeout - El registro está tardando demasiado');
      setError('El registro está tardando más de lo esperado. Por favor, verifica tu conexión e inténtalo de nuevo.');
      setLoading(false);
    }, 15000); // 15 segundos

    try {
      console.log('🔄 REGISTER: Llamando a authStore.register');
      
      const registrationData = {
        name: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role as 'advisor' | 'manager',
        phone: formData.phone || undefined
      };
      
      const success = await register(registrationData);
      
      // Limpiar timeout si el registro se completa
      clearTimeout(timeoutId);
      console.log('✅ REGISTER: Registro completado:', success);
      
      if (success === true) {
        console.log('🎉 REGISTER: Registro exitoso');
        
        // Mostrar mensaje de éxito en el formulario
        const successMsg = formData.role === 'advisor' 
          ? 'Tu cuenta ha sido creada. Redirigiendo al dashboard...' 
          : 'Tu solicitud de manager ha sido enviada para aprobación. Redirigiendo...';
        
        setSuccessMessage(successMsg);
        
        // Mostrar notificación
        addNotification({
          tipo: 'success',
          titulo: '¡Registro exitoso!',
          mensaje: successMsg
        });
        
        // Esperar un momento para que el usuario vea el mensaje
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar el estado final del auth store
        const finalState = useAuthStore.getState();
        console.log('🔍 REGISTER: Estado final:', {
          isAuthenticated: finalState.isAuthenticated,
          user: finalState.user ? { id: finalState.user.id, role: finalState.user.role } : null
        });
        
        // Manejar redirección basada en el rol
        if (formData.role === 'advisor') {
          console.log('🎯 REGISTER: Navegando a dashboard para advisor');
          navigate('/dashboard', { replace: true });
        } else if (formData.role === 'manager') {
          console.log('🎯 REGISTER: Navegando a pantalla de aprobación pendiente');
          navigate('/approval-pending', { replace: true });
        } else {
          console.log('🎯 REGISTER: Navegando a dashboard para admin');
          navigate('/dashboard', { replace: true });
        }
        
        return;
      } else {
        console.error('❌ REGISTER: El registro retornó false');
        throw new Error('El registro no se completó correctamente. Intenta nuevamente.');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('💥 REGISTER: Error durante el registro:', error);
      
      let errorMessage = 'Error durante el registro. Por favor, inténtalo de nuevo.';
      
      if (error?.message) {
        if (error.message.includes('already registered') || error.message.includes('ya está registrado')) {
          errorMessage = 'Este email ya está registrado. Intenta con otro email o inicia sesión.';
        } else if (error.message.includes('already exists') || error.message.includes('ya existe')) {
          errorMessage = 'Este nombre de usuario ya existe. Por favor, elige otro.';
        } else if (error.message.includes('Invalid email') || error.message.includes('email no es válido')) {
          errorMessage = 'El formato del email no es válido.';
        } else if (error.message.includes('Password') || error.message.includes('contraseña')) {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        } else if (error.message.includes('Network') || error.message.includes('conexión')) {
          errorMessage = 'Error de conexión. Verifica tu internet e intenta nuevamente.';
        } else if (error.message.includes('timeout') || error.message.includes('tardando')) {
          errorMessage = 'El registro está tardando demasiado. Verifica tu conexión e intenta nuevamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      
      // Mostrar notificación de error
      addNotification({
        tipo: 'error',
        titulo: 'Error en el registro',
        mensaje: errorMessage
      });
      
      return;
    } finally {
      console.log('🏁 REGISTER: Finalizando proceso');
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (e.target.name === 'password') {
      const val = e.target.value;
      const lengthScore = Math.min(2, Math.floor(val.length / 6));
      const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].reduce((acc, rgx) => acc + (rgx.test(val) ? 1 : 0), 0);
      const score = Math.min(4, lengthScore + variety);
      const label = score >= 4 ? 'Muy fuerte' : score === 3 ? 'Fuerte' : score === 2 ? 'Medio' : 'Débil';
      const color = score >= 4 ? 'bg-cactus-50' : score === 3 ? 'bg-cactus-100' : score === 2 ? 'bg-sunlight-50' : 'bg-error-50';
      setPasswordStrength({ score, label, color });
    }
  };





  if (isSubmitted && registrationResult) {
    return (
      <div className="min-h-screen bg-cactus-gradient flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-cactus-100">
            <div className="text-6xl mb-4">🌵</div>
            
            {registrationResult.success ? (
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            ) : (
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            )}
            
            <h2 className="text-2xl font-bold text-cactus-700 mb-4">
              {registrationResult.success ? '¡Registro Exitoso!' : 'Error en el Registro'}
            </h2>
            
            <div className="space-y-4">
              <p className="text-cactus-600">
                {registrationResult.message}
              </p>
              
              {registrationResult.requiresApproval && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-orange-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Pendiente de Aprobación</span>
                  </div>
                  <p className="text-sm text-orange-600 mt-2">
                    Recibirás una notificación por email cuando tu solicitud sea revisada.
                    Mientras tanto, puedes crear una cuenta de Asesor para acceder inmediatamente.
                  </p>
                </div>
              )}
              
              {!registrationResult.requiresApproval && registrationResult.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Cuenta Activada</span>
                  </div>
                  <p className="text-sm text-green-600 mt-2">
                    Tu cuenta está lista para usar. Puedes iniciar sesión inmediatamente.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col space-y-3 mt-6">
              {!registrationResult.requiresApproval && (
                <Link
                  to="/login"
                  className="bg-cactus-600 text-white px-6 py-3 rounded-lg hover:bg-cactus-700 transition-colors"
                >
                  Ir al Login
                </Link>
              )}
              
              {registrationResult.requiresApproval && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/approval-pending');
                    }}
                    className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Ver estado de solicitud
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsSubmitted(false);
                      setRegistrationResult(null);
                      setFormData(prev => ({ ...prev, role: 'advisor' }));
                    }}
                    className="text-cactus-600 hover:text-cactus-800 underline text-sm bg-transparent border-none cursor-pointer"
                  >
                    Crear cuenta de Asesor en su lugar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cactus-gradient flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌵</div>
          <h1 className="text-3xl font-bold text-cactus-700 mb-2">Únete a CRM Cactus</h1>
          <p className="text-cactus-600">Crea tu cuenta para comenzar</p>
        </div>

        {/* Formulario de registro */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-cactus-100">
          <form onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }} onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }
          }} className="space-y-6" noValidate>
            {/* Nombre completo */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-cactus-700 mb-2">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cactus-500" size={20} />
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-cactus-200 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent transition-all"
                  placeholder="Juan Pérez"
                  required
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-cactus-700 mb-2">
                Nombre de usuario
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cactus-500" size={20} />
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-cactus-200 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent transition-all"
                  placeholder="tu_usuario"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-cactus-700 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cactus-500" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-cactus-200 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent transition-all"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-cactus-700 mb-2">
                Teléfono (opcional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cactus-500" size={20} />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-cactus-200 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent transition-all"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>



            {/* Rol */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-cactus-700 mb-2">
                Tipo de cuenta
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cactus-500" size={20} />
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-cactus-200 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent transition-all appearance-none"
                  required
                >
                  <option value="advisor">Asesor - Acceso inmediato</option>
                  <option value="manager">Manager - Requiere aprobación de administrador</option>
                </select>
              </div>
              
              {/* Información del rol seleccionado */}
              <div className="mt-2 p-3 rounded-lg border">
                {formData.role === 'advisor' ? (
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-600">Cuenta de Asesor</p>
                      <p className="text-xs text-green-600">
                        Acceso inmediato al sistema con permisos básicos para gestión de contactos y tareas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-600">Cuenta de Manager</p>
                      <p className="text-xs text-orange-600">
                        Requiere aprobación de un administrador. Incluye permisos avanzados para gestión de equipos y reportes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>





            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-cactus-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cactus-500" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-cactus-200 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cactus-500 hover:text-cactus-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="mt-2">
                <div className="w-full h-2 bg-gray-200 rounded">
                  <div className={`h-2 rounded ${passwordStrength.color}`} style={{ width: `${(passwordStrength.score / 4) * 100}%` }}></div>
                </div>
                <p className="text-xs text-cactus-600 mt-1">Fortaleza: {passwordStrength.label}</p>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-cactus-700 mb-2">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cactus-500" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-cactus-200 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cactus-500 hover:text-cactus-700"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Términos y condiciones */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="terms"
                className="mt-1 rounded border-cactus-300 text-cactus-600 focus:ring-cactus-500"
                required
              />
              <label htmlFor="terms" className="ml-2 text-sm text-cactus-700">
                Acepto los{' '}
                <Link to="/terms" className="text-cactus-600 hover:text-cactus-800 underline">
                  términos y condiciones
                </Link>{' '}
                y la{' '}
                <Link to="/privacy" className="text-cactus-600 hover:text-cactus-800 underline">
                  política de privacidad
                </Link>
              </label>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 animate-pulse">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Mensaje de éxito */}
            {successMessage && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 animate-pulse">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <p className="text-sm text-green-700 font-medium">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Indicador de progreso durante el registro */}
            {isLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cactus-600 mr-3"></div>
                  <p className="text-blue-700 text-sm font-medium">
                    {formData.role === 'advisor' 
                      ? 'Creando tu cuenta de asesor...' 
                      : 'Enviando solicitud de manager para aprobación...'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Botón de registro */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isLoading || !!successMessage}
              className={cn(
                "w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all",
                isLoading || successMessage
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-cactus-600 hover:bg-cactus-700 hover:shadow-lg transform hover:-translate-y-0.5",
                "text-white"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  <span>
                    {formData.role === 'advisor' 
                      ? 'Creando cuenta...' 
                      : 'Enviando solicitud...'
                    }
                  </span>
                </>
              ) : successMessage ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>¡Registro exitoso!</span>
                </>
              ) : (
                <>
                  <UserCheck size={20} />
                  <span>Crear Cuenta</span>
                </>
              )}
            </button>
          </form>

          {/* Enlace de login */}
          <div className="mt-6 text-center">
            <p className="text-cactus-600">
              ¿Ya tienes cuenta?{' '}
              <Link
                to="/login"
                className="font-medium text-cactus-700 hover:text-cactus-800 transition-colors"
              >
                Inicia sesión aquí
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

      {/* Botón de debug (oculto, activable con múltiples clics) */}
      <button
        type="button"
        onClick={handleDebugActivation}
        className="fixed bottom-4 right-4 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full opacity-20 hover:opacity-60 transition-opacity duration-200 flex items-center justify-center"
        title={`Clics para debug: ${debugClickCount}/5`}
      >
        <Bug className="h-4 w-4 text-gray-600" />
      </button>

      {/* Panel de Debug */}
      <DebugPanel 
        isVisible={showDebugPanel} 
        onClose={() => setShowDebugPanel(false)} 
      />
    </div>
  );
}