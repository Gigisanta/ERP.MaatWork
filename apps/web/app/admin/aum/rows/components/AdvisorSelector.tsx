/**
 * AdvisorSelector Component
 * 
 * Componente para seleccionar asesores desde una lista
 * 
 * AI_DECISION: Componente separado para reutilización y mejor UX
 * Justificación: Encapsula la lógica de carga y conversión de asesores
 * Impacto: Mejor experiencia de usuario al asignar asesores
 * Nota: Radix UI Select tiene filtrado por teclado integrado al escribir cuando está abierto
 */

'use client';

import { useMemo } from 'react';
import { Select, type SelectItem } from '@cactus/ui';
import { useAdvisors } from '@/lib/api-hooks';
import type { Advisor } from '@/types';

/**
 * Props del componente AdvisorSelector
 */
export interface AdvisorSelectorProps {
  /** Valor seleccionado (ID del asesor) */
  value?: string;
  /** Callback cuando se selecciona un asesor */
  onValueChange: (value: string, advisor: Advisor | null) => void;
  /** Texto placeholder del select */
  placeholder?: string;
  /** Si el componente está deshabilitado */
  disabled?: boolean;
  /** Clases CSS adicionales */
  className?: string;
}

export function AdvisorSelector({
  value,
  onValueChange,
  placeholder = 'Seleccionar asesor...',
  disabled = false,
  className
}: AdvisorSelectorProps) {
  const { advisors, isLoading } = useAdvisors();

  // Convertir asesores a items del Select
  // AI_DECISION: Usar useMemo para evitar recrear el array en cada render
  // Justificación: Optimiza performance cuando hay muchos asesores
  // Impacto: Reduce re-renders innecesarios
  const selectItems: SelectItem[] = useMemo(() => {
    return (advisors as Advisor[]).map((advisor: Advisor) => ({
      value: String(advisor.id),
      label: advisor.fullName || advisor.email || 'Sin nombre'
    }));
  }, [advisors]);

  const handleValueChange = (selectedValue: string) => {
    // Validar que el valor no esté vacío
    if (!selectedValue || selectedValue.trim().length === 0) {
      onValueChange('', null);
      return;
    }

    // Buscar el asesor seleccionado
    const selectedAdvisor = (advisors as Advisor[]).find(
      (advisor) => advisor.id === selectedValue
    ) || null;
    
    onValueChange(selectedValue, selectedAdvisor);
  };

  if (isLoading) {
    return (
      <div className={className}>
        <Select
          items={[]}
          placeholder="Cargando asesores..."
          disabled={true}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Select
        items={selectItems}
        value={value ?? ''}
        onValueChange={handleValueChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

