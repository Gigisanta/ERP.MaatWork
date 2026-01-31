'use client';
import { useState, useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { usePageTitle } from '../../components/PageTitleContext';
import { Heading, Text, Button, Alert, Spinner, Toast } from '@maatwork/ui';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePortfolios } from '../hooks/usePortfolios';
import { PortfoliosGrid } from './PortfoliosGrid';
import { PortfolioForm } from './PortfolioForm';
import { PortfolioAnalyticsView } from './PortfolioAnalyticsView';
import { addPortfolioLine, getPortfolioById } from '@/lib/api';
import { logger, toLogContext } from '@/lib/logger';
import type { Portfolio, PortfolioLine, AddPortfolioLineRequest, RiskLevel } from '@/types';
import { ensureInstrumentsExist, syncPortfolioLines } from '../utils/portfolio-helpers';
import { ConfirmDialog as ConfirmDialogComponent } from '@maatwork/ui';
import { PortfolioSkeleton } from './PortfolioSkeleton';

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

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Use SWR hook with filters
  const {
    portfolios,
    pagination,
    isLoading: portfoliosLoading,
    error: portfoliosError,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,

  } = usePortfolios({
    page,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });

  // Use initial portfolios if SWR hasn't loaded yet AND we are on first page/no search
  // Actually, prefer SWR data if available.
  const displayPortfolios = (portfolios && portfolios.length > 0) 
    ? portfolios 
    : (page === 1 && !debouncedSearch ? (initialPortfolios || []) : []);


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
    logger.debug('Opening Create Portfolio Form');
    setEditingPortfolio(null);
    setShowPortfolioForm(true);
  }, []);

  const handleEditPortfolio = useCallback((portfolio: Portfolio) => {
    logger.debug(toLogContext({ portfolioName: portfolio.name }), 'Opening Edit Portfolio Form');
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
            logger.error(toLogContext({ err, portfolioId }), 'Error deleting portfolio');
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
        logger.error(toLogContext({ err, data, editingPortfolio }), 'Error submitting portfolio');
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

  // Error state - Skeleton logic is in Grid section
  if (portfoliosError && displayPortfolios.length === 0) {
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
      className={`space-y-6 transition-all duration-500 ease-out ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-500 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
        style={{ transitionDelay: '50ms' }}
      >
        <div className="space-y-1">
          <Heading level={1}>Carteras</Heading>
          <Text size="sm" color="secondary">Gestión y análisis de portfolios</Text>
        </div>
        <Button onClick={handleCreatePortfolio} variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cartera
        </Button>
      </div>

      {/* Toolbar: Search */}
      <div className="flex items-center gap-4 p-4 bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-white/5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>

        {portfoliosLoading && (
            <div className="ml-auto">
               <Spinner size="sm" />
            </div>
        )}
      </div>

      {/* Grid de Carteras */}
      <div
        className={`transition-all duration-500 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: '100ms' }}
      >
        {portfoliosLoading && displayPortfolios.length === 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <PortfolioSkeleton key={i} />
              ))}
           </div>
        ) : displayPortfolios.length > 0 ? (
          <PortfoliosGrid
            portfolios={displayPortfolios}
            onEdit={handleEditPortfolio}
            onDelete={handleDeletePortfolio}
            onCreateNew={handleCreatePortfolio}
            onSelect={handleSelectPortfolio}
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
             <Text>No se encontraron carteras con los filtros seleccionados.</Text>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between py-4 border-t border-gray-100 dark:border-white/5">
          <Text size="sm" color="secondary">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
          </Text>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <div className="flex items-center gap-1 px-2">
               <span className="text-sm font-medium">{pagination.page}</span>
               <span className="text-sm text-gray-400">/</span>
               <span className="text-sm text-gray-400">{pagination.totalPages}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

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
        onOpenChange={(open: boolean) => setToast((prev) => ({ ...prev, show: open }))}
      />

      {/* Confirm Dialog */}
      <ConfirmDialogComponent
        open={confirmDialog.open}
        onOpenChange={(open: boolean) => setConfirmDialog((prev) => ({ ...prev, open }))}
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
