'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Text, Stack, Button } from '@maatwork/ui';
import type { TeamInvitation } from '@/types';

interface InvitationsSectionProps {
  invitations: TeamInvitation[];
  actionLoading: string | null;
  onInvitation: (id: string, action: 'accept' | 'reject') => void;
}

/**
 * Sección de invitaciones a equipos
 */
export function InvitationsSection({
  invitations,
  actionLoading,
  onInvitation,
}: InvitationsSectionProps) {
  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card padding="sm">
      <CardHeader className="mb-2">
        <CardTitle>Invitaciones a equipos</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack direction="column" gap="xs">
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-2 border rounded-lg">
              <div>
                <Text weight="medium" size="sm">
                  Invitación de {inv.team?.name || 'Equipo'}
                </Text>
                <Text size="xs" color="secondary">
                  {new Date(inv.createdAt).toLocaleString('es-ES')}
                </Text>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={actionLoading === `inv-${inv.id}`}
                  onClick={() => onInvitation(inv.id, 'accept')}
                >
                  Aceptar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading === `inv-${inv.id}`}
                  onClick={() => onInvitation(inv.id, 'reject')}
                >
                  Rechazar
                </Button>
              </div>
            </div>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
