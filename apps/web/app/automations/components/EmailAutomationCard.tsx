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
  Badge,
} from '@maatwork/ui';
import {
  getAutomationConfigByName,
  createAutomationConfig,
  updateAutomationConfig,
} from '@/lib/api/automations';
import type { AutomationConfig, UpdateAutomationConfigRequest } from '@/types/automation';
import { useToast } from '@/lib/hooks/useToast';
import { logger, toLogContextValue } from '@/lib/logger';
import { ApiError, apiClient } from '@/lib/api-client';
import { useAuth } from '@/app/auth/AuthContext';
import { GoogleOAuthButton } from '@/app/components/auth/GoogleOAuthButton';
import RichTextEditor from '@/app/components/editors/RichTextEditor';

interface EmailAutomationCardProps {
  automationName: string;
  displayName: string;
  description: string;
  triggerStageName: string; // The stage name that triggers this
  defaultSubject: string;
  defaultBody: string;
}

interface EmailConfig {
  subject: string;
  body: string;
  senderEmail: string;
}

const AVAILABLE_VARIABLES = [
  { label: 'Nombre Cliente', value: '{contact.firstName}' },
  { label: 'Nombre Completo', value: '{contact.fullName}' },
  { label: 'Etiquetas', value: '{contact.tagNames}' },
  { label: 'Nombre Asesor', value: '{advisor.fullName}' },
];

