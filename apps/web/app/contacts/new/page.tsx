'use client';
import { useRequireAuth } from '../../auth/useRequireAuth';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { logger, toLogContext } from '@/lib/logger';
import { usePageTitle } from '../../components/PageTitleContext';
import { createContact } from '@/lib/api';
import { usePipelineStages, useAdvisors, useInvalidateContactsCache } from '@/lib/api-hooks';
import { useFormValidation } from '@/lib/hooks/useFormValidation';
import type { PipelineStage, Advisor } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Heading,
  Text,
  Stack,
  Input,
  Select,
  Alert,
  Breadcrumbs,
  BreadcrumbItem,
  Spinner,
  Icon,
} from '@cactus/ui';
import MarketTypeSelector from '../components/MarketTypeSelector';

// AI_DECISION: Zod schema for real-time form validation
// Justificación: Proporciona validación consistente en frontend y permite mensajes de error específicos
// Impacto: Mejor UX con feedback inmediato mientras el usuario escribe
const contactFormSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  lastName: z.string().min(1, 'El apellido es requerido').max(100, 'Máximo 100 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
  dni: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
  pipelineStageId: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  riskProfile: z.enum(['low', 'mid', 'high', '']).optional(),
  notes: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
  queSeDedica: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
  familia: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
  expectativas: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
  objetivos: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
  requisitosPlanificacion: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
});

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dni: string;
  pipelineStageId: string;
  source: string;
  riskProfile: 'low' | 'mid' | 'high' | '';
  notes: string;
  queSeDedica: string;
  familia: string;
  expectativas: string;
  objetivos: string;
  requisitosPlanificacion: string;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dni: '',
  pipelineStageId: '',
  source: '',
  riskProfile: '',
  notes: '',
  queSeDedica: '',
  familia: '',
  expectativas: '',
  objetivos: '',
  requisitosPlanificacion: '',
};

