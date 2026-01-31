'use client';

import { useState } from 'react';
import {
  getPortfolios,
  getPortfolioLinesBatch,
  createPortfolio as createPortfolioApi,
  updatePortfolio as updatePortfolioApi,
  deletePortfolio as deletePortfolioApi,
  type GetPortfoliosParams,
  type PaginationMeta,
} from '@/lib/api';
import type {
  Portfolio,
  PortfolioLine,
  CreatePortfolioRequest,
  UpdatePortfolioRequest
} from '@/types';
import { useEntityWithComponents } from './useEntityWithComponents';

export function usePortfolios(params?: GetPortfoliosParams) {
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const refreshKey = params ? JSON.stringify(params) : 'default';

  const {
    entities: portfolios,
    isLoading,
    error,
    refetch,
    createEntity: createPortfolio,
    updateEntity: updatePortfolio,
    deleteEntity: deletePortfolio,
  } = useEntityWithComponents<
    Portfolio,
    PortfolioLine,
    CreatePortfolioRequest,
    UpdatePortfolioRequest
  >({
    fetchEntities: async () => {
      const response = await getPortfolios(params);
      if (response.success && response.data) {
        setPagination(response.data.pagination);
        return {
          success: true,
          data: response.data.data,
        };
      }
      return {
        success: false,
        error: response.error || 'Unknown error fetching portfolios',
      };
    },
    fetchComponentsBatch: getPortfolioLinesBatch,
    createEntity: createPortfolioApi,
    updateEntity: updatePortfolioApi,
    deleteEntity: deletePortfolioApi,
    getEntityId: (portfolio) => portfolio.id,
    entityName: 'portfolios',
    refreshKey,
  });

  return {
    portfolios,
    pagination,
    isLoading,
    error,
    refetch,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
  };
}
