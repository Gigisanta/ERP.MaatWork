'use client';

import { useRouter } from 'next/navigation';
import { Eye, Edit, Trash2, PieChart } from 'lucide-react';
import {
  Card,
  CardContent,
  Button,
  Heading,
  Text,
  Stack,
  Badge,
  Grid,
  EmptyState,
} from '@cactus/ui';
import type { Portfolio } from '@/types';

interface PortfoliosGridProps {
  portfolios: Portfolio[];
  onEdit: (portfolio: Portfolio) => void;
  onDelete: (portfolioId: string) => void;
  onCreateNew: () => void;
  onSelect?: (portfolio: Portfolio) => void;
}

export function PortfoliosGrid({
  portfolios,
  onEdit,
  onDelete,
  onCreateNew,
  onSelect,
}: PortfoliosGridProps) {
  const router = useRouter();

  const getRiskLevelVariant = (riskLevel: string) => {
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

  const getRiskLevelLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'conservative':
        return 'Conservador';
      case 'moderate':
        return 'Moderado';
      case 'aggressive':
        return 'Agresivo';
      default:
        return riskLevel;
    }
  };

  if (portfolios.length === 0) {
    return (
      <EmptyState
        title="No tienes carteras creadas"
        description="Crea tu primera cartera modelo para comenzar a gestionar inversiones"
        action={
          <Button onClick={onCreateNew} variant="primary">
            Crear Primera Cartera
          </Button>
        }
      />
    );
  }

  return (
    <Grid cols={4} gap="md">
      {portfolios.map((portfolio) => (
        <Card
          key={portfolio.id}
          className="hover:shadow-md transition-all border border-border rounded-md hover:border-border-hover cursor-pointer"
          onClick={() => onSelect?.(portfolio)}
        >
          <CardContent className="p-3">
            <Stack direction="column" gap="xs">
              <div className="flex items-start justify-between gap-2">
                <Heading level={6} className="truncate flex-1 text-sm">
                  {portfolio.name}
                </Heading>
                <Badge variant={getRiskLevelVariant(portfolio.riskLevel)} className="text-xs shrink-0">
                  {getRiskLevelLabel(portfolio.riskLevel)}
                </Badge>
              </div>

              <Stack direction="row" gap="xs" align="center">
                <PieChart className="w-3 h-3 text-foreground-tertiary" />
                <Text size="xs" color="secondary">
                  {portfolio.lines?.length || 0} activos
                </Text>
              </Stack>

              <Stack direction="row" gap="xs" className="mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => {
                    router.push(`/portfolios/${portfolio.id}`);
                  }}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Ver
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => {
                    onEdit(portfolio);
                  }}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-error-500 hover:text-error-600"
                  onClick={() => {
                    onDelete(portfolio.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Grid>
  );
}