export default function NewContactPage() {
  const router = useRouter();
  const { user, loading } = useRequireAuth();

  // Set page title in header
  usePageTitle('Nuevo Contacto');

  // Use SWR hooks for data fetching with automatic caching and deduplication
  const {
    stages: pipelineStages,
    isLoading: stagesLoading,
    error: stagesError,
  } = usePipelineStages();
  const { advisors, isLoading: advisorsLoading, error: advisorsError } = useAdvisors();
  const invalidateContactsCache = useInvalidateContactsCache();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // AI_DECISION: Usar useFormValidation para validación en tiempo real
  // Justificación: Proporciona feedback inmediato mientras el usuario escribe
  // Impacto: Mejor UX, menos frustración al enviar formularios con errores
  const {
    errors: validationErrors,
    isValid,
    validateField,
    validateAll,
    touchField,
    getFieldState,
    clearErrors,
  } = useFormValidation({
    schema: contactFormSchema,
    debounceMs: 300,
  });

  // Derive loading state from SWR hooks
  const dataLoading = stagesLoading || advisorsLoading;

  // Set error if SWR hooks have errors
  if (stagesError && !error) {
    logger.error('Error fetching pipeline stages', toLogContext({ err: stagesError }));
  }
  if (advisorsError && !error) {
    logger.error('Error fetching advisors', toLogContext({ err: advisorsError }));
  }

  // Handler para cambios de campo con validación en tiempo real
  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  }, [validateField]);

  // Handler para onBlur - marca el campo como tocado
  const handleFieldBlur = useCallback((field: keyof FormData) => {
    touchField(field);
    // Re-validar el campo al perder el foco
    validateField(field, formData[field]);
  }, [touchField, validateField, formData]);

  // Validar formulario antes de enviar
  const validateForm = useCallback((): boolean => {
    const isFormValid = validateAll(formData);
    
    if (!isFormValid) {
      setError('Por favor corrige los errores en el formulario');
      return false;
    }

    setError(null);
    return true;
  }, [validateAll, formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !user) return;

    try {
      setSubmitLoading(true);
      setError(null);

      logger.info('Contact creation form submitted', {
        userId: user?.id,
        userRole: user?.role,
        hasFirstName: !!formData.firstName.trim(),
        hasLastName: !!formData.lastName.trim(),
      });

      const response = await createContact({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        dni: formData.dni.trim() || null,
        pipelineStageId: formData.pipelineStageId || null,
        source: formData.source.trim() || null,
        riskProfile: formData.riskProfile || null,
        notes: formData.notes.trim() || null,
        queSeDedica: formData.queSeDedica.trim() || null,
        familia: formData.familia.trim() || null,
        expectativas: formData.expectativas.trim() || null,
        objetivos: formData.objetivos.trim() || null,
        requisitosPlanificacion: formData.requisitosPlanificacion.trim() || null,
      });

      logger.info('Contact creation API response received', {
        responseSuccess: response.success,
        hasData: !!response.data,
        hasError: !!response.error,
        responseKeys: Object.keys(response),
      });

      if (response.success && response.data) {
        const createdContact = response.data;

        // Justificación: Mejor observabilidad y correlación con logs de API
        // Impacto: Logs estructurados y rastreables en producción
        logger.info('Contact created successfully', {
          contactId: createdContact?.id,
          assignedAdvisorId: createdContact?.assignedAdvisorId,
          expectedAdvisorId: user?.id,
          userRole: user?.role,
        });

        // Verify assignment for advisors
        if (user?.role === 'advisor' && createdContact?.assignedAdvisorId !== user.id) {
          logger.warn('Advisor mismatch on contact creation', {
            expected: user.id,
            actual: createdContact?.assignedAdvisorId,
            contactId: createdContact?.id,
          });
        }

        // Invalidate contacts cache and wait for revalidation to complete
        // This ensures fresh data is fetched before navigation
        await invalidateContactsCache();

        setSuccess(true);
        setFormData(initialFormData);
        clearErrors(); // Limpiar errores de validación

        // Navigate with refresh parameter to force revalidation on contacts page
        // This ensures the page updates immediately with the new contact
        router.replace('/contacts?refresh=true');
      } else {
        throw new Error(response.error || 'Error al crear contacto');
      }
    } catch (err) {
      logger.error('Contact creation failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err?.constructor?.name,
        userId: user?.id,
      });
      setError(err instanceof Error ? err.message : 'Error al crear contacto');
    } finally {
      setSubmitLoading(false);
    }
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { href: '/contacts', label: 'Contactos' },
    { href: '/contacts/new', label: 'Nuevo Contacto' },
  ];

  // Show loading state while auth or data is loading
  const isLoading = loading || dataLoading;

  if (isLoading && !(pipelineStages as PipelineStage[]).length) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <Stack direction="column" gap="md" align="center">
          <Spinner size="lg" />
          <Text color="secondary">Cargando formulario...</Text>
        </Stack>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto p-4 md:p-5 min-h-screen">
        {/* Breadcrumbs */}
        <div className="mb-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* Header */}
        <div className="mb-5">
          <div className="flex justify-between items-start">
            <div>
              <Text size="base" color="secondary" className="text-gray-600">
                Agrega un nuevo contacto al sistema CRM
              </Text>
            </div>
            <Button
              variant="secondary"
              onClick={() => router.push('/contacts')}
              className="shrink-0"
              size="sm"
            >
              ← Volver
            </Button>
          </div>
        </div>

        {/* Formulario Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
          {/* Columna Principal - Información del Contacto */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm" padding="sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Información Personal
                </CardTitle>
                <Text size="xs" color="secondary" className="text-gray-600">
                  Datos básicos del contacto
                </Text>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  {/* Alertas */}
                  {error && (
                    <Alert variant="error" className="mb-6">
                      {error}
                    </Alert>
                  )}
                  {success && (
                    <Alert variant="success" title="¡Contacto creado!" className="mb-6">
                      El contacto ha sido creado exitosamente. Redirigiendo...
                    </Alert>
                  )}

                  {/* Sección: Datos Personales */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <Input
                          label="Nombre"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          onBlur={() => handleFieldBlur('firstName')}
                          placeholder="Juan"
                          disabled={isLoading || submitLoading}
                          required
                          className="w-full"
                          autoFocus
                          error={validationErrors.firstName?.message}
                          {...(getFieldState('firstName').isValid && formData.firstName ? { rightIcon: 'check-circle' as const } : {})}
                        />
                      </div>
                      <div className="relative">
                        <Input
                          label="Apellido"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          onBlur={() => handleFieldBlur('lastName')}
                          placeholder="Pérez"
                          disabled={isLoading || submitLoading}
                          required
                          className="w-full"
                          error={validationErrors.lastName?.message}
                          {...(getFieldState('lastName').isValid && formData.lastName ? { rightIcon: 'check-circle' as const } : {})}
                        />
                      </div>
                    </div>

                    <Input
                      label="Correo Electrónico"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      onBlur={() => handleFieldBlur('email')}
                      placeholder="juan.perez@email.com"
                      disabled={loading}
                      className="w-full"
                      error={validationErrors.email?.message}
                      {...(getFieldState('email').isValid && formData.email ? { rightIcon: 'check-circle' as const } : {})}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Teléfono"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        onBlur={() => handleFieldBlur('phone')}
                        placeholder="+54 9 11 1234-5678"
                        disabled={isLoading || submitLoading}
                        className="w-full"
                        error={validationErrors.phone?.message}
                      />
                      <Input
                        label="DNI"
                        value={formData.dni}
                        onChange={(e) => handleInputChange('dni', e.target.value)}
                        onBlur={() => handleFieldBlur('dni')}
                        placeholder="12.345.678"
                        disabled={isLoading || submitLoading}
                        className="w-full"
                        error={validationErrors.dni?.message}
                      />
                    </div>
                  </div>

                  {/* Separador Visual */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="mb-3">
                      <Heading level={4} className="text-base font-semibold text-gray-900 mb-1.5">
                        Información Comercial
                      </Heading>
                      <Text size="xs" color="secondary" className="text-gray-600">
                        Datos para el seguimiento comercial
                      </Text>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Select
                        label="Etapa del Pipeline"
                        value={formData.pipelineStageId}
                        onValueChange={(value) => handleInputChange('pipelineStageId', value)}
                        disabled={isLoading || submitLoading}
                        items={(pipelineStages as PipelineStage[]).map((stage) => ({
                          value: stage.id,
                          label: stage.name,
                        }))}
                        placeholder="Selecciona una etapa"
                        className="w-full bg-white border-gray-300 shadow-sm"
                      />
                      <Select
                        label="Perfil de Riesgo"
                        value={formData.riskProfile}
                        onValueChange={(value) => handleInputChange('riskProfile', value)}
                        disabled={isLoading || submitLoading}
                        items={[
                          { value: 'low', label: 'Bajo' },
                          { value: 'mid', label: 'Medio' },
                          { value: 'high', label: 'Alto' },
                        ]}
                        placeholder="Selecciona perfil"
                        className="w-full bg-white border-gray-300 shadow-sm"
                      />
                    </div>

                    <div className="mt-4">
                      <MarketTypeSelector
                        value={formData.source}
                        onChange={(value) => handleInputChange('source', value)}
                        disabled={isLoading || submitLoading}
                      />
                    </div>
                  </div>

                  {/* Sección: Notas */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="mb-3">
                      <Heading level={4} className="text-base font-semibold text-gray-900 mb-1.5">
                        Notas Adicionales
                      </Heading>
                      <Text size="xs" color="secondary" className="text-gray-600">
                        Información adicional sobre el contacto
                      </Text>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Información adicional sobre el contacto..."
                        disabled={isLoading || submitLoading}
                        rows={4}
                        maxLength={2000}
                        className="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
                      />
                    </div>
                  </div>

                  {/* Sección: Información Personal Adicional */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="mb-3">
                      <Heading level={4} className="text-base font-semibold text-gray-900 mb-1.5">
                        Información Personal Adicional
                      </Heading>
                      <Text size="xs" color="secondary" className="text-gray-600">
                        Información detallada sobre el contacto
                      </Text>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          A qué se dedica
                        </label>
                        <textarea
                          value={formData.queSeDedica}
                          onChange={(e) => handleInputChange('queSeDedica', e.target.value)}
                          placeholder="Describe a qué se dedica el contacto..."
                          disabled={isLoading || submitLoading}
                          rows={3}
                          maxLength={2000}
                          className="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Familia
                        </label>
                        <textarea
                          value={formData.familia}
                          onChange={(e) => handleInputChange('familia', e.target.value)}
                          placeholder="Información sobre la familia del contacto..."
                          disabled={isLoading || submitLoading}
                          rows={3}
                          maxLength={2000}
                          className="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expectativas
                        </label>
                        <textarea
                          value={formData.expectativas}
                          onChange={(e) => handleInputChange('expectativas', e.target.value)}
                          placeholder="Expectativas del contacto..."
                          disabled={isLoading || submitLoading}
                          rows={3}
                          maxLength={2000}
                          className="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Objetivos
                        </label>
                        <textarea
                          value={formData.objetivos}
                          onChange={(e) => handleInputChange('objetivos', e.target.value)}
                          placeholder="Objetivos del contacto..."
                          disabled={isLoading || submitLoading}
                          rows={3}
                          maxLength={2000}
                          className="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ¿Qué tendría que tener tu planificación para que avancemos?
                        </label>
                        <textarea
                          value={formData.requisitosPlanificacion}
                          onChange={(e) =>
                            handleInputChange('requisitosPlanificacion', e.target.value)
                          }
                          placeholder="Requisitos o condiciones para avanzar con la planificación..."
                          disabled={isLoading || submitLoading}
                          rows={3}
                          maxLength={2000}
                          className="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>

                {/* Botones de Acción */}
                <CardFooter className="bg-surface-hover px-4 py-3 border-t border-border">
                  <div className="flex justify-between items-center w-full">
                    {/* Indicador de validación */}
                    <div className="flex items-center gap-2">
                      {Object.keys(validationErrors).length > 0 && (
                        <Text size="xs" className="text-error flex items-center gap-1">
                          <Icon name="alert-circle" size={14} />
                          {Object.keys(validationErrors).length} campo(s) con error
                        </Text>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.push('/contacts')}
                        disabled={submitLoading}
                        size="sm"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isLoading || submitLoading || Object.keys(validationErrors).length > 0} 
                        size="sm"
                      >
                        {submitLoading ? 'Creando...' : 'Crear Contacto'}
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Columna Lateral - Información de Ayuda */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Card de Ayuda */}
              <Card className="bg-info-subtle border-info/30" padding="sm">
                <CardContent className="p-3">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-info/20 rounded-full flex items-center justify-center">
                        <span className="text-info text-xs">💡</span>
                      </div>
                    </div>
                    <div>
                      <Heading level={5} className="text-xs font-semibold text-text mb-0.5">
                        Consejos
                      </Heading>
                      <Text size="xs" className="text-text-secondary">
                        Solo los campos Nombre y Apellido son obligatorios. Los demás campos son
                        opcionales pero recomendados.
                      </Text>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Información del Pipeline */}
              {(pipelineStages as PipelineStage[]).length > 0 && (
                <Card padding="sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-text">
                      Etapas del Pipeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5">
                      {(pipelineStages as PipelineStage[]).slice(0, 3).map((stage) => (
                        <div key={stage.id} className="flex items-center space-x-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <Text size="xs" className="text-text-secondary">
                            {stage.name}
                          </Text>
                        </div>
                      ))}
                      {(pipelineStages as PipelineStage[]).length > 3 && (
                        <Text size="xs" className="text-text-muted">
                          +{(pipelineStages as PipelineStage[]).length - 3} más...
                        </Text>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
