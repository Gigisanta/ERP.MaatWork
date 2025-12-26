'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Text, Stack } from '@maatwork/ui';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '@/lib/api-url';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/lib/hooks/useToast';

export function GoogleCalendarSection() {
  const { user, mutateUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  // AI_DECISION: Detectar callback de OAuth y actualizar usuario
  // Justificación: Después del OAuth, el backend redirige con ?google_connect=success
  //                Necesitamos actualizar el estado del usuario para mostrar "Conectado"
  // Impacto: UI se actualiza automáticamente después de conectar
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Check for specific success param from backend
      if (params.get('google_connect') === 'success') {
        mutateUser();
        // Clean up URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        showToast('Cuenta de Google conectada correctamente', 'success');
      }
    }
    // AI_DECISION: Solo ejecutar una vez al montar
    // Justificación: El query param solo aparece una vez después del OAuth
    //                No necesitamos re-ejecutar este efecto
  }, []); // Ejecutar solo al montar

  const handleConnect = () => {
    // Redirigir al endpoint de inicio de OAuth
    window.location.href = `${API_BASE_URL}/v1/auth/google/init?redirect=/profile`;
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        '¿Estás seguro de que deseas desconectar tu cuenta de Google? Dejarás de ver tus eventos en el calendario.'
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.delete('/v1/auth/google/disconnect');
      showToast('Cuenta de Google desconectada correctamente', 'success');
      await mutateUser(); // Recargar datos del usuario para actualizar estado
    } catch (error) {
      showToast('Error al desconectar la cuenta', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Card padding="sm" className="p-2">
      <CardHeader className="mb-1.5">
        <CardTitle>Integraciones</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack direction="column" gap="sm">
          <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface">
            <div>
              <Text weight="medium">Google Calendar</Text>
              <Text size="xs" color="secondary">
                {user.isGoogleConnected
                  ? 'Conectado. Tus eventos se sincronizan en el dashboard.'
                  : 'Sincroniza tus eventos personales con el dashboard.'}
              </Text>
            </div>

            {user.isGoogleConnected ? (
              <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={loading}>
                {loading ? 'Desconectando...' : 'Desconectar'}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleConnect}>
                Conectar
              </Button>
            )}
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}
