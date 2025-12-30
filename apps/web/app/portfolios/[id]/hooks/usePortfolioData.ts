/**
 * Hook para manejar datos del portfolio
 *
 * Extrae lógica de fetch y estado del portfolio
 */

import { useState, useEffect } from 'react';
import { getPortfolioById } from '@/lib/api';
import { logger, toLogContext } from '@/lib/logger';
import type { PortfolioWithLines } from '@/types';

export function usePortfolioData(templateId: string | null, enabled: boolean = true) {
  const [portfolio, setPortfolio] = useState<PortfolioWithLines | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = async () => {
    if (!templateId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await getPortfolioById(templateId);

      if (response.success && response.data) {
        setPortfolio(response.data);
      } else {
        const errorMessage = response.error || 'Error al cargar la cartera';
        if (errorMessage.includes('404') || errorMessage.includes('no encontrada')) {
          setError('Cartera no encontrada');
        } else {
          setError(errorMessage);
        }
      }
    } catch (err) {
      logger.error('Error fetching portfolio', toLogContext({ err, templateId }));
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          setError('Error de conexión. Por favor verifica tu conexión a internet.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Error desconocido al cargar la cartera');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (templateId && enabled) {
      fetchPortfolio();
    }
  }, [templateId, enabled]);

  return {
    portfolio,
    loading,
    error,
    refetch: fetchPortfolio,
  };
}
