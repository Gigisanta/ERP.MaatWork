'use client';

import {
  getPortfolios,
  getPortfolioLinesBatch,
  createPortfolio as createPortfolioApi,
  updatePortfolio as updatePortfolioApi,
  deletePortfolio as deletePortfolioApi,
} from '@/lib/api';
import type { Portfolio, PortfolioLine } from '@/types';
import { useEntityWithComponents } from './useEntityWithComponents';

export function usePortfolios() {
  const { entities: portfolios, isLoading, error, refetch, createEntity: createPortfolio, updateEntity: updatePortfolio, deleteEntity: deletePortfolio } = useEntityWithComponents<Portfolio & { lines?: PortfolioLine[] }, PortfolioLine>({
    fetchEntities: getPortfolios,
    fetchComponentsBatch: getPortfolioLinesBatch,
    createEntity: createPortfolioApi,
    updateEntity: updatePortfolioApi,
    deleteEntity: deletePortfolioApi,
    getEntityId: (portfolio) => portfolio.id,
    entityName: 'portfolios',
  });

  return {
    portfolios: portfolios as Portfolio[],
    isLoading,
    error,
    refetch,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
  };
}
