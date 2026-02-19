'use client';
import { useRequireAuth } from '@/auth/useRequireAuth';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { logger, toLogContext } from '@/lib/logger';
import { usePageTitle } from '../../components/PageTitleContext';
import { createContact } from '@/lib/api';
import { useInvalidateContactsCache } from '@/lib/api-hooks';
import { useFormValidation } from '@/lib/hooks/useFormValidation';
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
  Alert,
  Breadcrumbs,
  BreadcrumbItem,
  Spinner,
  Icon,
} from '@maatwork/ui';
import MarketTypeSelector from '../components/MarketTypeSelector';

// AI_DECISION: Zod schema for real-time form validation
// Justificación: Proporciona validación consistente en frontend y permite mensajes de error específicos
// Impacto: Mejor UX con feedback inmediato mientras el usuario escribe
const contactFormSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  lastName: z.string().min(1, 'El apellido es requerido').max(100, 'Máximo 100 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  notes: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
});

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  source: '',
  notes: '',
};

export default function NewContactPage() {
  const router = useRouter();
  const { user, loading } = useRequireAuth();

  // Set page title in header
  usePageTitle('Nuevo Contacto');

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
  const dataLoading = false;

  // Handler para cambios de campo con validación en tiempo real
  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      validateField(field, value);
    },
    [validateField]
  );

  // Handler para onBlur - marca el campo como tocado
  const handleFieldBlur = useCallback(
    (field: keyof FormData) => {
      touchField(field);
      // Re-validar el campo al perder el foco
      validateField(field, formData[field]);
    },
    [touchField, validateField, formData]
  );

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

      logger.info(
        toLogContext({
          userId: user?.id,
          userRole: user?.role,
          hasFirstName: !!formData.firstName.trim(),
          hasLastName: !!formData.lastName.trim(),
        }),
        'Contact creation form submitted'
      );

      const response = await createContact({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        source: formData.source.trim() || null,
        notes: formData.notes.trim() || null,
      });

      logger.info(
        toLogContext({
          responseSuccess: response.success,
          hasData: !!response.data,
          hasError: !!response.error,
          responseKeys: Object.keys(response),
        }),
        'Contact creation API response received'
      );

      if (response.success && response.data) {
        const createdContact = response.data;

        // Justificación: Mejor observabilidad y correlación con logs de API
        // Impacto: Logs estructurados y rastreables en producción
        logger.info(
          toLogContext({
            contactId: createdContact?.id,
            assignedAdvisorId: createdContact?.assignedAdvisorId,
            expectedAdvisorId: user?.id,
            userRole: user?.role,
          }),
          'Contact created successfully'
        );

        // Verify assignment for advisors
        if (user?.role === 'advisor' && createdContact?.assignedAdvisorId !== user.id) {
          logger.warn(
            toLogContext({
              expected: user.id,
              actual: createdContact?.assignedAdvisorId,
              contactId: createdContact?.id,
            }),
            'Advisor mismatch on contact creation'
          );
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
      logger.error(
        toLogContext({
          error: err instanceof Error ? err.message : 'Unknown error',
          errorType: (err instanceof Error) ? err.constructor.name : 'Unknown',
          userId: user?.id,
        }),
        'Contact creation failed'
      );
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

  if (isLoading) {
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
    <div className="max-w-4xl mx-auto p-4 md:p-5">
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
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Input
                        label="Nombre"
                        value={formData.firstName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('firstName', e.target.value)}
                        onBlur={() => handleFieldBlur('firstName')}
                        placeholder="Juan"
                        disabled={isLoading || submitLoading}
                        required
                        className="w-full"
                        autoFocus
                        error={validationErrors.firstName?.message}
                        {...(getFieldState('firstName').isValid && formData.firstName
                          ? { rightIcon: 'check-circle' as const }
                          : {})}
                      />
                    </div>
                    <div className="relative">
                      <Input
                        label="Apellido"
                        value={formData.lastName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('lastName', e.target.value)}
                        onBlur={() => handleFieldBlur('lastName')}
                        placeholder="Pérez"
                        disabled={isLoading || submitLoading}
                        required
                        className="w-full"
                        error={validationErrors.lastName?.message}
                        {...(getFieldState('lastName').isValid && formData.lastName
                          ? { rightIcon: 'check-circle' as const }
                          : {})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Correo Electrónico"
                      type="email"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
                      onBlur={() => handleFieldBlur('email')}
                      placeholder="juan.perez@email.com"
                      disabled={isLoading || submitLoading}
                      className="w-full"
                      error={validationErrors.email?.message}
                      {...(getFieldState('email').isValid && formData.email
                        ? { rightIcon: 'check-circle' as const }
                        : {})}
                    />

                    <Input
                      label="Teléfono"
                      value={formData.phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('phone', e.target.value)}
                      onBlur={() => handleFieldBlur('phone')}
                      placeholder="+54 9 11 1234-5678"
                      disabled={isLoading || submitLoading}
                      className="w-full"
                      error={validationErrors.phone?.message}
                    />
                  </div>

                  <div className="pt-2">
                    <MarketTypeSelector
                      value={formData.source}
                      onChange={(value) => handleInputChange('source', value)}
                      disabled={isLoading || submitLoading}
                    />
                  </div>
                </div>

                {/* Sección: Notas */}
                <div className="border-t border-gray-100 pt-6">
                  <div className="mb-4">
                    <Heading level={4} className="text-base font-semibold text-gray-900 mb-1">
                      Notas
                    </Heading>
                    <Text size="xs" color="secondary" className="text-gray-500">
                      Información adicional relevante del contacto
                    </Text>
                  </div>

                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Escribe aquí cualquier observación importante..."
                    disabled={isLoading || submitLoading}
                    rows={4}
                    maxLength={2000}
                    className="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
                  />
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
                      disabled={
                        isLoading || submitLoading || Object.keys(validationErrors).length > 0
                      }
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
          <div className="space-y-4 sticky top-4">
            {/* Card de Ayuda */}
            <Card className="bg-primary/5 border-primary/10 shadow-none" padding="sm">
              <CardContent className="p-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon name="info" size={18} className="text-primary" />
                  </div>
                  <div>
                    <Heading level={5} className="text-sm font-semibold text-text mb-1">
                      Creación Rápida
                    </Heading>
                    <Text size="xs" className="text-text-secondary leading-relaxed">
                      Completa los datos básicos para dar de alta al contacto. Por defecto, se
                      asignará a la etapa de <strong>Prospecto</strong>.
                    </Text>
                    <Text size="xs" className="text-text-secondary mt-2 leading-relaxed">
                      Podrás completar el perfil detallado, DNI y objetivos desde la ficha del
                      contacto una vez creado.
                    </Text>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="px-1">
              <Text size="xs" color="secondary" className="text-gray-400 italic">
                * Campos obligatorios: Nombre y Apellido.
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
