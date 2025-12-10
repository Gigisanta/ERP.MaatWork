'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, TrendingUp, Eye, ChevronDown, ChevronUp, X } from 'lucide-react';
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
  Drawer,
  Input,
} from '@cactus/ui';
import dynamic from 'next/dynamic';
import { PortfolioComposition } from './PortfolioComposition';
import type {
  Benchmark,
  BenchmarkComponentForm,
  InstrumentSearchResult,
  PortfolioLine,
} from '@/types';

const AssetSearcher = dynamic(() => import('../../components/AssetSearcher'), {
  loading: () => <div style={{ padding: '1rem', textAlign: 'center' }}>Loading...</div>,
  ssr: false,
});

interface BenchmarksSectionProps {
  benchmarks: Benchmark[];
  onCreate: (data: {
    name: string;
    description: string;
    code: string;
    components: BenchmarkComponentForm[];
  }) => Promise<void>;
  onUpdate: (
    id: string,
    data: {
      name: string;
      description: string;
      code: string;
      components: BenchmarkComponentForm[];
    }
  ) => Promise<void>;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function BenchmarksSection({
  benchmarks,
  onCreate,
  onUpdate,
  onDelete,
  isLoading = false,
}: BenchmarksSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState<Benchmark | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
  });
  const [components, setComponents] = useState<BenchmarkComponentForm[]>([]);

  const handleCreate = () => {
    setEditingBenchmark(null);
    setFormData({ name: '', description: '', code: '' });
    setComponents([]);
    setShowForm(true);
  };

  const handleEdit = (benchmark: Benchmark) => {
    setEditingBenchmark(benchmark);
    setFormData({
      name: benchmark.name,
      description: benchmark.description || '',
      code: benchmark.code || '',
    });
    setComponents(
      (benchmark.components || []).map((comp) => ({
        id: comp.id,
        instrumentId: comp.instrumentId,
        instrumentSymbol: comp.instrumentSymbol || '',
        instrumentName: comp.instrumentName || '',
        weight: comp.weight * 100 || 0,
        targetWeight: comp.weight * 100 || 0,
      }))
    );
    setShowForm(true);
  };

  const handleAddAsset = (asset: InstrumentSearchResult) => {
    const exists = components.find((comp) => comp.instrumentSymbol === asset.symbol);
    if (exists) return;

    const newComponent: BenchmarkComponentForm = {
      id: `temp-${Date.now()}`,
      instrumentSymbol: asset.symbol,
      instrumentName: asset.name,
      instrumentId: null,
      weight: 0,
      targetWeight: 0,
    };

    setComponents([...components, newComponent]);
  };

  const handleUpdateWeight = (componentId: string, weight: number) => {
    setComponents((prev) =>
      prev.map((comp) => (comp.id === componentId ? { ...comp, weight } : comp))
    );
  };

  const handleRemoveComponent = (componentId: string) => {
    setComponents((prev) => prev.filter((comp) => comp.id !== componentId));
  };

  const totalWeight = components.reduce((sum, comp) => sum + (comp.weight || 0), 0);
  const isValid =
    formData.name.trim() !== '' &&
    formData.code.trim() !== '' &&
    components.length > 0 &&
    Math.abs(totalWeight - 100) < 0.01;

  const handleSubmit = async () => {
    if (!isValid) return;

    if (editingBenchmark) {
      await onUpdate(editingBenchmark.id, {
        ...formData,
        components,
      });
    } else {
      await onCreate({
        ...formData,
        components,
      });
    }

    setShowForm(false);
    setEditingBenchmark(null);
    setFormData({ name: '', description: '', code: '' });
    setComponents([]);
  };

  const benchmarkLines = components.map((comp) => ({
    id: comp.id,
    templateId: editingBenchmark?.id || '',
    targetType: 'instrument' as const,
    instrumentId: comp.instrumentId || null,
    instrumentSymbol: comp.instrumentSymbol,
    instrumentName: comp.instrumentName ?? null,
    targetWeight: comp.weight / 100,
    assetClass: null,
    assetClassName: null,
  }));

  return (
    <>
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent-text" />
                <Text weight="semibold" size="sm">
                  Benchmarks
                </Text>
                <Text size="xs" color="secondary">
                  ({benchmarks.length})
                </Text>
              </div>
              <Stack direction="row" gap="xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="h-7 w-7 p-0"
                >
                  {isCollapsed ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronUp className="w-3 h-3" />
                  )}
                </Button>
                <Button onClick={handleCreate} variant="primary" size="sm" className="h-7">
                  <Plus className="w-3 h-3 mr-1" />
                  Nuevo
                </Button>
              </Stack>
            </div>
            {!isCollapsed && (
              <div>
                {benchmarks.length > 0 ? (
                  <Grid cols={3} gap="lg">
                    {benchmarks.map((benchmark) => (
                      <Card
                        key={benchmark.id}
                        className="hover:shadow-sm transition-shadow border border-border rounded-md hover:border-border-hover"
                      >
                        <CardContent className="p-4">
                          <Stack direction="column" gap="sm">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <Heading level={5} className="truncate">
                                  {benchmark.name}
                                </Heading>
                                {benchmark.description && (
                                  <Text size="sm" color="secondary" className="mt-1 line-clamp-2">
                                    {benchmark.description}
                                  </Text>
                                )}
                                {benchmark.code && (
                                  <Text size="xs" color="muted" className="font-mono mt-1">
                                    {benchmark.code}
                                  </Text>
                                )}
                              </div>
                              <Badge variant={benchmark.isSystem ? 'secondary' : 'success'}>
                                {benchmark.isSystem ? 'Sistema' : 'Custom'}
                              </Badge>
                            </div>

                            <Stack direction="row" gap="sm" align="center">
                              <TrendingUp className="w-4 h-4 text-foreground-tertiary" />
                              <Text size="sm" color="secondary">
                                {benchmark.components?.length || 0} componentes
                              </Text>
                            </Stack>

                            <Stack direction="row" gap="sm" className="mt-2">
                              <Button variant="outline" size="sm" className="flex-1">
                                <Eye className="w-4 h-4 mr-2" />
                                Ver
                              </Button>
                              {!benchmark.isSystem && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleEdit(benchmark)}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onDelete(benchmark.id)}
                                    className="text-error-500 hover:text-error-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Grid>
                ) : (
                  <EmptyState
                    title="No hay benchmarks configurados"
                    description="Crea benchmarks para comparar el rendimiento de las carteras"
                    action={
                      <Button onClick={handleCreate} variant="primary">
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Primer Benchmark
                      </Button>
                    }
                  />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Drawer */}
      <Drawer open={showForm} onOpenChange={setShowForm} side="right" className="w-full max-w-2xl">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <Heading level={2}>
              {editingBenchmark ? 'Editar Benchmark' : 'Crear Nuevo Benchmark'}
            </Heading>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <Stack direction="column" gap="lg">
              <Input
                label="Nombre del Benchmark"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Merval + S&P 500"
                disabled={isLoading}
              />

              <Input
                label="Código"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Ej: CUSTOM_BALANCED"
                disabled={isLoading || !!editingBenchmark}
              />

              <div>
                <label className="block text-sm font-medium text-foreground-base mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full min-h-[80px] px-3 py-2 border border-border bg-surface text-foreground-base rounded-md focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Descripción del benchmark"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Text size="sm" weight="medium" className="mb-2 block">
                  Buscar Activos
                </Text>
                <AssetSearcher
                  onAssetSelect={handleAddAsset}
                  placeholder="Buscar activo (ej: ^MERV, ^GSPC)"
                />
              </div>

              <PortfolioComposition
                lines={benchmarkLines as unknown as PortfolioLine[]}
                onAddAsset={handleAddAsset}
                onUpdateWeight={(lineId, weight) => {
                  const comp = components.find((c) => c.id === lineId);
                  if (comp) handleUpdateWeight(lineId, weight);
                }}
                onRemoveLine={(lineId) => handleRemoveComponent(lineId)}
                showAssetSearcher={false}
                disabled={isLoading}
              />
            </Stack>
          </div>

          <div className="p-6 border-t border-border">
            <Stack direction="row" gap="sm" justify="end">
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={!isValid || isLoading}>
                {isLoading
                  ? editingBenchmark
                    ? 'Guardando...'
                    : 'Creando...'
                  : editingBenchmark
                    ? 'Guardar Cambios'
                    : 'Crear Benchmark'}
              </Button>
            </Stack>
          </div>
        </div>
      </Drawer>
    </>
  );
}