export default function EmailAutomationCard({
  automationName,
  displayName,
  description,
  triggerStageName,
  defaultSubject,
  defaultBody,
}: EmailAutomationCardProps) {
  const { user, mutateUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AutomationConfig | null>(null);

  // Form State
  const [enabled, setEnabled] = useState(true);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [senderEmail, setSenderEmail] = useState('');

  // AI_DECISION: Corregir bug de persistencia de senderEmail
  // Justificación: El useEffect secundario sobrescribía el senderEmail guardado al recargar
  // Impacto: La configuración guardada ahora se mantiene correctamente después de recargar
  // Load Config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getAutomationConfigByName(automationName);

        if (response.success && response.data) {
          // Configuración existente - usar EXACTAMENTE lo guardado
          setConfig(response.data);
          setEnabled(response.data.enabled);

          const emailConfig = response.data.config as unknown as EmailConfig;
          if (emailConfig) {
            setSubject(emailConfig.subject || defaultSubject);
            setBody(emailConfig.body || defaultBody);
            setSenderEmail(emailConfig.senderEmail || '');
          }
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 404) {
          // Nueva configuración (404) - establecer email del usuario como default
          logger.debug('Automation config not found (404), using defaults', {
            name: automationName,
          });
          if (user?.isGoogleConnected && user.googleEmail) {
            setSenderEmail(user.googleEmail);
          }
        } else {
          logger.error('Error loading automation config', { error: toLogContextValue(err) });
          setError('Error al cargar la configuración');
        }
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [automationName, defaultSubject, defaultBody, user]);

  const handleSave = useCallback(async () => {
    if (!user?.isGoogleConnected) {
      showToast('Error', 'Debes conectar tu cuenta de Google primero', 'error');
      return;
    }

    if (!senderEmail) {
      showToast('Error', 'Debes seleccionar un email de envío', 'error');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const emailConfig: EmailConfig = {
        subject,
        body,
        senderEmail,
      };

      if (config) {
        // Update
        const updateData: UpdateAutomationConfigRequest = {
          enabled,
          config: emailConfig as unknown as Record<string, unknown>,
        };

        const response = await updateAutomationConfig(config.id, updateData);
        if (response.success && response.data) {
          setConfig(response.data);
          showToast('Guardado', 'Configuración actualizada correctamente', 'success');
        }
      } else {
        // Create
        const createData = {
          name: automationName,
          displayName,
          triggerType: 'pipeline_stage_change',
          triggerConfig: { stageName: triggerStageName },
          enabled,
          config: emailConfig as unknown as Record<string, unknown>,
        };

        const response = await createAutomationConfig(createData);
        if (response.success && response.data) {
          setConfig(response.data);
          showToast('Guardado', 'Configuración creada correctamente', 'success');
        }
      }
    } catch (err) {
      logger.error('Error saving automation config', { error: toLogContextValue(err) });
      showToast('Error', 'No se pudo guardar la configuración', 'error');
    } finally {
      setSaving(false);
    }
  }, [
    config,
    enabled,
    subject,
    body,
    senderEmail,
    automationName,
    displayName,
    triggerStageName,
    user,
    showToast,
  ]);

  const handleGoogleSuccess = () => {
    mutateUser();
    showToast('Conectado', 'Cuenta de Google conectada exitosamente', 'success');
  };

  // AI_DECISION: Función de upload de imágenes para el editor
  // Justificación: Encapsula la lógica de upload y manejo de errores
  // Impacto: Editor puede subir imágenes de forma transparente
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await apiClient.post<{ url: string }>('/v1/uploads/images', formData);

      if (response.success && response.data?.url) {
        // AI_DECISION: Convertir URL relativa a absoluta para emails
        // Justificación: Emails necesitan URLs absolutas para mostrar imágenes
        // Impacto: Imágenes se ven correctamente en emails enviados
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return `${baseUrl}${response.data.url}`;
      }

      throw new Error('No se recibió URL de la imagen');
    } catch (error) {
      logger.error('Error uploading image', { error: toLogContextValue(error) });
      throw new Error('Error al subir la imagen');
    }
  }, []);

  // Drag and Drop Logic for variables
  const handleDragStart = (e: React.DragEvent, value: string) => {
    e.dataTransfer.setData('text/plain', value);
  };

  const handleDrop = (
    e: React.DragEvent<HTMLInputElement>,
    setter: (val: string) => void,
    currentValue: string
  ) => {
    e.preventDefault();
    const value = e.dataTransfer.getData('text/plain');
    const target = e.target as HTMLInputElement;

    // Insert at cursor position
    const startPos = target.selectionStart || 0;
    const endPos = target.selectionEnd || 0;

    const newValue = currentValue.substring(0, startPos) + value + currentValue.substring(endPos);

    setter(newValue);

    // Restore focus and cursor position (delayed to allow render)
    setTimeout(() => {
      target.focus();
      target.setSelectionRange(startPos + value.length, startPos + value.length);
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{displayName}</CardTitle>
            <Text size="sm" color="secondary" className="mt-1">
              {description}
            </Text>
          </div>
          <Badge variant={enabled ? 'success' : 'default'}>{enabled ? 'Activo' : 'Inactivo'}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Stack direction="column" gap="md">
          {error && (
            <Alert variant="error" title="Error">
              {error}
            </Alert>
          )}

          {/* Toggle Enable */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`enabled-${automationName}`}
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label
              htmlFor={`enabled-${automationName}`}
              className="text-sm font-medium text-text-primary"
            >
              Habilitar automatización
            </label>
          </div>

          {/* Google Account Status */}
          <div className="p-4 bg-background-subtle rounded-md border border-border">
            <Text weight="medium" className="mb-2">
              Cuenta de envío (Gmail)
            </Text>

            {user?.isGoogleConnected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <Text>{user.googleEmail || 'Cuenta conectada'}</Text>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Text size="sm" color="warning">
                  No tienes una cuenta de Google conectada. Necesitas conectar una cuenta para
                  enviar emails.
                </Text>
                <div className="w-fit">
                  <GoogleOAuthButton
                    mode="connect"
                    onSuccess={handleGoogleSuccess}
                    label="Conectar cuenta de Google"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Draggable Variables */}
          <div className="bg-surface p-3 rounded-md border border-border-subtle">
            <Text size="sm" weight="medium" className="mb-2 text-text-secondary">
              Variables disponibles (arrástralas al texto):
            </Text>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_VARIABLES.map((v) => (
                <div
                  key={v.value}
                  draggable
                  onDragStart={(e) => handleDragStart(e, v.value)}
                  className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded cursor-grab active:cursor-grabbing hover:bg-primary/20 transition-colors border border-transparent hover:border-primary/30"
                >
                  {v.label}
                </div>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Text weight="medium">Asunto</Text>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del correo"
              onDrop={(e) => handleDrop(e, setSubject, subject)}
              onDragOver={handleDragOver}
            />
          </div>

          {/* Body - Rich Text Editor */}
          <div className="space-y-2">
            <Text weight="medium">Contenido</Text>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="Escribe el contenido del correo aquí..."
              onImageUpload={handleImageUpload}
            />
            <Text size="xs" color="secondary">
              Usa la barra de herramientas para formatear el texto. Arrastra las variables para
              personalizarlas.
            </Text>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving || !user?.isGoogleConnected}
              loading={saving}
            >
              Guardar Configuración
            </Button>
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}
