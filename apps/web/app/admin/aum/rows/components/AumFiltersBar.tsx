/**
 * AumFiltersBar Component
 * 
 * AI_DECISION: Componente separado para filtros con responsabilidad única
 * Justificación: Separar UI de filtros facilita testing y reutilización
 * Impacto: Componente < 100 líneas, testeable independientemente
 */

'use client';

import { Select, Input, Checkbox, Text } from '@cactus/ui';

export interface AumFiltersBarProps {
  // Filter values
  broker: string;
  status: string;
  searchTerm: string;
  onlyUpdated: boolean;

  // Handlers
  onBrokerChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onOnlyUpdatedChange: (checked: boolean) => void;

  // Optional
  className?: string;
}

export function AumFiltersBar({
  broker,
  status,
  searchTerm,
  onlyUpdated,
  onBrokerChange,
  onStatusChange,
  onSearchChange,
  onOnlyUpdatedChange,
  className = ''
}: AumFiltersBarProps) {
  return (
    <div className={`flex gap-4 items-center flex-wrap ${className}`}>
      <Select
        value={broker}
        onValueChange={onBrokerChange}
        placeholder="Todos los Brokers"
        items={[
          { value: 'all', label: 'Todos los Brokers' },
          { value: 'balanz', label: 'Balanz' }
        ]}
      />

      <Select
        value={status}
        onValueChange={onStatusChange}
        placeholder="Todos los Estados"
        items={[
          { value: 'all', label: 'Todos los Estados' },
          { value: 'matched', label: 'Coincidencia' },
          { value: 'ambiguous', label: 'Ambiguo' },
          { value: 'unmatched', label: 'Sin Coincidencia' }
        ]}
      />

      <Input
        placeholder="Buscar por cuenta, comitente, ID cuenta o asesor..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        leftIcon="search"
        size="sm"
        className="w-[300px]"
      />

      <div className="flex items-center gap-2">
        <Checkbox
          checked={onlyUpdated}
          onCheckedChange={(checked) => {
            onOnlyUpdatedChange(typeof checked === 'boolean' ? checked : false);
          }}
        />
        <Text size="sm" className="text-gray-700">
          Solo actualizados
        </Text>
      </div>
    </div>
  );
}

