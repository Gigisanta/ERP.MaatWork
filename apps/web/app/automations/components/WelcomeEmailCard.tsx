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

const AUTOMATION_NAME = 'mail_bienvenida';

export default function WelcomeEmailCard() {
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

        const response = await getAutomationConfigByName(AUTOMATION_NAME);

        if (response.success && response.data) {
          setConfig(response.data);
          setWebhookUrl(response.data.webhookUrl || '');
          setEnabled(response.data.enabled);
        } else {
          // No existe configuración, usar valores por defecto
          setWebhookUrl('http://localhost:5678/webhook-test/abax-bienvenida-upload');
          setEnabled(true);
        }
      } catch (err: unknown) {
        // Manejar 404 como "no existe configuración" (caso normal)
        if (err instanceof ApiError && err.status === 404) {
          // No existe configuración, usar valores por defecto
          setWebhookUrl('http://localhost:5678/webhook-test/abax-bienvenida-upload');
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
    try {
      setSaving(true);
      setError(null);

      // Validar URL si está habilitada
      if (enabled && webhookUrl && !isValidUrl(webhookUrl)) {
        setError('La URL del webhook no es válida');
        return;
      }

      const updateData: UpdateAutomationConfigRequest = {
        webhookUrl: webhookUrl || null,
        enabled,
      };

      if (config) {
        // Actualizar configuración existente
        const response = await updateAutomationConfig(config.id, updateData);

        if (response.success && response.data) {
          setConfig(response.data);
          setWebhookUrl(response.data.webhookUrl || '');
          setEnabled(response.data.enabled);
          showToast('Configuración guardada exitosamente', undefined, 'success');
        } else {
          throw new Error(response.error || 'Error al guardar');
        }
      } else {
        // Crear nueva configuración
        const response = await createAutomationConfig({
          name: AUTOMATION_NAME,
          displayName: 'Mail de bienvenida',
          triggerType: 'pipeline_stage_change',
          triggerConfig: { stageName: 'Cliente' },
          webhookUrl: webhookUrl || null,
          enabled,
          config: {},
        });

        if (response.success && response.data) {
          setConfig(response.data);
          setWebhookUrl(response.data.webhookUrl || '');
          setEnabled(response.data.enabled);
          showToast('Configuración creada exitosamente', undefined, 'success');
        } else {
          throw new Error(response.error || 'Error al crear');
        }
      }
    } catch (err) {
      logger.error('Error saving automation config', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError(err instanceof Error ? err.message : 'Error al guardar la configuración');
      showToast(
        'Error al guardar',
        err instanceof Error ? err.message : 'Error desconocido',
        'error'
      );
    } finally {
      setSaving(false);
    }
  }, [config, webhookUrl, enabled, showToast]);

  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Stack direction="column" gap="md" align="center">
            <Spinner size="lg" />
            <Text color="secondary">Cargando configuración...</Text>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mail de bienvenida</CardTitle>
        <Text size="sm" color="secondary">
          Configura el webhook que se activará cuando un contacto cambie a estado
          &quot;Cliente&quot;
        </Text>
      </CardHeader>
      <CardContent>
        <Stack direction="column" gap="md">
          {error && (
            <Alert variant="error" title="Error">
              {error}
            </Alert>
          )}

          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background"
              />
              <Text size="sm" weight="medium">
                Habilitar automatización
              </Text>
            </label>
            <Text size="xs" color="secondary">
              Cuando está habilitada, se enviará un webhook al cambiar un contacto a estado
              &quot;Cliente&quot;
            </Text>
          </div>

          <div>
            <Input
              label="URL del webhook de N8N"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="http://localhost:5678/webhook-test/abax-bienvenida-upload"
              disabled={saving}
            />
            <Text size="xs" color="secondary" className="mt-1">
              URL completa del webhook de N8N que recibirá los datos del contacto
            </Text>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || (enabled && !webhookUrl)}
            >
              {saving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Guardando...
                </>
              ) : (
                'Guardar configuración'
              )}
            </Button>
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}
