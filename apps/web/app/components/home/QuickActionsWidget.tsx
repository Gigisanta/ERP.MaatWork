/**
 * Quick Actions Widget
 *
 * Widget de acciones rápidas para el dashboard home
 * Permite acceso rápido a las acciones más comunes sin navegar por el sidebar
 */

'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Text, Stack, Heading, Icon } from '@maatwork/ui';

export function QuickActionsWidget() {
  const router = useRouter();

  const quickActions = [
    {
      label: 'Nuevo Contacto',
      icon: 'plus' as const,
      href: '/contacts/new',
      variant: 'primary' as const,
      description: 'Agregar un nuevo contacto al sistema',
    },
    {
      label: 'Ver Pipeline',
      icon: 'grid' as const,
      href: '/pipeline',
      variant: 'outline' as const,
      description: 'Vista Kanban de contactos',
    },
    {
      label: 'Mis Tareas',
      icon: 'check' as const,
      href: '/contacts', // TODO: Crear página de tareas pendientes
      variant: 'outline' as const,
      description: 'Ver tareas pendientes',
    },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 md:p-6">
        <Stack direction="column" gap="md">
          <div>
            <Heading level={3} size="sm" className="mb-1">
              Acciones Rápidas
            </Heading>
            <Text size="sm" color="secondary">
              Accede rápidamente a las funciones más usadas
            </Text>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.href}
                variant={action.variant}
                onClick={() => router.push(action.href)}
                className="h-auto p-3 flex flex-col items-start gap-2 hover-lift transition-all"
                title={action.description}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon name={action.icon} size={20} />
                  <Text weight="medium" size="sm" className="text-left">
                    {action.label}
                  </Text>
                </div>
                <Text size="xs" color="secondary" className="text-left opacity-80">
                  {action.description}
                </Text>
              </Button>
            ))}
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}
