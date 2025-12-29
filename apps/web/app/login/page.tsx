'use client';
import { useAuth } from '../auth/AuthContext';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Input,
  Button,
  Alert,
  Checkbox,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Heading,
  Text,
  Stack,
  Icon,
  Spinner,
} from '@maatwork/ui';
import { Feather } from 'lucide-react';
import { GoogleOAuthButton } from '../components/auth/GoogleOAuthButton';

function LoginPageContent() {
  const { login, user, initialized } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const hasRedirectedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  // AI_DECISION: Detectar errores de OAuth y success
  // Justificación: Mostrar mensajes apropiados cuando vienen de Google OAuth
  const oauthError = searchParams.get('error');
  const googleAuthSuccess = searchParams.get('google_auth');

  // Trigger mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  // AI_DECISION: Redirigir automáticamente si ya hay sesión
  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      hasRedirectedRef.current = false;
      return;
    }
    if (hasRedirectedRef.current) return;

    if (user) {
      hasRedirectedRef.current = true;
      const redirectTo = searchParams.get('redirect') || '/';
      router.replace(redirectTo);
    }
  }, [user, initialized, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { identifier?: string; password?: string } = {};

    if (!identifier.trim()) {
      errors.identifier = 'El email o usuario es requerido';
    }

    if (!password.trim()) {
      errors.password = 'La contraseña es requerida';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    setFieldErrors({});
    setError(null);

    try {
      setLoading(true);
      setError(null);

      // Perform login (this now includes session verification)
      await login(identifier, password, rememberMe);

      // Wait for session to be established and user state to update (max 5 seconds)
      const maxWaitTime = 5000;
      const startTime = Date.now();
      const checkInterval = 100; // Check every 100ms

      const waitForSession = (): Promise<void> => {
        return new Promise((resolve, reject) => {
          const checkSession = () => {
            // Check if user is available and context is initialized
            if (user && initialized) {
              resolve();
              return;
            }

            const elapsed = Date.now() - startTime;
            if (elapsed >= maxWaitTime) {
              // If initialized but no user, session verification might have failed
              if (initialized && !user) {
                reject(
                  new Error(
                    'La sesión no se pudo verificar después del login. Por favor, intenta nuevamente.'
                  )
                );
              } else {
                reject(
                  new Error('La sesión no se estableció a tiempo. Por favor, intenta nuevamente.')
                );
              }
              return;
            }

            setTimeout(checkSession, checkInterval);
          };

          // Start checking immediately
          checkSession();
        });
      };

      // Wait for session confirmation
      await waitForSession();

      // Session confirmed, redirect
      hasRedirectedRef.current = true;
      const redirectTo = searchParams.get('redirect') || '/';
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      hasRedirectedRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated gradient overlay */}
      <div className="auth-gradient-bg" aria-hidden="true" />

      {/* Dot pattern overlay */}
      <div className="auth-dot-pattern" aria-hidden="true" />

      {/* Login card */}
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
              {/* Logo with animation - Purple gradient */}
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

              {/* Title with stagger animation */}
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
                  Gestión profesional de clientes e inversiones
                </Text>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Form with staggered animation */}
            <form onSubmit={handleSubmit} noValidate>
              <Stack direction="column" gap="lg">
                {/* Email Input */}
                <div
                  className={`
                    transition-all duration-500 ease-out
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '450ms' }}
                >
                  <Input
                    id="identifier"
                    type="text"
                    label="Email o usuario"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (fieldErrors.identifier) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.identifier;
                          return next;
                        });
                      }
                    }}
                    placeholder="tu@email.com"
                    disabled={loading}
                    required
                    autoComplete="username"
                    autoFocus
                    error={fieldErrors.identifier ?? null}
                  />
                </div>

                {/* Password Input */}
                <div
                  className={`
                    transition-all duration-500 ease-out
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '500ms' }}
                >
                  <Input
                    id="password"
                    type="password"
                    label="Contraseña"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.password;
                          return next;
                        });
                      }
                    }}
                    placeholder="••••••••"
                    disabled={loading}
                    required
                    showPasswordToggle={true}
                    autoComplete="current-password"
                    error={fieldErrors.password ?? null}
                  />
                </div>

                {/* Remember me & Forgot password */}
                <div
                  className={`
                    flex items-center justify-between text-sm
                    transition-all duration-500 ease-out
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '550ms' }}
                >
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    label="Recordarme"
                  />
                  <Link
                    href="#"
                    className="text-primary hover:text-primary-hover hover:underline transition-colors font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                {/* OAuth Error Alert */}
                {oauthError === 'pending_approval' && (
                  <div className="animate-fade-in">
                    <Alert variant="warning" title="Cuenta pendiente de aprobación">
                      Tu cuenta ha sido creada y está pendiente de aprobación por un administrador.
                      Te notificaremos cuando puedas iniciar sesión.
                    </Alert>
                  </div>
                )}

                {oauthError === 'no_account' && (
                  <div className="animate-fade-in">
                    <Alert variant="warning" title="Cuenta no encontrada">
                      No tienes una cuenta con este email de Google. Por favor regístrate primero.
                    </Alert>
                  </div>
                )}

                {/* Success Alert */}
                {googleAuthSuccess === 'success' && (
                  <div className="animate-fade-in">
                    <Alert variant="success" title="¡Bienvenido!">
                      Has iniciado sesión exitosamente con Google.
                    </Alert>
                  </div>
                )}

                {/* Error Alert */}
                {error && (
                  <div className="animate-fade-in">
                    <Alert
                      variant={error.includes('pendiente de aprobación') ? 'warning' : 'error'}
                      title={
                        error.includes('pendiente de aprobación')
                          ? 'Cuenta pendiente'
                          : 'Error de autenticación'
                      }
                    >
                      {error}
                    </Alert>
                  </div>
                )}

                {/* Submit Button - Purple primary */}
                <div
                  className={`
                    transition-all duration-500 ease-out
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '600ms' }}
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
                        Iniciando sesión...
                      </span>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>
                </div>

                {/* Divider */}
                <div
                  className={`
                    relative transition-all duration-500 ease-out
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '650ms' }}
                >
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-text-muted">O continúa con</span>
                  </div>
                </div>

                {/* Google OAuth Button */}
                <div
                  className={`
                    transition-all duration-500 ease-out
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '700ms' }}
                >
                  <GoogleOAuthButton context="login" disabled={loading} />
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
              style={{ transitionDelay: '700ms' }}
            >
              {/* Register link */}
              <div className="text-center space-y-4">
                <div>
                  <Text size="sm" color="secondary">
                    ¿No tienes cuenta?{' '}
                    <Link
                      href="/register"
                      className="text-primary hover:text-primary-hover font-semibold hover:underline transition-colors"
                    >
                      Regístrate aquí
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
          style={{ transitionDelay: '800ms' }}
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div className="auth-gradient-bg" aria-hidden="true" />
          <div className="auth-dot-pattern" aria-hidden="true" />
          <div className="text-center relative z-10">
            <Spinner size="lg" variant="secondary" />
            <Text color="secondary" className="mt-4">
              Cargando...
            </Text>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
