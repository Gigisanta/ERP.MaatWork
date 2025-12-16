'use client';
import React, { useState, useTransition } from 'react';
import { Text, Spinner, Select } from '@cactus/ui';
import { useRouter } from 'next/navigation';
import { logger, toLogContext } from '@/lib/logger';
import {
  MARKET_TYPE_OPTIONS,
  COLD_MARKET_SUBTYPE_OPTIONS,
  parseMarketSource,
  buildMarketSource,
  getMarketSourceLabel,
} from '../components/MarketTypeSelector';

// AI_DECISION: Componente específico para edición inline de tipo de mercado
// Justificación: La edición de tipo de mercado requiere lógica condicional para sub-tipos
// Impacto: Permite editar el tipo de mercado con la misma UX que en creación

interface ContactMarketTypeFieldProps {
  value: string | null | undefined;
  contactId: string;
}

/**
 * ContactMarketTypeField - Edición inline de tipo de mercado con sub-opciones
 */
export default function ContactMarketTypeField({ value, contactId }: ContactMarketTypeFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { mainType, subType } = parseMarketSource(value);
  const displayValue = getMarketSourceLabel(value);

  const [editMainType, setEditMainType] = useState(mainType);
  const [editSubType, setEditSubType] = useState(subType || '');

  const handleStartEdit = () => {
    setEditMainType(mainType);
    setEditSubType(subType || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    const newValue = buildMarketSource(editMainType, editSubType || null);

    if (newValue === value || (newValue === '' && !value)) {
      setIsEditing(false);
      return;
    }

    // Si es frío y no tiene sub-tipo, no guardar
    if (editMainType === 'frio' && !editSubType) {
      return;
    }

    startTransition(async () => {
      try {
        const { updateContactField } = await import('./actions');
        await updateContactField(contactId, 'source', newValue || null);
        setIsEditing(false);
        router.refresh();
      } catch (err) {
        logger.error(
          'Error updating market type',
          toLogContext({ err, contactId, value: newValue })
        );
      }
    });
  };

  const handleMainTypeChange = (newMainType: string) => {
    setEditMainType(newMainType);
    if (newMainType !== 'frio') {
      setEditSubType('');
    }
  };

  const showColdSubtypeSelector = editMainType === 'frio';

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Text size="xs" weight="medium" color="secondary">
          Tipo de Mercado
        </Text>
        <div className="space-y-2">
          <Select
            value={editMainType}
            onValueChange={handleMainTypeChange}
            items={MARKET_TYPE_OPTIONS}
            placeholder="Seleccionar tipo"
            className="flex-1"
          />

          {showColdSubtypeSelector && (
            <Select
              value={editSubType}
              onValueChange={setEditSubType}
              items={COLD_MARKET_SUBTYPE_OPTIONS}
              placeholder="Seleccionar origen"
              className="flex-1"
            />
          )}

          <div className="flex items-center gap-2 mt-2">
            {isPending && <Spinner size="sm" />}
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || (editMainType === 'frio' && !editSubType)}
              className="text-xs text-primary hover:text-primary/80 px-2 py-1 disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-text-secondary hover:text-text px-2 py-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-surface-hover px-1.5 py-0.5 rounded"
      onClick={handleStartEdit}
    >
      <Text size="xs" weight="medium" color="secondary">
        Tipo de Mercado
      </Text>
      <Text size="sm" className="mt-0.5">
        {displayValue || <span className="text-text-muted">Sin especificar</span>}
      </Text>
    </div>
  );
}
