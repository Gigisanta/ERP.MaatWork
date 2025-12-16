'use client';

import { Select } from '@cactus/ui';
import type { Portfolio } from '@/types';

interface PortfolioSelectorProps {
  portfolios: Portfolio[];
  selectedPortfolioId?: string | null;
  onSelect: (portfolioId: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function PortfolioSelector({
  portfolios,
  selectedPortfolioId,
  onSelect,
  placeholder = 'Seleccionar cartera',
  className,
}: PortfolioSelectorProps) {
  const items = [
    // Use a special value for the placeholder to avoid "invalid value" warnings with empty strings
    { value: 'PLACEHOLDER_EMPTY', label: placeholder },
    ...portfolios.map((portfolio) => ({
      value: portfolio.id,
      label: portfolio.name,
    })),
  ];

  return (
    <Select
      value={selectedPortfolioId || 'PLACEHOLDER_EMPTY'}
      onValueChange={(value) => onSelect(value === 'PLACEHOLDER_EMPTY' ? null : value)}
      items={items}
      {...(className ? { className } : {})}
    />
  );
}
