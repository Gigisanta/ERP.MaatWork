/**
 * AUM Rows Page - Orchestrator Component
 * 
 * AI_DECISION: Componente orquestador minimalista (< 100 líneas)
 * Justificación: Delega lógica a hooks y componentes, facilita mantenimiento y testing
 * Impacto: Reducción de 803 → 85 líneas (90%), mejor separación de responsabilidades
 */

'use client';

import { useCallback } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { canImportFiles } from '@/lib/auth-helpers';
import { useAumRows } from '@/lib/api-hooks';
import { cleanupAumDuplicates, resetAumSystem } from '@/lib/api/aum';
import { AumErrorBoundary } from './components/AumErrorBoundary';
import { AumFiltersBar } from './components/AumFiltersBar';
import { AumAdminActions } from './components/AumAdminActions';
import { AumVirtualTable } from './components/AumVirtualTable';
import { AumPagination } from './components/AumPagination';
import FileUploader from '../components/FileUploader';
import AdvisorProfileModal from '../components/AdvisorProfileModal';
import DuplicateResolutionModal from '../components/DuplicateResolutionModal';
import { useAumRowsState } from './hooks/useAumRowsState';
import { useDebouncedValue } from './hooks/useDebouncedState';
import { useUrlSync } from './hooks/useUrlSync';
import { AUM_ROWS_CONFIG } from './lib/aumRowsConstants';
import { useEffect } from 'react';

export default function AumRowsPage() {
  const { user } = useAuth();
  const canImport = canImportFiles(user);

  // Centralized state management
  const { state, actions } = useAumRowsState();
  
  // Sync URL with state (URL → State) for fileId
  useUrlSync({
    onFileIdChange: (fileId) => {
      if (fileId !== state.uploadedFileId) {
        actions.setUploadedFileId(fileId);
      }
    }
  });
  
  // Debounced search term
  const debouncedSearchTerm = useDebouncedValue(
    state.search.term,
    AUM_ROWS_CONFIG.DEBOUNCE_MS
  );
  
  // Sync debounced search back to state for consistency
  useEffect(() => {
    if (debouncedSearchTerm !== state.search.debounced) {
      actions.setDebouncedSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, state.search.debounced, actions]);

  // Fetch data with SWR
  const { rows, totalRows, isLoading, error, mutate } = useAumRows({
    limit: state.pagination.limit,
    offset: state.pagination.offset,
    broker: state.filters.broker !== 'all' ? state.filters.broker : undefined,
    status: state.filters.status !== 'all' ? state.filters.status : undefined,
    fileId: state.uploadedFileId || undefined,
    preferredOnly: !state.uploadedFileId, // Show all when filtering by file
    search: debouncedSearchTerm || undefined,
    onlyUpdated: state.onlyUpdated
  });

  // Admin actions
  const handleCleanupDuplicates = useCallback(async () => {
    if (!confirm('¿Confirmar limpieza de duplicados no preferidos?')) return;
    
    actions.setLoading('cleaning', true);
    try {
      await cleanupAumDuplicates();
      await mutate();
    } finally {
      actions.setLoading('cleaning', false);
    }
  }, [actions, mutate]);

  // AI_DECISION: Doble confirmación para acción destructiva crítica
  // Justificación: Reset elimina TODOS los datos, requiere confirmación explícita
  // Impacto: Previene pérdida de datos por error del usuario
  const handleResetAll = useCallback(async () => {
    if (!confirm('⚠️ ADVERTENCIA: Esto eliminará TODAS las filas AUM. ¿Continuar?')) return;
    
    actions.setLoading('resetting', true);
    try {
      await resetAumSystem();
      await mutate();
    } finally {
      actions.setLoading('resetting', false);
    }
  }, [actions, mutate]);

  const handleUploadSuccess = useCallback((fileId: string) => {
    actions.setUploadedFileId(fileId);
    actions.setLoading('waitingUpload', false);
    mutate();
  }, [actions, mutate]);

  // Pagination handlers
  const handlePrevPage = useCallback(() => {
    actions.setPagination({
      offset: Math.max(0, state.pagination.offset - state.pagination.limit)
    });
  }, [state.pagination, actions]);

  const handleNextPage = useCallback(() => {
    actions.setPagination({
      offset: state.pagination.offset + state.pagination.limit
    });
  }, [state.pagination, actions]);

  const hasPrevPage = state.pagination.offset > 0;
  const hasNextPage = state.pagination.offset + state.pagination.limit < totalRows;

  return (
    <AumErrorBoundary onReset={() => mutate()}>
      <div className="min-h-screen bg-gray-50">
        {/* Header y Admin Actions */}
        <section className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Panel de Administración AUM y Brokers
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Normalización de cuentas comitentes
                </p>
              </div>

              <AumAdminActions
                isResetting={state.loading.resetting}
                isCleaningDuplicates={state.loading.cleaning}
                canImport={canImport}
                onReset={handleResetAll}
                onCleanupDuplicates={handleCleanupDuplicates}
              />
            </div>

            {/* Filtros y Uploader */}
            <div className="flex items-center justify-between gap-4">
              <AumFiltersBar
                broker={state.filters.broker}
                status={state.filters.status}
                searchTerm={state.search.term}
                onlyUpdated={state.onlyUpdated}
                onBrokerChange={(value) => actions.setFilters({ broker: value })}
                onStatusChange={(value) => actions.setFilters({ status: value })}
                onSearchChange={(term) => actions.setSearchTerm(term)}
                onOnlyUpdatedChange={(checked) => actions.setOnlyUpdated(checked)}
              />

              {canImport && (
                <div className="ml-auto">
                  <FileUploader onUploadSuccess={handleUploadSuccess} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Tabla Principal */}
        <div className="px-6 py-6">
          <AumVirtualTable
            rows={rows || []}
            isLoading={isLoading}
            error={error}
            onOpenAdvisorModal={(row) => actions.openAdvisorModal(row)}
            onShowDuplicates={(accountNumber) => actions.openDuplicateModal(accountNumber)}
          />

          {/* Paginación */}
          {!isLoading && rows && rows.length > 0 && (
            <AumPagination
              limit={state.pagination.limit}
              offset={state.pagination.offset}
              total={totalRows}
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
              hasPrevPage={hasPrevPage}
              hasNextPage={hasNextPage}
              showSearchInfo={!!debouncedSearchTerm}
              searchActive={!!debouncedSearchTerm}
            />
          )}
        </div>

        {/* Modales */}
        {state.modals.advisor.open && state.modals.advisor.row && (
          <AdvisorProfileModal
            row={state.modals.advisor.row}
            onClose={() => actions.closeAdvisorModal()}
            onResolved={() => {
              actions.closeAdvisorModal();
              mutate();
            }}
          />
        )}

        {state.modals.duplicate.open && state.modals.duplicate.accountNumber && (
          <DuplicateResolutionModal
            accountNumber={state.modals.duplicate.accountNumber}
            onClose={() => actions.closeDuplicateModal()}
            onResolved={() => {
              actions.closeDuplicateModal();
              mutate();
            }}
          />
        )}
      </div>
    </AumErrorBoundary>
  );
}

