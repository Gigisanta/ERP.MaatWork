/**
 * Hook para manejar datos del portfolio
 *
 * Extrae lógica de fetch y estado del portfolio
 */

import useSWR from 'swr';
import { getPortfolioById } from '@/lib/api';
import type { PortfolioWithLines } from '@/types';

export function usePortfolioData(portfolioId: string | null, enabled: boolean = true) {
  const { data, error, isLoading, mutate } = useSWR<PortfolioWithLines>(
    portfolioId && enabled ? ['portfolio', portfolioId] : null,
    async () => {
      if (!portfolioId) throw new Error('No portfolio ID');
      const response = await getPortfolioById(portfolioId);
      if (!response.success) {
        throw new Error(response.error || 'Error al cargar la cartera');
      }
      return response.data!;
    },
    {
      revalidateOnFocus: false, // Prevent too many re-fetches
      shouldRetryOnError: false,
    }
  );

  return {
    portfolio: data || null,
    loading: isLoading,
    error: error instanceof Error ? error.message : (error as string | null),
    refetch: mutate,
  };
}
