"use client";
import { useAuth } from '../auth/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Icon
} from '@cactus/ui';

export default function LoginPage() {
  const { login, user, token } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // AI_DECISION: Redirigir automáticamente si ya hay sesión
  // Justificación: Evita que usuarios autenticados vean el formulario de login (estado inconsistente
  // entre cookie/localStorage o navegación directa a /login). Mejora UX y previene loops.
  // Impacto: Afecta navegación en la ruta `/login` cuando `user` o `token` están presentes.
  useEffect(() => {
    if (user || token) {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTo = searchParams.get('redirect') || '/';
      router.replace(redirectTo);
    }
  }, [user, token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      setError('El email o usuario es requerido');
      return;
    }

    if (!password.trim()) {
      setError('La contraseña es requerida');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await login(identifier, password, rememberMe);
      
      // Obtener URL de redirección desde query params
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTo = searchParams.get('redirect') || '/';
      
      // Redirigir inmediatamente usando replace para evitar loops
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Centered login panel */}
      <div className="w-full max-w-sm">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-xl mb-3">
                <span className="text-2xl">🌵</span>
              </div>
              <Heading level={1} className="text-primary">
                CACTUS CRM
              </Heading>
              <Text color="secondary" className="mt-2">
                Inicia sesión con tu email o usuario y contraseña
              </Text>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Form */}
            <form onSubmit={handleSubmit}>
              <Stack direction="column" gap="md">
                {/* Identifier Input */}
                <Input
                  id="identifier"
                  type="text"
                  label="Email o usuario"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="tu@email.com o tu_usuario"
                  disabled={loading}
                  required
                />

                {/* Password Input */}
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>

                {/* Remember me */}
                <div className="flex items-center justify-between text-sm">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    label="Recordarme"
                  />
                  <Link 
                    href="#" 
                    className="text-primary hover:text-primary-hover hover:underline transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                {/* Error Alert */}
                {error && (
                  <Alert variant="error" title="Error">
                    {error}
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </Stack>
            </form>

            {/* Secondary actions */}
            <div className="mt-4 pt-4 border-t border-slate-200 text-center space-y-3">
              <div>
                <Link 
                  href="/register" 
                  className="text-sm text-text-secondary hover:text-primary hover:underline transition-colors"
                >
                  ¿No tienes cuenta? Regístrate aquí
                </Link>
              </div>
              <div>
                <Link 
                  href="/" 
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  ← Volver al inicio
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}