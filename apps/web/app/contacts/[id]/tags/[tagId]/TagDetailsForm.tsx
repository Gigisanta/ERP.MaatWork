'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Input, Button, Stack, Text, Spinner, Alert } from '@maatwork/ui';
import { useToast } from '@/lib/hooks/useToast';
import { updateContactTag } from '@/lib/api/tags';
import type { UpdateContactTagRequest } from '@/types';
import { logger, toLogContext } from '@/lib/logger';

// Schema de validación Zod
// AI_DECISION: Usar union para manejar null correctamente con positive()
// Justificación: z.number().positive().nullable() falla porque null no pasa la validación de positive()
// Impacto: Permite null y números positivos, pero rechaza números negativos o cero
const contactTagFormSchema = z.object({
  monthlyPremium: z.union([z.number().int().positive(), z.null()]).optional(),
  policyNumber: z.union([z.string().max(100), z.null()]).optional(),
});

interface TagDetailsFormProps {
  contactId: string;
  tagId: string;
  initialData: {
    monthlyPremium?: number | null;
    policyNumber?: string | null;
  };
}

export default function TagDetailsForm({ contactId, tagId, initialData }: TagDetailsFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<UpdateContactTagRequest>({
    monthlyPremium: initialData.monthlyPremium ?? null,
    policyNumber: initialData.policyNumber ?? null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{
    monthlyPremium?: string;
    policyNumber?: string;
  }>({});

  // Sincronizar con datos iniciales cuando cambian
  useEffect(() => {
    setFormData({
      monthlyPremium: initialData.monthlyPremium ?? null,
      policyNumber: initialData.policyNumber ?? null,
    });
  }, [initialData]);

  const handleMonthlyPremiumChange = (value: string) => {
    const trimmedValue = value.trim();

    if (trimmedValue === '') {
      setFormData((prev) => ({ ...prev, monthlyPremium: null }));
      setErrors((prev) => {
        const { monthlyPremium, ...rest } = prev;
        return rest;
      });
      return;
    }

    const numValue = parseInt(trimmedValue, 10);

    if (isNaN(numValue)) {
      setErrors((prev) => ({ ...prev, monthlyPremium: 'Debe ser un número entero' }));
      return;
    }

    if (numValue <= 0) {
      setErrors((prev) => ({ ...prev, monthlyPremium: 'Debe ser un número positivo' }));
      return;
    }

    setFormData((prev) => ({ ...prev, monthlyPremium: numValue }));
    setErrors((prev) => {
      const { monthlyPremium, ...rest } = prev;
      return rest;
    });
  };

  const handlePolicyNumberChange = (value: string) => {
    const trimmedValue = value.trim();

    if (trimmedValue === '') {
      setFormData((prev) => ({ ...prev, policyNumber: null }));
      setErrors((prev) => {
        const { policyNumber, ...rest } = prev;
        return rest;
      });
      return;
    }

    if (trimmedValue.length > 100) {
      setErrors((prev) => ({ ...prev, policyNumber: 'Máximo 100 caracteres' }));
      return;
    }

    setFormData((prev) => ({ ...prev, policyNumber: trimmedValue }));
    setErrors((prev) => {
      const { policyNumber, ...rest } = prev;
      return rest;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    logger.debug(
      'handleSubmit llamado',
      toLogContext({ contactId, tagId, hasErrors: Object.keys(errors).length > 0 })
    );

    // Limpiar errores previos
    setErrors({});

    // Validar con Zod
    const validationResult = contactTagFormSchema.safeParse(formData);

    if (!validationResult.success) {
      logger.warn(
        'Validación Zod falló',
        toLogContext({
          contactId,
          tagId,
          errors: validationResult.error.errors.map((e) => ({ path: e.path, message: e.message })),
        })
      );
      const zodErrors: typeof errors = {};
      validationResult.error.errors.forEach((error) => {
        if (error.path[0] === 'monthlyPremium') {
          zodErrors.monthlyPremium = error.message;
        } else if (error.path[0] === 'policyNumber') {
          zodErrors.policyNumber = error.message;
        }
      });
      setErrors(zodErrors);
      showToast('Error de validación', 'Por favor corrige los errores en el formulario', 'error');
      return;
    }

    setIsSaving(true);

    try {
      // Preparar datos para enviar (solo incluir campos que tienen valores o null explícito)
      const payload: UpdateContactTagRequest = {};

      if (formData.monthlyPremium !== undefined) {
        payload.monthlyPremium = formData.monthlyPremium;
      }
      if (formData.policyNumber !== undefined) {
        payload.policyNumber = formData.policyNumber;
      }

      logger.debug('Enviando datos de contact tag', toLogContext({ contactId, tagId, payload }));

      const response = await updateContactTag(contactId, tagId, payload);

      logger.info('Contact tag actualizado exitosamente', toLogContext({ contactId, tagId }));

      if (response.success && response.data) {
        showToast(
          'Datos guardados',
          'La información de la póliza se ha actualizado correctamente',
          'success'
        );
        // Actualizar datos locales con la respuesta del servidor
        setFormData({
          monthlyPremium: response.data.monthlyPremium ?? null,
          policyNumber: response.data.policyNumber ?? null,
        });
      } else {
        const errorMsg = response.error || 'Error al guardar los datos';
        logger.error(
          'Error en respuesta de updateContactTag',
          toLogContext({
            contactId,
            tagId,
            error: errorMsg,
            response,
          })
        );
        throw new Error(errorMsg);
      }
    } catch (err) {
      logger.error(
        'Error al guardar contact tag',
        toLogContext({
          error: err instanceof Error ? err.message : String(err),
          contactId,
          tagId,
        })
      );
      let errorMessage = 'Error desconocido al guardar';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = String(err.message);
      }

      showToast('Error al guardar', errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack direction="column" gap="md">
        {/* Campo Prima Mensual */}
        <div>
          <Input
            label="Prima Mensual"
            type="number"
            value={formData.monthlyPremium?.toString() ?? ''}
            onChange={(e) => handleMonthlyPremiumChange(e.target.value)}
            placeholder="Ej: 550"
            disabled={isSaving}
            error={errors.monthlyPremium}
            min="1"
            step="1"
          />
          <Text size="xs" color="muted" className="mt-1">
            Ingrese el monto de la prima mensual (números enteros únicamente)
          </Text>
        </div>

        {/* Campo Número de Póliza */}
        <div>
          <Input
            label="Número de Póliza"
            type="text"
            value={formData.policyNumber ?? ''}
            onChange={(e) => handlePolicyNumberChange(e.target.value)}
            placeholder="Ej: POL-12345"
            disabled={isSaving}
            error={errors.policyNumber}
            maxLength={100}
          />
          <Text size="xs" color="muted" className="mt-1">
            Ingrese el número de póliza (texto y números)
          </Text>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
