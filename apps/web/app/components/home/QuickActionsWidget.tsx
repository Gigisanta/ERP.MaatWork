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
    <Card variant="cyber" animated className="h-full">
      <CardContent className="p-5">
        <Stack direction="column" gap="md">
          <div className="space-y-1">
            <Heading level={3} size="sm" className="font-display font-semibold tracking-tight">
              Acciones Rápidas
            </Heading>
            <Text size="sm" className="text-muted-foreground">
              Accede rápidamente a las funciones más usadas
            </Text>
          </div>

          <div className="flex overflow-x-auto pb-2 -mx-2 px-2 sm:grid sm:grid-cols-3 sm:pb-0 sm:mx-0 sm:px-0 gap-3 snap-x snap-mandatory hide-scrollbar">
            {quickActions.map((action) => (
              <Button
                key={action.href}
                variant={action.variant}
                onClick={() => router.push(action.href)}
                className="h-auto py-4 px-4 flex flex-col items-start gap-3 transition-all min-w-[140px] snap-center group"
                title={action.description}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="p-1.5 rounded-md bg-background/50 group-hover:bg-background/80 transition-colors">
                    <Icon name={action.icon} size={18} className="text-primary" />
                  </div>
                  <Text weight="semibold" size="sm" className="text-left">
                    {action.label}
                  </Text>
                </div>
                <Text
                  size="xs"
                  className="text-left text-muted-foreground whitespace-normal leading-relaxed"
                >
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
