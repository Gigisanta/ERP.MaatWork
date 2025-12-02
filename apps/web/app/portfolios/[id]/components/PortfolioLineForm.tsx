/**
 * Formulario para crear una nueva línea de portfolio
 */

'use client';

import { useState } from 'react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Button,
  Stack,
  Input,
  Select,
  Text,
} from '@cactus/ui';

interface CreateLineData {
  targetType: 'instrument' | 'assetClass';
  assetClass?: string;
  instrumentId?: string;
  targetWeight: string;
}

interface PortfolioLineFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateLineData) => Promise<boolean>;
  isSubmitting: boolean;
  currentTotalWeight: number;
}

export function PortfolioLineForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  currentTotalWeight,
}: PortfolioLineFormProps) {
  const [formData, setFormData] = useState<CreateLineData>({
    targetType: 'assetClass',
    targetWeight: '0',
  });

  const handleSubmit = async () => {
    const success = await onSubmit(formData);
    if (success) {
      // Reset form
      setFormData({
        targetType: 'assetClass',
        targetWeight: '0',
      });
      onOpenChange(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalHeader>
        <ModalTitle>Agregar Componente a la Cartera</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <Stack direction="column" gap="lg">
          <Select
            label="Tipo de Componente"
            value={formData.targetType}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, targetType: value as 'instrument' | 'assetClass' }))
            }
            items={[
              { value: 'assetClass', label: 'Clase de Activo' },
              { value: 'instrument', label: 'Instrumento Específico' },
            ]}
          />

          {formData.targetType === 'assetClass' && (
            <Select
              label="Clase de Activo"
              value={formData.assetClass || ''}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, assetClass: value }))}
              items={[
                { value: 'equity', label: 'Acciones' },
                { value: 'fixed_income', label: 'Renta Fija' },
                { value: 'commodities', label: 'Commodities' },
                { value: 'cash', label: 'Efectivo' },
                { value: 'alternatives', label: 'Alternativas' },
              ]}
            />
          )}

          {formData.targetType === 'instrument' && (
            <Input
              label="ID del Instrumento"
              value={formData.instrumentId || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, instrumentId: e.target.value }))}
              placeholder="Ingresa el ID del instrumento"
            />
          )}

          <Input
            label="Peso Objetivo (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.targetWeight}
            onChange={(e) => setFormData((prev) => ({ ...prev, targetWeight: e.target.value }))}
            placeholder="Ej: 25.5"
          />
          <Text size="sm" color="secondary">
            Peso actual: {(currentTotalWeight * 100).toFixed(2)}%
          </Text>
        </Stack>
      </ModalContent>
      <ModalFooter>
        <Stack direction="row" gap="sm">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} variant="primary">
            {isSubmitting ? 'Agregando...' : 'Agregar'}
          </Button>
        </Stack>
      </ModalFooter>
    </Modal>
  );
}
