'use client';

import { useState, useEffect } from 'react';
import { Plus, X, BarChart3, Target, TrendingUp, Users, CheckCircle } from 'lucide-react';
import PerformanceChart from './PerformanceChart';
import { comparePortfolios } from '@/lib/api';
import { logger } from '../../lib/logger';
import type { ComparisonResult } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Grid,
  Badge,
  Spinner,
  DataTable,
  type Column,
} from '@cactus/ui';

interface Portfolio {
  id: string;
  name: string;
  type: 'portfolio' | 'benchmark';
  riskLevel?: string;
  description?: string;
  createdAt?: string;
}

interface PortfolioComparatorProps {
  portfolios: Portfolio[];
  benchmarks: Portfolio[];
  onAddToComparison?: (id: string, type: 'portfolio' | 'benchmark') => void;
  onRemoveFromComparison?: (id: string, type: 'portfolio' | 'benchmark') => void;
  className?: string;
}

interface ComparisonItem {
  id: string;
  name: string;
  type: 'portfolio' | 'benchmark';
  performance: number;
  volatility: number;
  sharpe?: number;
  maxDrawdown?: number;
}

export default function PortfolioComparator({
  portfolios = [],
  benchmarks = [],
  onAddToComparison,
  onRemoveFromComparison,
  className = ""
}: PortfolioComparatorProps) {
  const [selectedPortfolios, setSelectedPortfolios] = useState<string[]>([]);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Obtener datos de comparación reales desde API
  useEffect(() => {
    if (selectedPortfolios.length > 0 || selectedBenchmarks.length > 0) {
      setIsLoading(true);
      
      const fetchComparisonData = async () => {
        try {
          const token = localStorage.getItem('token');

          if (!token) {
            setIsLoading(false);
            return;
          }

          const result = await comparePortfolios({
            portfolioIds: selectedPortfolios,
            benchmarkIds: selectedBenchmarks,
            period: '1Y' // Por defecto 1 año
          });
          
          if (result.success && result.data && result.data.results) {
            // Mapear datos de la API al formato del componente
            const comparisonData: ComparisonItem[] = result.data.results.map((item: ComparisonResult) => {
              const result: ComparisonItem = {
                id: item.id,
                name: item.name,
                type: item.type,
                performance: item.metrics?.totalReturn || 0,
                volatility: item.metrics?.volatility || 0,
              };
              
              if (item.metrics?.sharpeRatio !== undefined) {
                result.sharpe = item.metrics.sharpeRatio;
              }
              
              if (item.metrics?.maxDrawdown !== undefined) {
                result.maxDrawdown = item.metrics.maxDrawdown;
              }
              
              return result;
            });
            
            setComparisonData(comparisonData);
          } else {
            setComparisonData([]);
          }
        } catch (err) {
          logger.error('Error fetching comparison data', { err, selectedPortfolios, selectedBenchmarks });
          setComparisonData([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchComparisonData();
    } else {
      setComparisonData([]);
    }
  }, [selectedPortfolios, selectedBenchmarks]);

  const handleAddToComparison = (id: string, type: 'portfolio' | 'benchmark') => {
    if (type === 'portfolio' && !selectedPortfolios.includes(id)) {
      setSelectedPortfolios([...selectedPortfolios, id]);
      onAddToComparison?.(id, type);
    } else if (type === 'benchmark' && !selectedBenchmarks.includes(id)) {
      setSelectedBenchmarks([...selectedBenchmarks, id]);
      onAddToComparison?.(id, type);
    }
  };

  const handleRemoveFromComparison = (id: string, type: 'portfolio' | 'benchmark') => {
    if (type === 'portfolio') {
      setSelectedPortfolios(selectedPortfolios.filter(p => p !== id));
      onRemoveFromComparison?.(id, type);
    } else if (type === 'benchmark') {
      setSelectedBenchmarks(selectedBenchmarks.filter(b => b !== id));
      onRemoveFromComparison?.(id, type);
    }
  };

  const getPerformanceColor = (performance: number) => {
    if (performance > 10) return 'text-success bg-success-subtle';
    if (performance > 0) return 'text-success bg-success-subtle';
    if (performance > -5) return 'text-warning bg-warning-subtle';
    return 'text-error bg-error-subtle';
  };

  const getRiskColor = (volatility: number) => {
    if (volatility < 10) return 'text-success bg-success-subtle';
    if (volatility < 15) return 'text-warning bg-warning-subtle';
    return 'text-error bg-error-subtle';
  };

  const getSharpeColor = (sharpe: number) => {
    if (sharpe > 1) return 'text-success bg-success-subtle';
    if (sharpe > 0.5) return 'text-warning bg-warning-subtle';
    return 'text-error bg-error-subtle';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Portfolio Selection */}
      <Grid cols={2} gap="lg">
        {/* Portfolios */}
        <Card>
          <CardHeader>
            <Stack direction="row" gap="sm" align="center">
              <BarChart3 className="w-5 h-5 text-accent-text" />
              <CardTitle>Mis Carteras</CardTitle>
            </Stack>
          </CardHeader>
          <CardContent>
            <Stack direction="column" gap="sm">
              {portfolios.map(portfolio => (
                <Card key={portfolio.id} className="hover:bg-background-hover">
                  <CardContent>
                    <Stack direction="row" gap="sm" align="center">
                      <div className="flex-1 min-w-0">
                        <Stack direction="row" gap="sm" align="center">
                          <Text weight="medium" className="truncate">
                            {portfolio.name}
                          </Text>
                          <Badge variant="brand">Cartera</Badge>
                          {selectedPortfolios.includes(portfolio.id) && (
                            <CheckCircle className="w-4 h-4 text-success-500" />
                          )}
                        </Stack>
                        {portfolio.description && (
                          <Text size="sm" color="secondary" className="truncate">
                            {portfolio.description}
                          </Text>
                        )}
                        {portfolio.riskLevel && (
                          <Stack direction="row" gap="xs" align="center" className="mt-1">
                            <Target className="w-3 h-3 text-foreground-tertiary" />
                            <Text size="xs" color="muted">
                              Riesgo: {portfolio.riskLevel}
                            </Text>
                          </Stack>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddToComparison(portfolio.id, 'portfolio')}
                        disabled={selectedPortfolios.includes(portfolio.id)}
                        className="text-accent-text hover:bg-accent-subtle"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              
              {portfolios.length === 0 && (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
                  <Text color="secondary">No tienes carteras creadas</Text>
                  <Text size="sm" color="muted">Crea tu primera cartera para comenzar</Text>
                </div>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Benchmarks */}
        <Card>
          <CardHeader>
            <Stack direction="row" gap="sm" align="center">
              <TrendingUp className="w-5 h-5 text-success-500" />
              <CardTitle>Benchmarks</CardTitle>
            </Stack>
          </CardHeader>
          <CardContent>
            <Stack direction="column" gap="sm">
              {benchmarks.map(benchmark => (
                <Card key={benchmark.id} className="hover:bg-background-hover">
                  <CardContent>
                    <Stack direction="row" gap="sm" align="center">
                      <div className="flex-1 min-w-0">
                        <Stack direction="row" gap="sm" align="center">
                          <Text weight="medium" className="truncate">
                            {benchmark.name}
                          </Text>
                          <Badge variant="success">Benchmark</Badge>
                          {selectedBenchmarks.includes(benchmark.id) && (
                            <CheckCircle className="w-4 h-4 text-success-500" />
                          )}
                        </Stack>
                        {benchmark.description && (
                          <Text size="sm" color="secondary" className="truncate">
                            {benchmark.description}
                          </Text>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddToComparison(benchmark.id, 'benchmark')}
                        disabled={selectedBenchmarks.includes(benchmark.id)}
                        className="text-success-500 hover:bg-success-subtle"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              
              {benchmarks.length === 0 && (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
                  <Text color="secondary">No hay benchmarks disponibles</Text>
                  <Text size="sm" color="muted">Los administradores pueden crear benchmarks</Text>
                </div>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Selected Items */}
      {(selectedPortfolios.length > 0 || selectedBenchmarks.length > 0) && (
        <Card>
          <CardHeader>
            <Stack direction="row" gap="sm" align="center">
              <Users className="w-5 h-5 text-accent-text" />
              <CardTitle>Comparación Seleccionada</CardTitle>
            </Stack>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedPortfolios.map(id => {
                const portfolio = portfolios.find(p => p.id === id);
                return (
                  <Badge key={`portfolio-${id}`} variant="brand">
                    <Stack direction="row" gap="sm" align="center">
                      <Text size="sm">{portfolio?.name || `Portfolio ${id}`}</Text>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromComparison(id, 'portfolio')}
                        className="text-accent-text hover:text-accent-text p-0 h-auto"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Stack>
                  </Badge>
                );
              })}
              
              {selectedBenchmarks.map(id => {
                const benchmark = benchmarks.find(b => b.id === id);
                return (
                  <Badge key={`benchmark-${id}`} variant="success">
                    <Stack direction="row" gap="sm" align="center">
                      <Text size="sm">{benchmark?.name || `Benchmark ${id}`}</Text>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromComparison(id, 'benchmark')}
                        className="text-success-text hover:text-success-text p-0 h-auto"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Stack>
                  </Badge>
                );
              })}
            </div>

            {/* Performance Chart */}
            <PerformanceChart
              portfolioIds={selectedPortfolios}
              benchmarkIds={selectedBenchmarks}
              period="1Y"
              height={300}
            />
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      {comparisonData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Métricas Comparativas</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={comparisonData}
              columns={[
                {
                  key: 'name',
                  header: 'Nombre',
                  render: (item) => <Text weight="medium">{item.name}</Text>,
                },
                {
                  key: 'type',
                  header: 'Tipo',
                  render: (item) => (
                    <Badge variant={item.type === 'portfolio' ? 'brand' : 'success'}>
                      {item.type === 'portfolio' ? 'Cartera' : 'Benchmark'}
                    </Badge>
                  ),
                },
                {
                  key: 'performance',
                  header: 'Retorno Total',
                  render: (item) => (
                    <Badge variant={item.performance >= 0 ? 'success' : 'error'}>
                      {item.performance >= 0 ? '+' : ''}{item.performance.toFixed(2)}%
                    </Badge>
                  ),
                },
                {
                  key: 'volatility',
                  header: 'Volatilidad',
                  render: (item) => (
                    <Badge variant={item.volatility < 10 ? 'success' : item.volatility < 15 ? 'warning' : 'error'}>
                      {item.volatility.toFixed(1)}%
                    </Badge>
                  ),
                },
                {
                  key: 'sharpe',
                  header: 'Sharpe',
                  render: (item) => (
                    <Badge variant={item.sharpe && item.sharpe > 1 ? 'success' : item.sharpe && item.sharpe > 0.5 ? 'warning' : 'error'}>
                      {item.sharpe?.toFixed(2) || 'N/A'}
                    </Badge>
                  ),
                },
                {
                  key: 'maxDrawdown',
                  header: 'Max Drawdown',
                  render: (item) => (
                    <Badge variant={item.maxDrawdown && item.maxDrawdown > -10 ? 'success' : item.maxDrawdown && item.maxDrawdown > -20 ? 'warning' : 'error'}>
                      {item.maxDrawdown?.toFixed(2) || 'N/A'}%
                    </Badge>
                  ),
                },
              ]}
              keyField="id"
            />
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent>
            <div className="text-center">
              <Stack direction="column" gap="md" align="center">
                <Spinner size="lg" />
                <Text color="secondary">Calculando métricas comparativas...</Text>
              </Stack>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}