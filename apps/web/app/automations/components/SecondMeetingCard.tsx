'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Button,
  Text,
  Stack,
  Alert,
  Spinner,
} from '@cactus/ui';
import {
  getAutomationConfigByName,
  createAutomationConfig,
  updateAutomationConfig,
} from '@/lib/api/automations';
import type { AutomationConfig, UpdateAutomationConfigRequest } from '@/types/automation';
import { useToast } from '@/lib/hooks/useToast';
import { logger } from '@/lib/logger';
import { ApiError } from '@/lib/api-client';

const AUTOMATION_NAME = 'segunda_reunion_webhook';

export default function SecondMeetingCard() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(true);

  // Cargar configuración existente
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        // AI_DECISION: Handle 404 gracefully without generic error logging
        // Justificación: 404 is expected on first load, so we shouldn't log "Network error"
        // Note: The ApiClient might still log network errors if fetch fails, but 404 is a valid HTTP response.
        const response = await getAutomationConfigByName(AUTOMATION_NAME);

        if (response.success && response.data) {
          setConfig(response.data);
          setWebhookUrl(response.data.webhookUrl || '');
          setEnabled(response.data.enabled);
        } else {
          // Fallback if success=false but no error thrown (unlikely with current client)
          setWebhookUrl('http://localhost:5678/webhook-test/segunda-reunion');
          setEnabled(true);
        }
      } catch (err: unknown) {
        // Manejar 404 como "no existe configuración" (caso normal)
        if (err instanceof ApiError && err.status === 404) {
          // No existe configuración, usar valores por defecto
          // AI_DECISION: Log debug instead of error for expected 404
          logger.debug('Automation config not found (404), using defaults', {
            name: AUTOMATION_NAME,
          });
          setWebhookUrl('http://localhost:5678/webhook-test/segunda-reunion');
          setEnabled(true);
        } else {
          // Otro tipo de error
          logger.error('Error loading automation config', {
            error: err instanceof Error ? err.message : String(err),
            status: err instanceof ApiError ? err.status : undefined,
          });
          setError('Error al cargar la configuración');
        }
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleSave = useCallback(async () => {
    if (!webhookUrl) {
      showToast('Error', 'La URL del webhook es requerida', 'error');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (config) {
        // Actualizar existente
        const updateData: UpdateAutomationConfigRequest = {
          webhookUrl,
          enabled,
          // Mantener otros campos
          displayName: config.displayName,
          triggerType: config.triggerType,
          triggerConfig: config.triggerConfig,
          config: config.config,
        };

        const response = await updateAutomationConfig(config.id, updateData);
        if (response.success && response.data) {
          setConfig(response.data);
          showToast('Guardado', 'Configuración actualizada correctamente', 'success');
        }
      } else {
        // Crear nueva
        const createData = {
          name: AUTOMATION_NAME,
          displayName: 'Segunda Reunión Webhook',
          triggerType: 'pipeline_stage_change',
          triggerConfig: { stageName: 'Segunda reunion' },
          webhookUrl,
          enabled,
          config: {
            payload: {
              source: 'dashboard_crm',
              eventType: 'segunda_reunion_agendada',
            },
          },
        };

        const response = await createAutomationConfig(createData);
        if (response.success && response.data) {
          setConfig(response.data);
          showToast('Guardado', 'Configuración creada correctamente', 'success');
        }
      }
    } catch (err) {
      logger.error('Error saving automation config', {
        error: err instanceof Error ? err.message : String(err),
      });
      showToast('Error', 'No se pudo guardar la configuración. Revisa los logs.', 'error');
    } finally {
      setSaving(false);
    }
  }, [config, webhookUrl, enabled, showToast]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Automatización: Segunda Reunión</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack direction="column" gap="md">
          {error && (
            <Alert variant="error" title="Error">
              {error}
            </Alert>
          )}

          <div className="space-y-2">
            <Text weight="medium">Webhook URL (N8N)</Text>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://n8n.tu-dominio.com/webhook/..."
            />
            <Text size="xs" color="secondary">
              Se enviará una notificación a esta URL cuando un contacto pase a la etapa
              &quot;Segunda reunión&quot;.
            </Text>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled-check"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="enabled-check" className="text-sm font-medium text-text-primary">
              Habilitar automatización
            </label>
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} disabled={saving || !webhookUrl} loading={saving}>
              Guardar Configuración
            </Button>
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}
