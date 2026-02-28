'use client';

import React, { useState, useEffect } from 'react';
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
} from '@maatwork/ui';
import type { Portfolio } from '@/types';

interface PortfoliosGridProps {
  portfolios: Portfolio[];
  onEdit: (portfolio: Portfolio) => void;
  onDelete: (portfolioId: string) => void;
  onCreateNew: () => void;
  onSelect?: (portfolio: Portfolio) => void;
}

function PortfoliosGrid({
  portfolios,
  onEdit,
  onDelete,
  onCreateNew,
  onSelect,
}: PortfoliosGridProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const getRiskLevelVariant = (riskLevel: string | null | undefined) => {
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

  const getRiskLevelLabel = (riskLevel: string | null | undefined) => {
    if (!riskLevel) return 'Sin definir';
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
      {portfolios.map((portfolio, index) => (
        <div
          key={portfolio.id}
          className={`transition-all duration-500 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: `${index * 50}ms` }}
        >
          <Card
            className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-border rounded-md hover:border-primary/30 cursor-pointer hover-lift-glow"
            onClick={() => onSelect?.(portfolio)}
          >
            <CardContent className="p-3">
              <Stack direction="column" gap="xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col flex-1 truncate">
                    <Heading level={6} className="truncate text-sm">
                      {portfolio.name}
                    </Heading>
                    {portfolio.code && (
                      <Text size="xs" color="secondary" className="truncate opacity-70">
                        {portfolio.code}
                      </Text>
                    )}
                  </div>
                  <Badge
                    variant={getRiskLevelVariant(portfolio.riskLevel)}
                    className="text-xs shrink-0"
                  >
                    {getRiskLevelLabel(portfolio.riskLevel)}
                  </Badge>
                </div>

                <Stack direction="row" gap="xs" align="center">
                  <PieChart className="w-3 h-3 text-foreground-tertiary" />
                  <Text size="xs" color="secondary">
                    {portfolio.lines?.length || portfolio.lineCount || 0} activos
                  </Text>
                  {portfolio.type === 'benchmark' && (
                    <Badge variant="success" className="text-[10px] h-4 py-0">
                      Benchmark
                    </Badge>
                  )}
                  {portfolio.isSystem && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 py-0 border-primary/30 text-primary"
                    >
                      Sistema
                    </Badge>
                  )}
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
        </div>
      ))}
    </Grid>
  );
}

// Memoize component to prevent unnecessary re-renders
// This component renders portfolio cards that don't need frequent re-renders
const MemoizedPortfoliosGrid = React.memo(PortfoliosGrid);

export default MemoizedPortfoliosGrid;
