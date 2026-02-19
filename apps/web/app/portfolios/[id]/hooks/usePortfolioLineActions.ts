/**
 * Hook para manejar acciones de líneas del portfolio
 *
 * Extrae lógica de create, update, delete de líneas
 */

import { useState, useCallback } from 'react';
import { addPortfolioLine, deletePortfolioLine } from '@/lib/api';
import { logger, toLogContext } from '@/lib/logger';
import type { AddPortfolioLineRequest } from '@/types';

interface CreateLineData {
  targetType: 'instrument' | 'assetClass';
  assetClass?: string;
  instrumentId?: string;
  targetWeight: string;
}

interface ToastState {
  show: boolean;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'warning' | 'info';
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  description?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'default';
}

export function usePortfolioLineActions(
  portfolioId: string | null,
  currentTotalWeight: number,
  onSuccess: () => void
) {
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    title: '',
    variant: 'info',
  });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    onConfirm: () => {},
  });

  const showToast = useCallback(
    (
      title: string,
      description?: string,
      variant: 'success' | 'error' | 'warning' | 'info' = 'info'
    ) => {
      setToast({
        show: true,
        title,
        ...(description && { description }),
        variant,
      });
    },
    []
  );

  const handleCreateLine = useCallback(
    async (createLineData: CreateLineData): Promise<boolean> => {
      if (!portfolioId) return false;

      try {
        setIsCreating(true);

        // Validar peso
        const weightPercent = parseFloat(createLineData.targetWeight);
        if (isNaN(weightPercent) || weightPercent <= 0 || weightPercent > 100) {
          showToast('Peso inválido', 'El peso debe estar entre 0 y 100%', 'warning');
          return false;
        }

        // Convertir de porcentaje a decimal
        const weight = weightPercent / 100;

        // Validar que no exceda 100% total
        const currentTotal = currentTotalWeight * 100;
        if (currentTotal + weightPercent > 100) {
          showToast(
            'Peso excedido',
            `El peso total excedería 100%. Actual: ${currentTotal.toFixed(2)}%`,
            'warning'
          );
          return false;
        }

        // Validar campos requeridos según tipo
        if (createLineData.targetType === 'assetClass' && !createLineData.assetClass) {
          showToast('Campo requerido', 'Debes seleccionar una clase de activo', 'warning');
          return false;
        }

        if (createLineData.targetType === 'instrument' && !createLineData.instrumentId) {
          showToast('Campo requerido', 'Debes seleccionar un instrumento', 'warning');
          return false;
        }

        const payload: AddPortfolioLineRequest = {
          targetType: createLineData.targetType,
          targetWeight: weight,
        };

        if (createLineData.targetType === 'assetClass' && createLineData.assetClass) {
          payload.assetClass = createLineData.assetClass;
        } else if (createLineData.targetType === 'instrument' && createLineData.instrumentId) {
          payload.instrumentId = createLineData.instrumentId;
        }

        const response = await addPortfolioLine(portfolioId, payload);

        if (!response.success) {
          const errorMessage = response.error || 'Error al crear la línea';
          throw new Error(errorMessage);
        }

        // Recargar portfolio completo
        onSuccess();
        showToast('Línea agregada', 'La línea se agregó exitosamente', 'success');

        return true;
      } catch (err) {
        logger.error(
          toLogContext({ err, portfolioId, data: createLineData }),
          'Error creating portfolio line'
        );
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        showToast('Error al crear línea', errorMessage, 'error');
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [portfolioId, currentTotalWeight, onSuccess, showToast]
  );

  const handleDeleteLine = useCallback(
    (lineId: string) => {
      if (!portfolioId) return;

      setConfirmDialog({
        open: true,
        title: 'Eliminar línea',
        description: '¿Estás seguro de eliminar esta línea? Esta acción no se puede deshacer.',
        variant: 'danger',
        onConfirm: async () => {
          try {
            const response = await deletePortfolioLine(portfolioId, lineId);

            if (!response.success) {
              const errorMessage = response.error || 'Error al eliminar la línea';
              throw new Error(errorMessage);
            }

            // Recargar portfolio completo
            onSuccess();
            showToast('Línea eliminada', 'La línea se eliminó exitosamente', 'success');
          } catch (err) {
            logger.error(toLogContext({ err, lineId, portfolioId }), 'Error deleting portfolio line');
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            showToast('Error al eliminar línea', errorMessage, 'error');
          }
        },
      });
    },
    [portfolioId, onSuccess, showToast]
  );

  return {
    isCreating,
    toast,
    setToast,
    confirmDialog,
    setConfirmDialog,
    handleCreateLine,
    handleDeleteLine,
    showToast,
  };
}
