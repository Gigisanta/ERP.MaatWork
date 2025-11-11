"use client";
import { useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getManagers } from '@/lib/api';
import { logger } from '../../lib/logger';
import { 
  Card, 
  CardContent, 
  Heading, 
  Text, 
  Stack, 
  Input, 
  Button, 
  Alert,
  Select,
  SelectItem
} from '@cactus/ui';

interface Manager {
  id: string;
  email: string;
  fullName: string;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form data
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'advisor' | 'manager'>('advisor');
  const [requestedManagerId, setRequestedManagerId] = useState('');
  
  // Managers list
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

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
      logger.error('Error fetching managers', { err });
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
        ...(role === 'advisor' && { requestedManagerId })
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
      <div className="min-h-screen flex items-center justify-center bg-background-base">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <Stack direction="column" gap="md" className="text-center">
              <Heading level={2}>¡Registro exitoso!</Heading>
              <Alert variant="success">
                Tu cuenta ha sido creada. Serás redirigido al login...
              </Alert>
            </Stack>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-base">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <Stack direction="column" gap="lg">
            <div className="text-center">
              <Heading level={1} className="text-2xl font-bold">
                🌵 CACTUS CRM
              </Heading>
              <Text size="sm" color="secondary" className="mt-2">
                Crea tu cuenta para comenzar
              </Text>
            </div>

            <form onSubmit={handleSubmit}>
              <Stack direction="column" gap="md">
                <Input
                  label="Nombre de usuario"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="tu_usuario (a-z0-9._-, 3-20)"
                  disabled={loading}
                  autoFocus
                />

                <Input
                  label="Nombre completo"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  disabled={loading}
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  disabled={loading}
                  required
                />

                <Input
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={loading}
                  required
                  minLength={6}
                  showPasswordToggle={true}
                />

                <div>
                  <label className="block text-sm font-medium text-foreground-base mb-2">
                    Rol
                  </label>
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value as 'advisor' | 'manager')}
                    disabled={loading}
                    items={[
                      { value: "advisor", label: "Asesor" },
                      { value: "manager", label: "Manager" }
                    ]}
                  />
                </div>

                {role === 'advisor' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground-base mb-2">
                      Manager asignado
                    </label>
                    <Select
                      value={requestedManagerId}
                      onValueChange={setRequestedManagerId}
                      disabled={loading || loadingManagers}
                      placeholder={loadingManagers ? "Cargando managers..." : "Selecciona un manager"}
                      items={managers.map((manager) => ({
                        value: manager.id,
                        label: `${manager.fullName} (${manager.email})`
                      }))}
                    />
                  </div>
                )}

                {error && (
                  <Alert variant="error">
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </Button>
              </Stack>
            </form>

            <div className="text-center">
              <Link href="/login" className="text-sm text-accent-base hover:text-accent-text transition-colors">
                ¿Ya tienes cuenta? Inicia sesión
              </Link>
            </div>
          </Stack>
        </CardContent>
      </Card>
    </div>
  );
}