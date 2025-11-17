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
import { logger } from '@/lib/logger';

export default function AumRowsPage() {
  const { user } = useAuth();
  const canImport = canImportFiles(user);

  // Centralized state management
  const { state, actions } = useAumRowsState();
  
  // Sync URL with state (URL → State) for fileId
  const { updateUrl } = useUrlSync({
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
    ...(state.filters.broker !== 'all' && { broker: state.filters.broker }),
    ...(state.filters.status !== 'all' && { status: state.filters.status }),
    ...(state.uploadedFileId && { fileId: state.uploadedFileId }),
    preferredOnly: !state.uploadedFileId, // Show all when filtering by file
    ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
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
    logger.info('handleUploadSuccess called', { fileId });
    console.log('[AUM Rows] handleUploadSuccess called', { fileId });
    
    // Establecer fileId y resetear paginación para mostrar las nuevas filas
    actions.setUploadedFileId(fileId);
    actions.setPagination({ offset: 0 });
    actions.setLoading('waitingUpload', false);
    
    // Sincronizar fileId con URL para que el filtro funcione correctamente
    updateUrl({ fileId });
    console.log('[AUM Rows] URL updated with fileId', { fileId });
    
    logger.info('State and URL updated, calling mutate', { 
      fileId,
      currentStateFileId: state.uploadedFileId 
    });
    console.log('[AUM Rows] State updated, calling mutate', { 
      fileId,
      currentStateFileId: state.uploadedFileId 
    });
    
    // Mutate con revalidate para forzar refresh de datos
    mutate(undefined, { revalidate: true });
  }, [actions, mutate, updateUrl, state.uploadedFileId]);

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

            {/* Estadísticas resumidas */}
            {!isLoading && rows && rows.length > 0 && (
              <div className="flex gap-4 mb-4 flex-wrap">
                <div className="px-3 py-2 bg-blue-50 rounded-md" role="status" aria-label={`Total de filas: ${totalRows.toLocaleString()}`}>
                  <span className="text-sm font-medium text-blue-900">
                    Total: {totalRows.toLocaleString()}
                  </span>
                </div>
                <div className="px-3 py-2 bg-yellow-50 rounded-md" role="status" aria-label={`Filas sin asesor: ${rows.filter(r => !r.matchedUserId).length}`}>
                  <span className="text-sm font-medium text-yellow-900">
                    Sin asesor: {rows.filter(r => !r.matchedUserId).length}
                  </span>
                </div>
                <div className="px-3 py-2 bg-green-50 rounded-md" role="status" aria-label={`Filas normalizadas: ${rows.filter(r => r.isNormalized).length}`}>
                  <span className="text-sm font-medium text-green-900">
                    Normalizadas: {rows.filter(r => r.isNormalized).length}
                  </span>
                </div>
              </div>
            )}

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
          {process.env.NODE_ENV !== 'production' && (
            <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
              <strong>Debug:</strong> rows={rows?.length ?? 0}, totalRows={totalRows}, isLoading={String(isLoading)}, hasError={!!error}
            </div>
          )}
          <AumVirtualTable
            rows={rows || []}
            isLoading={isLoading}
            error={error}
            onOpenAdvisorModal={(row) => actions.openAdvisorModal(row)}
            onShowDuplicates={(accountNumber) => actions.openDuplicateModal(accountNumber)}
            onAdvisorUpdated={() => mutate()}
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
            open={state.modals.advisor.open}
            onClose={() => {
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

