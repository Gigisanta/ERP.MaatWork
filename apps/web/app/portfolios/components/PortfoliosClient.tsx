'use client';
import { useState, useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { usePageTitle } from '../../components/PageTitleContext';
import { Stack, Heading, Text, Button, Alert, Spinner, Toast } from '@cactus/ui';
import { usePortfolios } from '../hooks/usePortfolios';
import { PortfoliosGrid } from './PortfoliosGrid';
import { PortfolioForm } from './PortfolioForm';
import { PortfolioAnalyticsView } from './PortfolioAnalyticsView';
import { addPortfolioLine, getPortfolioById } from '@/lib/api';
import { logger, toLogContext } from '@/lib/logger';
import type { Portfolio, PortfolioLine, AddPortfolioLineRequest, RiskLevel } from '@/types';
import { ensureInstrumentsExist, syncPortfolioLines } from '../utils/portfolio-helpers';
import ConfirmDialogComponent from '../../components/ConfirmDialog';

interface PortfoliosClientProps {
  initialPortfolios: Portfolio[];
}

/**
 * PortfoliosClient - Client Island for portfolio management interactivity
 */
export default function PortfoliosClient({ initialPortfolios }: PortfoliosClientProps) {
  usePageTitle('Carteras');

  // Page transition animation state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Use SWR hook - it will use initialPortfolios as fallback
  const {
    portfolios,
    isLoading: portfoliosLoading,
    error: portfoliosError,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
  } = usePortfolios();

  // Use initial portfolios if SWR hasn't loaded yet
  const displayPortfolios = portfolios.length > 0 ? portfolios : initialPortfolios;

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    description?: string;
    variant: 'success' | 'error' | 'warning' | 'info';
  }>({
    show: false,
    title: '',
    variant: 'info',
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'default';
  }>({
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
      setToast({ show: true, title, ...(description && { description }), variant });
    },
    []
  );

  const handleCreatePortfolio = useCallback(() => {
    console.log('Opening Create Portfolio Form');
    setEditingPortfolio(null);
    setShowPortfolioForm(true);
  }, []);

  const handleEditPortfolio = useCallback((portfolio: Portfolio) => {
    console.log('Opening Edit Portfolio Form for:', portfolio.name);
    setEditingPortfolio(portfolio);
    setShowPortfolioForm(true);
  }, []);

  const handleSelectPortfolio = useCallback((portfolio: Portfolio) => {
    setSelectedPortfolioId(portfolio.id);
  }, []);

  const handleDeletePortfolio = useCallback(
    (portfolioId: string) => {
      setConfirmDialog({
        open: true,
        title: 'Eliminar cartera',
        description: '¿Estás seguro de eliminar esta cartera? Esta acción no se puede deshacer.',
        variant: 'danger',
        onConfirm: async () => {
          setIsSubmitting(true);
          try {
            const response = await deletePortfolio(portfolioId);
            if (response.success) {
              if (selectedPortfolioId === portfolioId) {
                setSelectedPortfolioId(null);
              }
              showToast('Cartera eliminada', 'La cartera se eliminó exitosamente', 'success');
            } else {
              const errorMessage = response.error || 'Error al eliminar cartera';
              showToast('Error al eliminar cartera', errorMessage, 'error');
            }
          } catch (err) {
            logger.error('Error deleting portfolio', toLogContext({ err, portfolioId }));
            showToast('Error al eliminar cartera', 'Error desconocido', 'error');
          } finally {
            setIsSubmitting(false);
          }
        },
      });
    },
    [deletePortfolio, showToast, selectedPortfolioId]
  );

  const handlePortfolioSubmit = useCallback(
    async (data: {
      name: string;
      description: string;
      riskLevel: string;
      lines: PortfolioLine[];
    }) => {
      setIsSubmitting(true);

      try {
        // Crear instrumentos si no existen usando helper
        const instrumentIds = await ensureInstrumentsExist(data.lines);

        if (editingPortfolio) {
          // Actualizar portfolio existente
          const updateResponse = await updatePortfolio(editingPortfolio.id, {
            name: data.name,
            description: data.description,
            riskLevel: data.riskLevel as RiskLevel,
          });

          if (!updateResponse.success) {
            throw new Error(updateResponse.error || 'Error al actualizar cartera');
          }

          // Obtener líneas actuales
          const currentPortfolioResponse = await getPortfolioById(editingPortfolio.id);
          const currentLines =
            (currentPortfolioResponse.success && currentPortfolioResponse.data?.lines) || [];

          // Sincronizar líneas usando helper
          await syncPortfolioLines(editingPortfolio.id, currentLines, data.lines, instrumentIds);

          showToast('Cartera actualizada', 'La cartera se actualizó exitosamente', 'success');
        } else {
          // Crear nuevo portfolio
          const portfolioResponse = await createPortfolio({
            name: data.name,
            description: data.description,
            riskLevel: data.riskLevel as RiskLevel,
          });

          if (!portfolioResponse.success || !portfolioResponse.data) {
            throw new Error(portfolioResponse.error || 'Error al crear cartera');
          }

          const portfolioId = portfolioResponse.data.id;

          // Agregar líneas al portfolio
          for (let i = 0; i < data.lines.length; i++) {
            const line = data.lines[i];
            const instrumentId = instrumentIds[i] || line.instrumentId;

            const payload: AddPortfolioLineRequest = {
              targetType: line.targetType,
              targetWeight: line.targetWeight,
              ...(line.targetType === 'assetClass' && line.assetClass
                ? { assetClass: line.assetClass }
                : {}),
              ...(instrumentId ? { instrumentId } : {}),
            };
            await addPortfolioLine(portfolioId, payload);
          }

          showToast('Cartera creada', 'La cartera se creó exitosamente', 'success');
        }

        setShowPortfolioForm(false);
        setEditingPortfolio(null);
      } catch (err) {
        logger.error('Error submitting portfolio', toLogContext({ err, data, editingPortfolio }));
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        if (errorMessage.includes('instrumento')) {
          showToast('Error al crear instrumento', errorMessage, 'error');
        } else {
          showToast('Error', errorMessage, 'error');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingPortfolio, createPortfolio, updatePortfolio, showToast]
  );

  if (portfoliosLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Stack direction="column" gap="md" align="center">
          <Spinner size="lg" />
          <Text color="secondary">Cargando carteras...</Text>
        </Stack>
      </div>
    );
  }

  if (portfoliosError) {
    return (
      <div className="flex items-center justify-center p-8">
        <Alert variant="error" title="Error">
          {portfoliosError}
        </Alert>
      </div>
    );
  }

  return (
    <div
      className={`space-y-4 transition-all duration-500 ease-out ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Header compacto */}
      <div
        className={`flex items-center justify-between transition-all duration-500 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
        style={{ transitionDelay: '50ms' }}
      >
        <Heading level={1}>Carteras</Heading>
        <Button onClick={handleCreatePortfolio} variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cartera
        </Button>
      </div>

      {/* Grid de Carteras Compacto */}
      <div
        className={`transition-all duration-500 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: '100ms' }}
      >
        <PortfoliosGrid
          portfolios={displayPortfolios}
          onEdit={handleEditPortfolio}
          onDelete={handleDeletePortfolio}
          onCreateNew={handleCreatePortfolio}
          onSelect={handleSelectPortfolio}
        />
      </div>

      {/* Dashboard Unificado: Gráfico + Watchlist */}
      <div
        className={`transition-all duration-500 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: '150ms' }}
      >
        <PortfolioAnalyticsView portfolios={displayPortfolios} />
      </div>

      {/* Portfolio Form Drawer */}
      <PortfolioForm
        open={showPortfolioForm}
        onOpenChange={setShowPortfolioForm}
        portfolio={editingPortfolio}
        onSubmit={handlePortfolioSubmit}
        isLoading={isSubmitting}
      />

      {/* Toast Notifications */}
      <Toast
        title={toast.title}
        {...(toast.description && { description: toast.description })}
        variant={toast.variant}
        open={toast.show}
        onOpenChange={(open) => setToast((prev) => ({ ...prev, show: open }))}
      />

      {/* Confirm Dialog */}
      <ConfirmDialogComponent
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant || 'default'}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
      />
    </div>
  );
}
