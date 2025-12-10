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
    { value: '', label: placeholder },
    ...portfolios.map((portfolio) => ({
      value: portfolio.id,
      label: portfolio.name,
    })),
  ];

  return (
    <Select
      value={selectedPortfolioId || ''}
      onValueChange={(value) => onSelect(value || null)}
      items={items}
      {...(className ? { className } : {})}
    />
  );
}
