'use client';
import React, { useState, useTransition, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Text, Button, Input } from '@maatwork/ui';
import { useRouter } from 'next/navigation';
import { logger, toLogContext } from '@/lib/logger';
import { formatCurrency } from '@maatwork/utils';

interface FinancialSummarySectionProps {
  contactId: string;
  ingresos: number | null | undefined;
  gastos: number | null | undefined;
  excedente: number | null | undefined;
}

/**
 * FinancialSummarySection - Sección para ingresos, gastos y excedente
 * Calcula automáticamente el excedente cuando se actualizan ingresos o gastos
 */
export default function FinancialSummarySection({
  contactId,
  ingresos: initialIngresos,
  gastos: initialGastos,
  excedente: initialExcedente,
}: FinancialSummarySectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ingresos, setIngresos] = useState<string>(initialIngresos?.toString() || '');
  const [gastos, setGastos] = useState<string>(initialGastos?.toString() || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setIngresos(initialIngresos?.toString() || '');
  }, [initialIngresos]);

  useEffect(() => {
    setGastos(initialGastos?.toString() || '');
  }, [initialGastos]);

  // Calcular excedente automáticamente
  const calcularExcedente = (ing: string, gas: string): number | null => {
    const ingNum = parseFloat(ing) || 0;
    const gasNum = parseFloat(gas) || 0;
    if (ing === '' && gas === '') return null;
    return ingNum - gasNum;
  };

  const excedenteCalculado = calcularExcedente(ingresos, gastos);

  const updateField = async (field: 'ingresos' | 'gastos' | 'excedente', value: number | null) => {
    startTransition(async () => {
      try {
        const { updateContactField } = await import('./actions');
        await updateContactField(contactId, field, value);
        router.refresh();
      } catch (err) {
        logger.error(
          toLogContext({ err, contactId, field, value }),
          'Error updating financial field'
        );
      }
    });
  };

  const handleSave = () => {
    const ingresosNum = ingresos ? parseFloat(ingresos) : null;
    const gastosNum = gastos ? parseFloat(gastos) : null;
    const excedenteNum = calcularExcedente(ingresos, gastos);

    // Actualizar todos los campos
    if (ingresosNum !== null || ingresos === '') {
      updateField('ingresos', ingresosNum);
    }
    if (gastosNum !== null || gastos === '') {
      updateField('gastos', gastosNum);
    }
    if (excedenteNum !== null) {
      updateField('excedente', excedenteNum);
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    setIngresos(initialIngresos?.toString() || '');
    setGastos(initialGastos?.toString() || '');
    setIsEditing(false);
  };

  const formatCurrencyValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'Sin especificar';
    return formatCurrency(value, {
      currency: 'ARS',
      locale: 'es-AR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen Financiero</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                label="Ingresos (ARS)"
                type="number"
                step="0.01"
                value={ingresos}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setIngresos(e.target.value);
                }}
                placeholder="0.00"
              />
            </div>
            <div>
              <Input
                label="Gastos (ARS)"
                type="number"
                step="0.01"
                value={gastos}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setGastos(e.target.value);
                }}
                placeholder="0.00"
              />
            </div>
            <div>
              <Text size="sm" weight="medium" color="secondary" className="mb-2 block">
                Excedente
              </Text>
              <div
                className={`px-3 py-2 border rounded-md bg-gray-50 ${excedenteCalculado !== null && excedenteCalculado < 0 ? 'border-red-300 bg-red-50' : excedenteCalculado !== null && excedenteCalculado > 0 ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
              >
                <Text
                  size="sm"
                  className={
                    excedenteCalculado !== null && excedenteCalculado < 0
                      ? 'text-red-700'
                      : excedenteCalculado !== null && excedenteCalculado > 0
                        ? 'text-green-700'
                        : 'text-gray-600'
                  }
                >
                  {excedenteCalculado !== null
                    ? formatCurrencyValue(excedenteCalculado)
                    : 'Sin especificar'}
                </Text>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={handleCancel} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen Financiero</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="cursor-pointer hover:bg-gray-50 px-3 py-2 rounded transition-colors"
            onClick={() => setIsEditing(true)}
          >
            <Text size="sm" weight="medium" color="secondary">
              Ingresos
            </Text>
            <Text className="mt-1 text-lg font-semibold text-green-700">
              {formatCurrencyValue(initialIngresos)}
            </Text>
          </div>
          <div
            className="cursor-pointer hover:bg-gray-50 px-3 py-2 rounded transition-colors"
            onClick={() => setIsEditing(true)}
          >
            <Text size="sm" weight="medium" color="secondary">
              Gastos
            </Text>
            <Text className="mt-1 text-lg font-semibold text-red-700">
              {formatCurrencyValue(initialGastos)}
            </Text>
          </div>
          <div
            className={`cursor-pointer hover:bg-gray-50 px-3 py-2 rounded transition-colors ${
              initialExcedente !== null && initialExcedente !== undefined && initialExcedente < 0
                ? 'bg-red-50 border border-red-200'
                : initialExcedente !== null &&
                    initialExcedente !== undefined &&
                    initialExcedente > 0
                  ? 'bg-green-50 border border-green-200'
                  : ''
            }`}
            onClick={() => setIsEditing(true)}
          >
            <Text size="sm" weight="medium" color="secondary">
              Excedente
            </Text>
            <Text
              className={`mt-1 text-lg font-semibold ${
                initialExcedente !== null && initialExcedente !== undefined && initialExcedente < 0
                  ? 'text-red-700'
                  : initialExcedente !== null &&
                      initialExcedente !== undefined &&
                      initialExcedente > 0
                    ? 'text-green-700'
                    : 'text-gray-600'
              }`}
            >
              {formatCurrencyValue(initialExcedente)}
            </Text>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
