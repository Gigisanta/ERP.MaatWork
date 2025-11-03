"use client";
import { useAuth } from '../auth/AuthContext';
import { useEffect, useState, useRef } from 'react';
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
  Icon
} from '@cactus/ui';

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const hasRedirectedRef = useRef(false);

  // AI_DECISION: Redirigir automáticamente si ya hay sesión
  // Justificación: Evita que usuarios autenticados vean el formulario de login (estado inconsistente
  // entre cookie o navegación directa a /login). Mejora UX y previene loops.
  // Impacto: Afecta navegación en la ruta `/login` cuando `user` está presente.
  // AI_DECISION: Usar useRef para evitar loops infinitos de redirección
  // Justificación: searchParams es mutable y cambia de referencia, causando re-ejecuciones del useEffect.
  // Usar useRef previene múltiples redirecciones y rompe el ciclo de recursión.
  useEffect(() => {
    // Resetear flag cuando el componente se monta o cuando no hay sesión
    if (!user) {
      hasRedirectedRef.current = false;
      return;
    }

    // Guard: evitar múltiples redirecciones
    if (hasRedirectedRef.current) {
      return;
    }

    if (user) {
      hasRedirectedRef.current = true;
      const redirectTo = searchParams.get('redirect') || '/';
      router.replace(redirectTo);
    }
  }, [user, router]);

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
      
      // Marcar que se hizo redirect para evitar que el useEffect lo haga de nuevo
      hasRedirectedRef.current = true;
      
      // Obtener URL de redirección desde query params
      const redirectTo = searchParams.get('redirect') || '/';
      
      // Redirigir inmediatamente usando replace para evitar loops
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      // Si hay error, resetear el flag para permitir redirección futura
      hasRedirectedRef.current = false;
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
                  autoComplete="username"
                />

                {/* Password Input */}
                <Input
                  id="password"
                  type="password"
                  label="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  disabled={loading}
                  required
                  showPasswordToggle={true}
                  autoComplete="current-password"
                />

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