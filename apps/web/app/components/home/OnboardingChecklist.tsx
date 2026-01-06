/**
 * Onboarding Checklist Component
 *
 * Muestra una checklist de pasos iniciales para usuarios nuevos
 * Se oculta automáticamente cuando se completan todos los pasos
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Text,
  Stack,
  Button,
  Icon,
  Checkbox,
  ProgressBar,
} from '@maatwork/ui';
import { useContacts, useTags } from '@/lib/api-hooks';
import { useAuth } from '@/app/auth/AuthContext';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  checkFn: () => boolean;
}

export function OnboardingChecklist() {
  const router = useRouter();
  const { user } = useAuth();
  const { contacts } = useContacts();
  const { tags } = useTags('contact');
  const [dismissed, setDismissed] = useState(false);

  // Verificar si el usuario ya completó el onboarding
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const onboardingDismissed = localStorage.getItem('onboarding-checklist-dismissed');
      if (onboardingDismissed === 'true') {
        setDismissed(true);
      }
    }
  }, []);

  const checklistItems: ChecklistItem[] = [
    {
      id: 'create-contact',
      label: 'Crea tu primer contacto',
      href: '/contacts/new',
      checkFn: () => {
        const contactsArray = Array.isArray(contacts) ? contacts : [];
        return contactsArray.length > 0;
      },
    },
    {
      id: 'configure-tags',
      label: 'Configura tus etiquetas',
      href: '/contacts',
      checkFn: () => {
        const tagsArray = Array.isArray(tags) ? tags : [];
        return tagsArray.length > 0;
      },
    },
    {
      id: 'connect-calendar',
      label: 'Conecta tu calendario',
      href: '/profile',
      checkFn: () => {
        return user?.isGoogleConnected === true;
      },
    },
  ];

  const completedCount = checklistItems.filter((item) => item.checkFn()).length;
  const totalCount = checklistItems.length;
  const allCompleted = completedCount === totalCount;
  const progress = (completedCount / totalCount) * 100;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding-checklist-dismissed', 'true');
    }
  };

  // No mostrar si está descartado o si todo está completado
  if (dismissed || allCompleted) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent animate-enter">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Completa estos pasos para empezar</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
            title="Ocultar checklist"
            aria-label="Ocultar checklist de inicio"
          >
            <Icon name="X" size={14} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Stack direction="column" gap="md">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Text size="sm" color="secondary">
                Progreso
              </Text>
              <Text size="sm" weight="medium">
                {completedCount} de {totalCount}
              </Text>
            </div>
            <ProgressBar value={progress} variant="default" size="sm" />
          </div>

          {/* Checklist items */}
          <Stack direction="column" gap="sm">
            {checklistItems.map((item) => {
              const isCompleted = item.checkFn();
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors"
                >
                  <Checkbox
                    id={`checkbox-${item.id}`}
                    checked={isCompleted}
                    disabled
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Text
                      size="sm"
                      className={isCompleted ? 'line-through opacity-60' : ''}
                      weight={isCompleted ? 'normal' : 'medium'}
                    >
                      {item.label}
                    </Text>
                  </div>
                  {!isCompleted && (
                    <Link href={item.href}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs shrink-0">
                        Ir
                        <Icon name="ChevronRight" size={12} className="ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              );
            })}
          </Stack>

          {allCompleted && (
            <div className="mt-2 p-3 rounded-lg bg-success-subtle border border-success/20">
              <Stack direction="row" gap="sm" align="center">
                <Icon name="CheckCircle" size={20} className="text-success shrink-0" />
                <Text size="sm" weight="medium" className="text-success">
                  ¡Excelente! Has completado todos los pasos iniciales.
                </Text>
              </Stack>
            </div>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
