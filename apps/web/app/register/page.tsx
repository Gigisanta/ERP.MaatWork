'use client';
import { useAuth } from '../auth/AuthContext';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getManagers } from '@/lib/api';
import { logger, toLogContext } from '../../lib/logger';
import {
  Card,
  CardHeader,
  CardContent,
  Heading,
  Text,
  Stack,
  Input,
  Button,
  Alert,
  Select,
  Spinner,
} from '@cactus/ui';
import { Feather } from 'lucide-react';
import { GoogleOAuthButton } from '../components/auth/GoogleOAuthButton';

interface Manager {
  id: string;
  email: string;
  fullName: string;
}

function RegisterContent() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  // AI_DECISION: Detectar errores de OAuth y success
  const oauthError = searchParams.get('error');
  const googleAuthSuccess = searchParams.get('google_auth');

  // Form data
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'advisor' | 'manager' | 'owner' | 'staff'>('advisor');
  const [requestedManagerId, setRequestedManagerId] = useState('');

  // Managers list
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  // Trigger mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch managers when role is advisor
  useEffect(() => {
    if (role === 'advisor') {
      fetchManagers();
    }
  }, [role]);

  const fetchManagers = async () => {
    try {
      setLoadingManagers(true);
      const response = await getManagers();

      if (response.success && response.data) {
        setManagers(response.data || []);
      } else {
        throw new Error('Failed to fetch managers');
      }
    } catch (err) {
      logger.error('Error fetching managers', toLogContext({ err }));
      setManagers([]);
    } finally {
      setLoadingManagers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('El email es requerido');
      return;
    }

    if (!fullName.trim()) {
      setError('El nombre completo es requerido');
      return;
    }

    if (!password.trim()) {
      setError('La contraseña es requerida');
      return;
    }

    if (username && !/^[a-z0-9._-]{3,20}$/.test(username)) {
      setError('El nombre de usuario no es válido (a-z0-9._-, 3-20)');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (role === 'advisor' && !requestedManagerId) {
      setError('Debe seleccionar un manager');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const registerData = {
        email,
        fullName,
        ...(username && { username }),
        password,
        role,
        ...(role === 'advisor' && { requestedManagerId }),
      };

      await register(registerData);

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        {/* Background elements */}
        <div className="auth-gradient-bg" aria-hidden="true" />
        <div className="auth-dot-pattern" aria-hidden="true" />

        <div className="w-full max-w-md relative z-10">
          <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95">
            <CardContent className="p-8">
              <Stack direction="column" gap="md" className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-subtle rounded-2xl mx-auto mb-2">
                  <span className="text-3xl">✓</span>
                </div>
                <Heading level={2} className="text-secondary">
                  ¡Registro exitoso!
                </Heading>
                <Alert variant="warning" title="Pendiente de aprobación">
                  Tu cuenta ha sido creada pero necesita ser aprobada por un administrador antes de
                  que puedas iniciar sesión.
                </Alert>
                <Text size="sm" color="secondary">
                  Serás notificado cuando tu cuenta sea aprobada. Serás redirigido al login en unos
                  segundos...
                </Text>
              </Stack>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Animated gradient overlay */}
      <div className="auth-gradient-bg" aria-hidden="true" />

      {/* Dot pattern overlay */}
      <div className="auth-dot-pattern" aria-hidden="true" />

      {/* Register card */}
      <div
        className={`
          w-full max-w-md relative z-10
          transition-all duration-700 ease-out
          ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        `}
      >
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95">
          <CardHeader className="pb-2">
            <div className="text-center">
              {/* Logo with animation */}
              <div
                className={`
                  inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4
                  bg-primary shadow-lg shadow-primary/30
                  transition-all duration-500 ease-out
                  ${mounted ? 'scale-100 rotate-0' : 'scale-50 -rotate-12'}
                `}
                style={{ transitionDelay: '200ms' }}
              >
                <span className="text-primary">
                  <Feather className="w-10 h-10" strokeWidth={1.5} />
                </span>
              </div>

              {/* Title */}
              <div
                className={`
                  transition-all duration-500 ease-out
                  ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
                style={{ transitionDelay: '300ms' }}
              >
                <Heading level={1} className="text-3xl tracking-tight">
                  <span className="text-primary">Maat</span>
                  <span className="text-secondary">Work</span>
                </Heading>
              </div>

              <div
                className={`
                  transition-all duration-500 ease-out
                  ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
                style={{ transitionDelay: '400ms' }}
              >
                <Text color="secondary" className="mt-2">
                  Crea tu cuenta para comenzar
                </Text>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* OAuth Error Alert */}
            {oauthError === 'account_exists' && (
              <div className="mb-4 animate-fade-in">
                <Alert variant="warning" title="Cuenta ya existe">
                  Ya tienes una cuenta con este email de Google. Por favor inicia sesión.
                </Alert>
              </div>
            )}

            {/* Success Alert */}
            {googleAuthSuccess === 'success' && (
              <div className="mb-4 animate-fade-in">
                <Alert variant="success" title="¡Bienvenido!">
                  Tu cuenta ha sido creada exitosamente con Google.
                </Alert>
              </div>
            )}

            {/* Google OAuth Button - Prominent placement */}
            <div
              className={`
                mb-6 transition-all duration-500 ease-out
                ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ transitionDelay: '450ms' }}
            >
              <GoogleOAuthButton context="register" disabled={loading} />
            </div>

            {/* Divider */}
            <div
              className={`
                relative mb-6 transition-all duration-500 ease-out
                ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ transitionDelay: '500ms' }}
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-text-muted">O regístrate con email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <Stack direction="column" gap="lg">
                {/* Username Input */}
                <div
                  className={`
                    transition-all duration-500 ease-out
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '450ms' }}
                >
                  <Input
                    id="username"
                    label="Nombre de usuario (opcional)"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="tu_usuario (a-z0-9._-, 3-20)"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                {/* Full Name Input */}
                <div
                  className={`
                    transition-all duration-500 ease-out
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '500ms' }}
                >
                  <Input
                    id="fullName"
                    label="Nombre completo"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre completo"
                    disabled={loading}
                    required
                  />
                </div>

                {/* Email Input */}
                <div
                  className={`
                    transition-all duration-500 ease-out
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '550ms' }}
                >
                  <Input
                    id="email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    disabled={loading}
                    required
                    autoComplete="email"
                  />
                </div>

                {/* Password Input */}
                <div
                  className={`
                    transition-all duration-500 ease-out
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '600ms' }}
                >
                  <Input
                    id="password"
                    label="Contraseña"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    disabled={loading}
                    required
                    minLength={6}
                    showPasswordToggle={true}
                    autoComplete="new-password"
                  />
                </div>

                {/* Role Select */}
                <div
                  className={`
                    transition-all duration-500 ease-out
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '650ms' }}
                >
                  <label className="block text-sm font-medium text-text mb-2">Rol</label>
                  <Select
                    value={role}
                    onValueChange={(value) =>
                      setRole(value as 'advisor' | 'manager' | 'owner' | 'staff')
                    }
                    disabled={loading}
                    items={[
                      { value: 'advisor', label: 'Asesor' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'staff', label: 'Administrativo' },
                      { value: 'owner', label: 'Dirección (solo lectura)' },
                    ]}
                  />
                  {role === 'owner' && (
                    <Text size="xs" color="secondary" className="mt-1">
                      El rol Dirección tiene acceso de solo lectura a métricas de negocio
                    </Text>
                  )}
                  {role === 'staff' && (
                    <Text size="xs" color="secondary" className="mt-1">
                      El rol Administrativo tiene acceso operativo (contactos, carga de datos)
                    </Text>
                  )}
                </div>

                {/* Manager Select (only for advisors) */}
                {role === 'advisor' && (
                  <div
                    className={`
                      transition-all duration-500 ease-out
                      ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                    `}
                    style={{ transitionDelay: '700ms' }}
                  >
                    <label className="block text-sm font-medium text-text mb-2">
                      Manager asignado
                    </label>
                    <Select
                      value={requestedManagerId}
                      onValueChange={setRequestedManagerId}
                      disabled={loading || loadingManagers}
                      placeholder={
                        loadingManagers ? 'Cargando managers...' : 'Selecciona un manager'
                      }
                      items={managers.map((manager) => ({
                        value: manager.id,
                        label: `${manager.fullName} (${manager.email})`,
                      }))}
                    />
                  </div>
                )}

                {/* Error Alert */}
                {error && (
                  <div className="animate-fade-in">
                    <Alert variant="error" title="Error de registro">
                      {error}
                    </Alert>
                  </div>
                )}

                {/* Submit Button */}
                <div
                  className={`
                    transition-all duration-500 ease-out
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '750ms' }}
                >
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="w-full h-12 text-base font-semibold"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Spinner size="sm" variant="default" />
                        Creando cuenta...
                      </span>
                    ) : (
                      'Crear Cuenta'
                    )}
                  </Button>
                </div>
              </Stack>
            </form>

            {/* Divider */}
            <div
              className={`
                mt-8 pt-6 border-t border-border
                transition-all duration-500 ease-out
                ${mounted ? 'opacity-100' : 'opacity-0'}
              `}
              style={{ transitionDelay: '800ms' }}
            >
              {/* Login link */}
              <div className="text-center space-y-4">
                <div>
                  <Text size="sm" color="secondary">
                    ¿Ya tienes cuenta?{' '}
                    <Link
                      href="/login"
                      className="text-primary hover:text-primary-hover font-semibold hover:underline transition-colors"
                    >
                      Inicia sesión
                    </Link>
                  </Text>
                </div>

                <div>
                  <Link
                    href="/home"
                    className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
                  >
                    ← Volver al inicio
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer text */}
        <div
          className={`
            text-center mt-6 transition-all duration-500 ease-out
            ${mounted ? 'opacity-100' : 'opacity-0'}
          `}
          style={{ transitionDelay: '900ms' }}
        >
          <Text size="xs" color="muted">
            © 2024 <span className="text-primary">Maat</span>
            <span className="text-secondary">Work</span>. Todos los derechos reservados.
          </Text>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Spinner size="lg" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
