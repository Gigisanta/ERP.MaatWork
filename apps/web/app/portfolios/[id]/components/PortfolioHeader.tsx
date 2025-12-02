/**
 * Header del portfolio con información y acciones
 */

'use client';

import { useRouter } from 'next/navigation';
import { Heading, Text, Badge, Button, Stack } from '@cactus/ui';
import { ArrowLeft, Plus } from 'lucide-react';
import type { PortfolioWithLines } from '@/types';

interface PortfolioHeaderProps {
  portfolio: PortfolioWithLines | null;
  onAddLine: () => void;
}

export function PortfolioHeader({ portfolio, onAddLine }: PortfolioHeaderProps) {
  const router = useRouter();

  const getRiskLevelVariant = (riskLevel?: string | null) => {
    switch (riskLevel) {
      case 'conservative':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'aggressive':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRiskLevelLabel = (riskLevel?: string | null) => {
    switch (riskLevel) {
      case 'conservative':
        return 'Conservador';
      case 'moderate':
        return 'Moderado';
      case 'aggressive':
        return 'Agresivo';
      default:
        return riskLevel || 'N/A';
    }
  };

  return (
    <div className="mt-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Heading level={1} className="mb-2">
            {portfolio?.name || 'Cartera Modelo'}
          </Heading>
          {portfolio?.description && (
            <Text color="secondary" className="mb-2">
              {portfolio.description}
            </Text>
          )}
          {portfolio?.riskLevel && (
            <Badge variant={getRiskLevelVariant(portfolio.riskLevel)}>
              {getRiskLevelLabel(portfolio.riskLevel)}
            </Badge>
          )}
        </div>
        <Stack direction="row" gap="sm">
          <Button onClick={() => router.push('/portfolios')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <Button onClick={onAddLine} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Componente
          </Button>
        </Stack>
      </div>
    </div>
  );
}






