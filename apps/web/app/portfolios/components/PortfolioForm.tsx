'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalFooter, Stack, Input, Select, Button } from '@maatwork/ui';
import { PortfolioComposition } from './PortfolioComposition';
import type { Portfolio, PortfolioLine, RiskLevel, InstrumentSearchResult } from '@/types';

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
      setName(portfolio.name || '');
      setDescription(portfolio.description || '');
      // Ensure riskLevel is valid, fallback to moderate
      setRiskLevel(portfolio.riskLevel || 'moderate');
      setLines(portfolio.lines || []);
    } else {
      // Reset form when opening in create mode
      if (open) {
        setName('');
        setDescription('');
        setRiskLevel('moderate');
        setLines([]);
      }
    }
  }, [portfolio, open]);

  const handleAddAsset = (asset: InstrumentSearchResult) => {
    const exists = lines.find((line) => line.instrumentSymbol === asset.symbol);
    if (exists) {
      // Notify parent about duplicate - will be handled via toast
      return { duplicate: true, symbol: asset.symbol };
    }

    const newLine: PortfolioLine = {
      id: `temp-${Date.now()}`,
      portfolioId: portfolio?.id || '',
      targetType: 'instrument',
      instrumentSymbol: asset.symbol,
      instrumentName: asset.name,
      instrumentId: null,
      targetWeight: 0,
    };

    setLines([...lines, newLine]);
    return { duplicate: false };
  };

  const handleUpdateWeight = (lineId: string, weight: number) => {
    setLines((prevLines) =>
      prevLines.map((line) => (line.id === lineId ? { ...line, targetWeight: weight / 100 } : line))
    );
  };

  const handleRemoveLine = (lineId: string) => {
    setLines((prevLines) => prevLines.filter((line) => line.id !== lineId));
  };

  const handleDistributeEvenly = () => {
    if (lines.length === 0) return;
    const evenWeight = 1 / lines.length;
    setLines((prevLines) =>
      prevLines.map((line) => ({ ...line, targetWeight: evenWeight }))
    );
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
    <Modal 
      open={open} 
      onOpenChange={onOpenChange} 
      size="lg"
      title={isEditing ? 'Editar Cartera' : 'Crear Nueva Cartera'}
    >
      <ModalContent className="max-h-[70vh] overflow-y-auto pr-2">
        <Stack direction="column" gap="lg" className="py-4">
          <Input
            label="Nombre de la Cartera"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="Ej: Cartera Conservadora"
            disabled={isLoading}
          />

          <div>
            <label className="block text-sm font-medium text-foreground-base mb-2">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 border border-border bg-surface text-foreground-base rounded-md focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-colors"
              placeholder="Descripción de la estrategia de inversión"
              disabled={isLoading}
            />
          </div>

          <Select
            label="Nivel de Riesgo"
            value={riskLevel}
            onValueChange={(value: string) => setRiskLevel(value as RiskLevel)}
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
            onDistributeEvenly={handleDistributeEvenly}
            disabled={isLoading}
          />
        </Stack>
      </ModalContent>

      <ModalFooter className="mt-6 pt-4 border-t border-border">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!isValid || isLoading}>
          {isLoading
            ? isEditing
              ? 'Guardando...'
              : 'Creando...'
            : isEditing
              ? 'Guardar Cambios'
              : 'Crear Cartera'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
