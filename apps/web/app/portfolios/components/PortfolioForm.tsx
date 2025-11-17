'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  Drawer,
  Stack,
  Heading,
  Text,
  Input,
  Select,
  Button,
} from '@cactus/ui';
import { PortfolioComposition } from './PortfolioComposition';
import type {
  Portfolio,
  PortfolioLine,
  RiskLevel,
  InstrumentSearchResult,
} from '@/types';

interface PortfolioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolio?: Portfolio | null;
  onSubmit: (data: {
    name: string;
    description: string;
    riskLevel: RiskLevel;
    lines: PortfolioLine[];
  }) => Promise<void>;
  isLoading?: boolean;
}

export function PortfolioForm({
  open,
  onOpenChange,
  portfolio,
  onSubmit,
  isLoading = false,
}: PortfolioFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('moderate');
  const [lines, setLines] = useState<PortfolioLine[]>([]);

  const isEditing = !!portfolio;

  useEffect(() => {
    if (portfolio) {
      setName(portfolio.name);
      setDescription(portfolio.description || '');
      setRiskLevel(portfolio.riskLevel);
      setLines(portfolio.lines || []);
    } else {
      setName('');
      setDescription('');
      setRiskLevel('moderate');
      setLines([]);
    }
  }, [portfolio, open]);

  const handleAddAsset = (asset: InstrumentSearchResult) => {
    const exists = lines.find((line) => line.instrumentSymbol === asset.symbol);
    if (exists) {
      return; // Duplicado, se manejará en el componente padre
    }

    const newLine: PortfolioLine = {
      id: `temp-${Date.now()}`,
      templateId: portfolio?.id || '',
      targetType: 'instrument',
      instrumentSymbol: asset.symbol,
      instrumentName: asset.name,
      instrumentId: null,
      targetWeight: 0,
    };

    setLines([...lines, newLine]);
  };

  const handleUpdateWeight = (lineId: string, weight: number) => {
    setLines((prevLines) =>
      prevLines.map((line) =>
        line.id === lineId ? { ...line, targetWeight: weight / 100 } : line
      )
    );
  };

  const handleRemoveLine = (lineId: string) => {
    setLines((prevLines) => prevLines.filter((line) => line.id !== lineId));
  };

  const totalWeight = lines.reduce((sum, line) => {
    const weight = typeof line.targetWeight === 'number' ? line.targetWeight * 100 : 0;
    return sum + (isNaN(weight) ? 0 : weight);
  }, 0);

  const isValid = name.trim() !== '' && lines.length > 0 && Math.abs(totalWeight - 100) < 0.01;

  const handleSubmit = async () => {
    if (!isValid) return;

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      riskLevel,
      lines,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side="right" className="w-full max-w-2xl">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <Heading level={2}>
            {isEditing ? 'Editar Cartera' : 'Crear Nueva Cartera'}
          </Heading>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Stack direction="column" gap="lg">
            <Input
              label="Nombre de la Cartera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Cartera Conservadora"
              disabled={isLoading}
            />

            <div>
              <label className="block text-sm font-medium text-foreground-base mb-2">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 border border-border bg-surface text-foreground-base rounded-md focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Descripción de la estrategia de inversión"
                disabled={isLoading}
              />
            </div>

            <Select
              label="Nivel de Riesgo"
              value={riskLevel}
              onValueChange={(value) => setRiskLevel(value as RiskLevel)}
              items={[
                { value: 'conservative', label: 'Conservador' },
                { value: 'moderate', label: 'Moderado' },
                { value: 'aggressive', label: 'Agresivo' },
              ]}
              disabled={isLoading}
            />

            <PortfolioComposition
              lines={lines}
              onAddAsset={handleAddAsset}
              onUpdateWeight={handleUpdateWeight}
              onRemoveLine={handleRemoveLine}
              disabled={isLoading}
            />
          </Stack>
        </div>

        <div className="p-6 border-t border-border">
          <Stack direction="row" gap="sm" justify="end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
            >
              {isLoading
                ? isEditing
                  ? 'Guardando...'
                  : 'Creando...'
                : isEditing
                ? 'Guardar Cambios'
                : 'Crear Cartera'}
            </Button>
          </Stack>
        </div>
      </div>
    </Drawer>
  );
}

