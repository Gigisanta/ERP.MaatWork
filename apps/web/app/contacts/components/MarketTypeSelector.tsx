'use client';
import React from 'react';
import { Select } from '@cactus/ui';

// AI_DECISION: Componente dedicado para selección de tipo de mercado con sub-opciones
// Justificación: Encapsula la lógica condicional de mostrar sub-selector para "Frío"
// Impacto: Reutilizable en creación y edición de contactos, mantiene consistencia

/**
 * Tipos de mercado principales
 */
export const MARKET_TYPES = {
  natural: 'Natural',
  referido: 'Referido',
  frio: 'Frío',
} as const;

/**
 * Sub-tipos para mercado frío
 */
export const COLD_MARKET_SUBTYPES = {
  redes_sociales: 'Redes Sociales',
  llamado_frio: 'Llamado en frío',
} as const;

export type MarketType = keyof typeof MARKET_TYPES;
export type ColdMarketSubtype = keyof typeof COLD_MARKET_SUBTYPES;

/**
 * Opciones para el selector principal de tipo de mercado
 */
export const MARKET_TYPE_OPTIONS = [
  { value: 'natural', label: 'Natural' },
  { value: 'referido', label: 'Referido' },
  { value: 'frio', label: 'Frío' },
];

/**
 * Opciones para el selector de sub-tipo de mercado frío
 */
export const COLD_MARKET_SUBTYPE_OPTIONS = [
  { value: 'redes_sociales', label: 'Redes Sociales' },
  { value: 'llamado_frio', label: 'Llamado en frío' },
];

/**
 * Parsea el valor de source para obtener el tipo y sub-tipo
 * Formato: "tipo" o "tipo:subtipo"
 */
export function parseMarketSource(source: string | null | undefined): {
  mainType: string;
  subType: string | null;
} {
  if (!source) return { mainType: '', subType: null };

  const parts = source.split(':');
  return {
    mainType: parts[0] || '',
    subType: parts[1] || null,
  };
}

/**
 * Construye el valor de source a partir del tipo y sub-tipo
 */
export function buildMarketSource(mainType: string, subType: string | null): string {
  if (mainType === 'frio' && subType) {
    return `frio:${subType}`;
  }
  return mainType;
}

/**
 * Obtiene el label legible para un valor de source
 */
export function getMarketSourceLabel(source: string | null | undefined): string {
  if (!source) return '';

  const { mainType, subType } = parseMarketSource(source);

  const mainLabel = MARKET_TYPES[mainType as MarketType] || mainType;

  if (subType) {
    const subLabel = COLD_MARKET_SUBTYPES[subType as ColdMarketSubtype] || subType;
    return `${mainLabel} - ${subLabel}`;
  }

  return mainLabel;
}

interface MarketTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * MarketTypeSelector - Selector de tipo de mercado con sub-opciones condicionales
 *
 * Muestra un selector principal con Natural/Referido/Frío.
 * Si se selecciona "Frío", aparece un segundo selector con las opciones específicas.
 */
export default function MarketTypeSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: MarketTypeSelectorProps) {
  const { mainType, subType } = parseMarketSource(value);

  const handleMainTypeChange = (newMainType: string) => {
    if (newMainType === 'frio') {
      // Al seleccionar Frío, no guardamos hasta que seleccionen sub-tipo
      // Pero mostramos el segundo selector
      onChange('frio:'); // Valor temporal para mostrar el segundo selector
    } else {
      onChange(newMainType);
    }
  };

  const handleSubTypeChange = (newSubType: string) => {
    onChange(buildMarketSource('frio', newSubType));
  };

  const showColdSubtypeSelector = mainType === 'frio';

  return (
    <div className={`space-y-3 ${className}`}>
      <Select
        label="Tipo de Mercado"
        value={mainType}
        onValueChange={handleMainTypeChange}
        disabled={disabled}
        items={MARKET_TYPE_OPTIONS}
        placeholder="Seleccionar tipo de mercado"
        className="w-full"
      />

      {showColdSubtypeSelector && (
        <Select
          label="Origen del contacto frío"
          value={subType || ''}
          onValueChange={handleSubTypeChange}
          disabled={disabled}
          items={COLD_MARKET_SUBTYPE_OPTIONS}
          placeholder="Seleccionar origen"
          className="w-full"
        />
      )}
    </div>
  );
}
