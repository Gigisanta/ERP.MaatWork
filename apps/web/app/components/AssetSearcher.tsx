'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input, Button, Text, Stack, Alert, Spinner, Card, CardContent } from '@cactus/ui';
import { useAuth } from '../auth/AuthContext';
import { logger, toLogContext } from '@/lib/logger';
import type {
  InstrumentSearchResult,
  Currency,
  AssetType,
  ApiError,
  ApiResponseWithHint,
} from '@/types';

interface AssetSearcherProps {
  onAssetSelect: (asset: InstrumentSearchResult) => void;
  placeholder?: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  shortName?: string;
  currency: string;
  exchange: string;
  type: string;
  sector?: string;
  industry?: string;
}

const AssetSearcher: React.FC<AssetSearcherProps> = ({
  onAssetSelect,
  placeholder = 'Buscar por símbolo o nombre (ej: AAPL, Apple)',
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setError(null);
        return;
      }

      if (!user) {
        setError('Debes iniciar sesión para buscar activos');
        setSearchResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { searchInstruments } = await import('@/lib/api/instruments');
        const response = await searchInstruments(searchQuery);

        if (response.success && response.data) {
          // Verificar si hay resultados
          if (Array.isArray(response.data) && response.data.length > 0) {
            // Convertir InstrumentSearchResult[] a SearchResult[]
            const convertedResults: SearchResult[] = response.data.map(
              (item: InstrumentSearchResult) => ({
                symbol: item.symbol,
                name: item.name || item.symbol,
                shortName: item.name,
                exchange: 'Unknown', // InstrumentSearchResult no tiene exchange
                currency: item.currency || 'USD',
                type: item.type || 'EQUITY',
              })
            );
            setSearchResults(convertedResults);
            setError(null);
          } else {
            // Sin resultados pero búsqueda exitosa
            setSearchResults([]);
            setError(null);
            // Guardar respuesta para mostrar hint si está disponible
            const responseWithHint = response as ApiResponseWithHint<InstrumentSearchResult[]>;
            if (responseWithHint.hint) {
              setError(responseWithHint.hint);
            }
          }
        } else {
          // Respuesta con error del backend
          const errorResponse = response as ApiResponseWithHint<InstrumentSearchResult[]>;
          const errorMsg = errorResponse.error || 'Error al buscar activos';
          const details = Array.isArray(errorResponse.details)
            ? errorResponse.details.join(', ')
            : errorResponse.details || '';

          // Detectar si es error de servicio no disponible (503)
          if (errorResponse.status === 503 || errorMsg.includes('temporarily unavailable')) {
            setError(
              'El servicio de búsqueda externa no está disponible. Se están usando resultados de la base de datos local.'
            );
            // Intentar buscar en BD como fallback (ya debería estar hecho en backend)
            setSearchResults([]);
          } else {
            setError(details || errorMsg);
            setSearchResults([]);
          }
        }
      } catch (err: unknown) {
        logger.error('Error searching instruments', toLogContext({ err, query: searchQuery }));

        // Detectar tipo de error específico
        const apiError = err as ApiError;
        const errorStatus = apiError.status || apiError.response?.status;
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorDetails = apiError.details
          ? Array.isArray(apiError.details)
            ? apiError.details.join(', ')
            : apiError.details
          : apiError.response?.data?.details
            ? Array.isArray(apiError.response.data.details)
              ? apiError.response.data.details.join(', ')
              : apiError.response.data.details
            : '';

        if (
          errorStatus === 503 ||
          errorMessage.includes('temporarily unavailable') ||
          errorMessage.includes('Service Unavailable')
        ) {
          setError(
            'El servicio de búsqueda externa no está disponible. Se están usando resultados de la base de datos local.'
          );
        } else if (
          errorStatus === 504 ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('Gateway Timeout')
        ) {
          setError(
            'La búsqueda está tardando demasiado. Intenta con un término más específico o usa el símbolo directo.'
          );
        } else if (
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError')
        ) {
          setError(
            'No se pudo conectar con el servicio de búsqueda. Verifica tu conexión o intenta más tarde.'
          );
        } else if (errorDetails) {
          setError(errorDetails);
        } else {
          setError('Error al buscar activos. Intenta nuevamente o usa el símbolo directo.');
        }
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Debounce: cancelar búsqueda anterior
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Nueva búsqueda después de 300ms
    debounceTimeout.current = setTimeout(() => {
      search(value);
    }, 300);
  };

  const handleSelectAsset = (asset: SearchResult) => {
    // Mapear resultado de API a formato esperado
    const instrument: InstrumentSearchResult = {
      id: asset.symbol, // Usar symbol como id temporal
      symbol: asset.symbol,
      name: asset.name || asset.shortName || asset.symbol,
      currency: (asset.currency || 'USD') as Currency,
      type: (asset.type || 'EQUITY') as AssetType,
    };

    onAssetSelect(instrument);
    setQuery('');
    setSearchResults([]);
  };

  const handleDirectSymbol = async () => {
    if (query.trim() && user) {
      const symbol = query.trim().toUpperCase();
      let validationFailed = false;
      let errorMessage = '';

      // Validar símbolo directamente
      try {
        setLoading(true);
        setError(null);
        const { validateSymbol } = await import('@/lib/api/instruments');
        const response = await validateSymbol(symbol);

        if (response.success && response.data?.isValid) {
          const instrument: InstrumentSearchResult = {
            symbol: symbol,
            name: symbol,
            id: symbol, // Usar symbol como id temporal
            currency: 'USD' as Currency,
            type: 'EQUITY' as AssetType,
          };

          onAssetSelect(instrument);
          setQuery('');
          setSearchResults([]);
          setError(null);
          setLoading(false);
          return;
        } else if (response.success && response.data && !response.data.isValid) {
          // Símbolo no válido según el servicio
          validationFailed = true;
          errorMessage = `El símbolo "${symbol}" no fue encontrado. Puedes agregarlo de todas formas, pero es posible que no haya datos disponibles.`;
        } else {
          validationFailed = true;
          errorMessage = `No se pudo validar el símbolo "${symbol}". Se agregará sin validar.`;
        }
      } catch (err: unknown) {
        logger.error('Error validating symbol', toLogContext({ err, symbol }));
        validationFailed = true;

        // Detectar tipo de error
        const apiError = err as ApiError;
        const errorStatus = apiError.status || apiError.response?.status;
        const errorMsg = err instanceof Error ? err.message : String(err);

        if (errorStatus === 503 || errorMsg.includes('temporarily unavailable')) {
          errorMessage = `El servicio de validación no está disponible. Se agregará "${symbol}" sin validar.`;
        } else if (errorStatus === 504 || errorMsg.includes('timeout')) {
          errorMessage = `La validación está tardando demasiado. Se agregará "${symbol}" sin validar.`;
        } else {
          errorMessage = `No se pudo validar el símbolo. Se agregará "${symbol}" sin validar.`;
        }
      } finally {
        setLoading(false);
      }

      // Si la validación falla o no está disponible, usar símbolo directo después de un breve delay
      if (validationFailed) {
        setError(errorMessage);
        setTimeout(() => {
          const instrument: InstrumentSearchResult = {
            id: symbol, // Usar symbol como id temporal
            symbol: symbol,
            name: symbol,
            currency: 'USD' as Currency,
            type: 'EQUITY' as AssetType,
          };

          onAssetSelect(instrument);
          setQuery('');
          setSearchResults([]);
        }, 1500);
      }
    }
  };

  return (
    <div className="w-full">
      <Stack direction="column" gap="sm">
        <div className="relative">
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            className="pl-10 pr-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-tertiary w-4 h-4" />
          {query.trim() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDirectSymbol}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-accent-text hover:text-accent-text"
              title="Agregar símbolo directo"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>

        {loading && (
          <Stack direction="row" gap="sm" align="center">
            <Spinner size="sm" />
            <Text size="sm" color="secondary">
              Buscando activos...
            </Text>
          </Stack>
        )}

        {error && (
          <Alert variant="error">
            <Text size="sm">{error}</Text>
          </Alert>
        )}

        {!loading && searchResults.length > 0 && (
          <Card className="max-h-60 overflow-y-auto">
            <CardContent className="p-0">
              {searchResults.map((asset) => (
                <div
                  key={asset.symbol}
                  className="flex items-center justify-between p-3 hover:bg-background-hover cursor-pointer border-b border-border-base last:border-b-0"
                  onClick={() => handleSelectAsset(asset)}
                >
                  <div className="flex-1">
                    <Stack direction="row" gap="sm" align="center">
                      <Text weight="semibold">{asset.symbol}</Text>
                      <span className="px-2 py-0.5 text-xs bg-background-surface text-foreground-secondary rounded">
                        {asset.exchange || 'Unknown'}
                      </span>
                      {asset.currency && (
                        <span className="px-2 py-0.5 text-xs bg-background-surface text-foreground-secondary rounded">
                          {asset.currency}
                        </span>
                      )}
                    </Stack>
                    <Text size="sm" color="secondary">
                      {asset.name || asset.shortName || asset.symbol}
                    </Text>
                    {asset.sector && (
                      <Text size="xs" color="muted">
                        {asset.sector} • {asset.industry || ''}
                      </Text>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-accent-text hover:bg-accent-subtle"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!loading && !error && query.length >= 2 && searchResults.length === 0 && (
          <Alert variant="warning">
            <Text size="sm">No se encontraron resultados para &quot;{query}&quot;.</Text>
            <Text size="xs" color="muted" className="mt-1">
              Puedes usar el símbolo directo (botón +) o probar con términos más generales.
            </Text>
          </Alert>
        )}

        {error && !loading && query.length >= 2 && (
          <Alert variant="info">
            <Text size="sm">{error}</Text>
          </Alert>
        )}

        {query.length > 0 && query.length < 2 && (
          <Alert variant="info">
            <Text size="sm">Escribe al menos 2 caracteres para buscar activos.</Text>
          </Alert>
        )}
      </Stack>
    </div>
  );
};

export default AssetSearcher;
