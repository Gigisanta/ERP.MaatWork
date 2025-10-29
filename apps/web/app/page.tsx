"use client";
// REGLA CURSOR: Página principal - mantener AuthContext, no eliminar loading states, preservar feedback visual
import Link from 'next/link';
import { useAuth } from './auth/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Icon, Heading, Text, Stack, Badge } from '@cactus/ui';

export default function HomePage() {
  const { user } = useAuth();
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      {!user ? (
        <div className="text-center py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <Heading level={1}>Cactus CRM</Heading>
            </CardHeader>
            <CardContent>
              <Stack direction="column" gap="md">
                <Text color="secondary">
                  Gestiona tus contactos y carteras de inversión de manera profesional
                </Text>
                <Button variant="primary">
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Stack direction="column" gap="lg">
          {/* Encabezado de bienvenida */}
          <Card>
            <CardHeader>
              <Heading level={2}>Bienvenido de vuelta</Heading>
            </CardHeader>
            <CardContent>
              <Stack direction="column" gap="sm">
                <Text>{user.fullName || user.email}</Text>
                <Badge variant="default">
                  {user.role === 'admin' ? '👑 Administrador' :
                   user.role === 'manager' ? '👨‍💼 Manager' :
                   '👤 Asesor'}
                </Badge>
              </Stack>
            </CardContent>
          </Card>

          {/* Tarjetas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Contactos */}
            <Card>
              <Link href="/contacts" className="block no-underline">
                <CardContent>
                  <Stack direction="column" gap="sm">
                    <Stack direction="row" gap="sm" align="center">
                      <Icon name="Users" size={16} />
                      <Heading level={3} size="sm">Contactos</Heading>
                    </Stack>
                    <Text size="sm" color="secondary">
                      Gestiona tu red de clientes
                    </Text>
                  </Stack>
                </CardContent>
              </Link>
            </Card>

            {/* Carteras */}
            <Card>
              <Link href="/portfolios" className="block no-underline">
                <CardContent>
                  <Stack direction="column" gap="sm">
                    <Stack direction="row" gap="sm" align="center">
                      <Icon name="BarChart3" size={16} />
                      <Heading level={3} size="sm">Carteras</Heading>
                    </Stack>
                    <Text size="sm" color="secondary">
                      Analiza el rendimiento de tus carteras
                    </Text>
                  </Stack>
                </CardContent>
              </Link>
            </Card>

            {/* Administración */}
            <Card>
              <Link href="/admin/users" className="block no-underline">
                <CardContent>
                  <Stack direction="column" gap="sm">
                    <Stack direction="row" gap="sm" align="center">
                      <Icon name="Settings" size={16} />
                      <Heading level={3} size="sm">Administración</Heading>
                    </Stack>
                    <Text size="sm" color="secondary">
                      Administra usuarios y permisos del sistema
                    </Text>
                  </Stack>
                </CardContent>
              </Link>
            </Card>

            {/* Equipos */}
            <Card>
              <Link href="/teams" className="block no-underline">
                <CardContent>
                  <Stack direction="column" gap="sm">
                    <Stack direction="row" gap="sm" align="center">
                      <Icon name="Users" size={16} />
                      <Heading level={3} size="sm">Equipos</Heading>
                    </Stack>
                    <Text size="sm" color="secondary">
                      Crea y gestiona equipos de trabajo
                    </Text>
                  </Stack>
                </CardContent>
              </Link>
            </Card>
          </div>
        </Stack>
      )}
    </div>
  );
}