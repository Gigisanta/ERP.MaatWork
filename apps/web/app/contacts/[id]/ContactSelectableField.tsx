'use client';
import React, { useState, useTransition } from 'react';
import { Text, Spinner, Select } from '@cactus/ui';
import { useRouter } from 'next/navigation';
import { logger, toLogContext } from '@/lib/logger';

// AI_DECISION: Componente específico para campos seleccionables en contactos
// Justificación: Separar la lógica de selects de campos de texto para mejor mantenibilidad
// Impacto: Permite edición inline de campos con opciones predefinidas

interface SelectOption {
  value: string;
  label: string;
}

interface ContactSelectableFieldProps {
  label: string;
  value: string | null | undefined;
  field: string;
  contactId: string;
  options: SelectOption[];
  placeholder?: string;
  emptyText?: string;
}

/**
 * ContactSelectableField - Client wrapper for inline contact select field editing
 *
 * Handles Server Action calls internally for dropdown fields
 *
 * @example
 * <ContactSelectableField
 *   label="Tipo de Mercado"
 *   value={contact.source}
 *   field="source"
 *   contactId={contact.id}
 *   options={MARKET_TYPE_OPTIONS}
 * />
 */
export default function ContactSelectableField({
  label,
  value,
  field,
  contactId,
  options,
  placeholder = 'Seleccionar...',
  emptyText = 'Sin especificar',
}: ContactSelectableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Find the label for the current value
  const currentOption = options.find((opt) => opt.value === value);
  const displayValue = currentOption?.label || value;

  const handleSave = async (newValue: string) => {
    if (newValue === value) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      try {
        // Import and call Server Action dynamically
        const { updateContactField } = await import('./actions');
        await updateContactField(contactId, field, newValue || null);
        setIsEditing(false);
        // Revalidate the page data to show updated values
        router.refresh();
      } catch (err) {
        logger.error(
          'Error updating contact field',
          toLogContext({ err, contactId, field, value: newValue })
        );
      }
    });
  };

  if (isEditing) {
    return (
      <div className="space-y-1">
        <Text size="xs" weight="medium" color="secondary">
          {label}
        </Text>
        <div className="flex items-center gap-2">
          <Select
            value={value || ''}
            onValueChange={(newValue) => handleSave(newValue)}
            items={options}
            placeholder={placeholder}
            className="flex-1 bg-white"
          />
          {isPending && <Spinner size="sm" />}
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-gray-50 px-1.5 py-0.5 rounded"
      onClick={() => setIsEditing(true)}
    >
      <Text size="xs" weight="medium" color="secondary">
        {label}
      </Text>
      <Text size="sm" className="mt-0.5">
        {displayValue || <span className="text-gray-400">{emptyText}</span>}
      </Text>
    </div>
  );
}

/**
 * Opciones predefinidas para el tipo de mercado del contacto
 * - natural: Contacto referido o de relaciones existentes
 * - frio: Contacto prospectado sin relación previa
 */
export const MARKET_TYPE_OPTIONS: SelectOption[] = [
  { value: 'natural', label: 'Natural' },
  { value: 'frio', label: 'Frío' },
];
