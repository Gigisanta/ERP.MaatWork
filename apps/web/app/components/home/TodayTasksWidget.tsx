/**
 * Today Tasks Widget
 *
 * Widget que muestra "Qué hacer hoy" con contactos sin interacción reciente,
 * tareas vencidas y próximos eventos
 */

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Text, Stack, Button, Icon } from '@maatwork/ui';
import { useContacts, usePipelineStages } from '@/lib/api-hooks';
import type { Contact, PipelineStage } from '@/types';

interface TodayTasksWidgetProps {
  maxItems?: number;
}

export function TodayTasksWidget({ maxItems = 5 }: TodayTasksWidgetProps) {
  const router = useRouter();
  const { contacts, isLoading: contactsLoading } = useContacts();
  const { stages: pipelineStages } = usePipelineStages();

  // Calcular contactos que requieren atención (sin interacción reciente)
  const contactsNeedingAttention = useMemo(() => {
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) return [];

    const now = new Date();
    const contactsArray = contacts as Contact[];

    return contactsArray
      .filter((contact) => {
        // Excluir contactos en etapa "Cliente"
        const stage = (pipelineStages as PipelineStage[])?.find(
          (s) => s.id === contact.pipelineStageId
        );
        if (stage?.name.toLowerCase() === 'cliente') return false;

        // Contactos sin interacción o con más de 7 días sin contacto
        if (!contact.contactLastTouchAt) return true;

        const lastTouch = new Date(contact.contactLastTouchAt);
        const daysSinceTouch = Math.floor(
          (now.getTime() - lastTouch.getTime()) / (1000 * 60 * 60 * 24)
        );

        return daysSinceTouch >= 7;
      })
      .sort((a, b) => {
        // Ordenar por urgencia: sin interacción primero, luego por días sin contacto
        if (!a.contactLastTouchAt) return -1;
        if (!b.contactLastTouchAt) return 1;

        const aDays = Math.floor(
          (now.getTime() - new Date(a.contactLastTouchAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        const bDays = Math.floor(
          (now.getTime() - new Date(b.contactLastTouchAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        return bDays - aDays; // Más días primero
      })
      .slice(0, maxItems);
  }, [contacts, pipelineStages, maxItems]);

  if (contactsLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 md:p-6">
          <Text color="secondary" size="sm">
            Cargando...
          </Text>
        </CardContent>
      </Card>
    );
  }

  const hasItems = contactsNeedingAttention.length > 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-base">Qué hacer hoy</CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        {hasItems ? (
          <Stack direction="column" gap="sm">
            {contactsNeedingAttention.map((contact) => {
              const daysSinceTouch = contact.contactLastTouchAt
                ? Math.floor(
                    (new Date().getTime() - new Date(contact.contactLastTouchAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;

              return (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <Text weight="medium" size="sm" className="truncate">
                      {contact.fullName}
                    </Text>
                    <Text size="xs" color="secondary">
                      {daysSinceTouch === null
                        ? 'Sin interacción registrada'
                        : `Hace ${daysSinceTouch} ${daysSinceTouch === 1 ? 'día' : 'días'}`}
                    </Text>
                  </div>
                  <Icon
                    name="ChevronRight"
                    size={16}
                    className="text-text-muted group-hover:text-primary transition-colors ml-2 shrink-0"
                  />
                </Link>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/contacts')}
              className="mt-2 w-full"
            >
              Ver todos los contactos
            </Button>
          </Stack>
        ) : (
          <Stack direction="column" gap="sm" align="center" className="py-4">
            <Icon name="check-circle" size={32} className="text-success opacity-50" />
            <Text color="secondary" size="sm" className="text-center">
              ¡Excelente! No hay contactos que requieran atención inmediata.
            </Text>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
