"use client";
import { useRequireAuth } from '../../auth/useRequireAuth';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logger } from '../../../lib/logger';
import { usePageTitle } from '../../components/PageTitleContext';
import { createContact } from '@/lib/api';
import { usePipelineStages, useAdvisors, useInvalidateContactsCache } from '@/lib/api-hooks';
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
} from '@cactus/ui';

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
  notes: ''
};

export default function NewContactPage() {
  const router = useRouter();
  const { user, loading } = useRequireAuth();
  
  // Set page title in header
  usePageTitle('Nuevo Contacto');
  
  // Use SWR hooks for data fetching with automatic caching and deduplication
  const { stages: pipelineStages, isLoading: stagesLoading, error: stagesError } = usePipelineStages();
  const { advisors, isLoading: advisorsLoading, error: advisorsError } = useAdvisors();
  const invalidateContactsCache = useInvalidateContactsCache();
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Derive loading state from SWR hooks
  const dataLoading = stagesLoading || advisorsLoading;
  
  // Set error if SWR hooks have errors
  if (stagesError && !error) {
    logger.error('Error fetching pipeline stages', { err: stagesError });
  }
  if (advisorsError && !error) {
    logger.error('Error fetching advisors', { err: advisorsError });
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      setError('El nombre es requerido');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('El apellido es requerido');
      return false;
    }
    return true;
  };

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
        hasLastName: !!formData.lastName.trim()
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
        notes: formData.notes.trim() || null
      });
      
      logger.info('Contact creation API response received', {
        responseSuccess: response.success,
        hasData: !!response.data,
        hasError: !!response.error,
        responseKeys: Object.keys(response)
      });
      
      if (response.success && response.data) {
        const createdContact = response.data;
        
        // Justificación: Mejor observabilidad y correlación con logs de API
        // Impacto: Logs estructurados y rastreables en producción
        logger.info('Contact created successfully', {
          contactId: createdContact?.id,
          assignedAdvisorId: createdContact?.assignedAdvisorId,
          expectedAdvisorId: user?.id,
          userRole: user?.role
        });
        
        // Verify assignment for advisors
        if (user?.role === 'advisor' && createdContact?.assignedAdvisorId !== user.id) {
          logger.warn('Advisor mismatch on contact creation', {
            expected: user.id,
            actual: createdContact?.assignedAdvisorId,
            contactId: createdContact?.id
          });
        }
        
        // Invalidate contacts cache and wait for revalidation to complete
        // This ensures fresh data is fetched before navigation
        await invalidateContactsCache();
        
        setSuccess(true);
        setFormData(initialFormData);
        
        // Use replace instead of push to avoid adding to history
        // This ensures the page updates correctly when navigating
        router.replace('/contacts');
      } else {
        throw new Error(response.error || 'Error al crear contacto');
      }
    } catch (err) {
      logger.error('Contact creation failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
        errorType: err?.constructor?.name,
        userId: user?.id
      });
      setError(err instanceof Error ? err.message : 'Error al crear contacto');
    } finally {
      setSubmitLoading(false);
    }
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { href: '/contacts', label: 'Contactos' },
    { href: '/contacts/new', label: 'Nuevo Contacto' }
  ];

  // Show loading state while auth or data is loading
  const isLoading = loading || dataLoading;
  
  if (isLoading && !pipelineStages.length) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto p-6 min-h-screen">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <Text size="lg" color="secondary" className="text-gray-600">
                Agrega un nuevo contacto al sistema CRM
              </Text>
            </div>
            <Button 
              variant="secondary" 
              onClick={() => router.push('/contacts')}
              className="shrink-0"
            >
              ← Volver a Contactos
            </Button>
          </div>
        </div>

        {/* Formulario Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Principal - Información del Contacto */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold text-gray-900">
                  Información Personal
                </CardTitle>
                <Text size="sm" color="secondary" className="text-gray-600">
                  Datos básicos del contacto
                </Text>
              </CardHeader>
              
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
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
                      <Input
                        label="Nombre"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Juan"
                        disabled={isLoading || submitLoading}
                        required
                        className="w-full"
                      />
                      <Input
                        label="Apellido"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Pérez"
                        disabled={isLoading || submitLoading}
                        required
                        className="w-full"
                      />
                    </div>
                    
                    <Input
                      label="Correo Electrónico"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="juan.perez@email.com"
                      disabled={loading}
                      className="w-full"
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Teléfono"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+54 9 11 1234-5678"
                        disabled={isLoading || submitLoading}
                        className="w-full"
                      />
                      <Input
                        label="DNI"
                        value={formData.dni}
                        onChange={(e) => handleInputChange('dni', e.target.value)}
                        placeholder="12.345.678"
                        disabled={isLoading || submitLoading}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Separador Visual */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="mb-4">
                      <Heading level={4} className="text-lg font-semibold text-gray-900 mb-2">
                        Información Comercial
                      </Heading>
                      <Text size="sm" color="secondary" className="text-gray-600">
                        Datos para el seguimiento comercial
                      </Text>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        label="Etapa del Pipeline"
                        value={formData.pipelineStageId}
                        onValueChange={(value) => handleInputChange('pipelineStageId', value)}
                        disabled={isLoading || submitLoading}
                        items={pipelineStages.map(stage => ({
                          value: stage.id,
                          label: stage.name
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
                          { value: 'high', label: 'Alto' }
                        ]}
                        placeholder="Selecciona perfil"
                        className="w-full bg-white border-gray-300 shadow-sm"
                      />
                    </div>
                    
                    <div className="mt-4">
                      <Input
                        label="Fuente de Contacto"
                        value={formData.source}
                        onChange={(e) => handleInputChange('source', e.target.value)}
                        placeholder="Ej: LinkedIn, Referido, Google Ads..."
                        disabled={isLoading || submitLoading}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Sección: Notas */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="mb-4">
                      <Heading level={4} className="text-lg font-semibold text-gray-900 mb-2">
                        Notas Adicionales
                      </Heading>
                      <Text size="sm" color="secondary" className="text-gray-600">
                        Información adicional sobre el contacto
                      </Text>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notas
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Información adicional sobre el contacto..."
                        disabled={isLoading || submitLoading}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-vertical"
                      />
                    </div>
                  </div>
                </CardContent>
                
                {/* Botones de Acción */}
                <CardFooter className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex justify-end gap-3 w-full">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={() => router.push('/contacts')}
                      disabled={submitLoading}
                      className="px-6"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading || submitLoading}
                      className="px-8"
                    >
                      {submitLoading ? 'Creando...' : 'Crear Contacto'}
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Columna Lateral - Información de Ayuda */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Card de Ayuda */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm">💡</span>
                      </div>
                    </div>
                    <div>
                      <Heading level={5} className="text-sm font-semibold text-blue-900 mb-1">
                        Consejos
                      </Heading>
                      <Text size="sm" className="text-blue-800">
                        Solo los campos Nombre y Apellido son obligatorios. Los demás campos son opcionales pero recomendados.
                      </Text>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Información del Pipeline */}
              {pipelineStages.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900">
                      Etapas del Pipeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {pipelineStages.slice(0, 3).map((stage) => (
                        <div key={stage.id} className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: stage.color }}
                          />
                          <Text size="sm" className="text-gray-600">
                            {stage.name}
                          </Text>
                        </div>
                      ))}
                      {pipelineStages.length > 3 && (
                        <Text size="sm" className="text-gray-500">
                          +{pipelineStages.length - 3} más...
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