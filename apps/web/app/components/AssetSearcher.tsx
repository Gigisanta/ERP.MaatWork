'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Search, Plus } from 'lucide-react';
import {
  Input,
  Button,
  Text,
  Stack,
  Alert,
  Spinner,
  Card,
  CardContent,
} from '@cactus/ui';
import { useAuth } from '../auth/AuthContext';
import { logger } from '@/lib/logger';
import type { InstrumentSearchResult, Currency, AssetType } from '@/types';

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

const AssetSearcher: React.FC<AssetSearcherProps> = ({ onAssetSelect, placeholder = "Buscar por símbolo o nombre (ej: AAPL, Apple)" }) => {
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
        return;
      }
      
      if (!user) {
        setError('Debes iniciar sesión para buscar activos');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const { searchInstruments } = await import('@/lib/api');
        const response = await searchInstruments(searchQuery);

        if (response.success && response.data) {
          setSearchResults(response.data);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        logger.error('Error searching instruments', { err, query: searchQuery });
        setError('Error al buscar activos. Intenta nuevamente.');
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
      symbol: asset.symbol,
      name: asset.name || asset.shortName || asset.symbol,
      shortName: asset.shortName || asset.name || asset.symbol,
      exchange: asset.exchange || 'Unknown',
      currency: (asset.currency || 'USD') as Currency,
      type: (asset.type || 'EQUITY') as AssetType,
      ...(asset.sector && { sector: asset.sector }),
      ...(asset.industry && { industry: asset.industry }),
      success: true
    };
    
    onAssetSelect(instrument);
    setQuery('');
    setSearchResults([]);
  };

  const handleDirectSymbol = async () => {
    if (query.trim() && user) {
      const symbol = query.trim().toUpperCase();
      
      // Validar símbolo directamente
      try {
        setLoading(true);
        const { validateSymbol } = await import('@/lib/api');
        const response = await validateSymbol(symbol);
        
        if (response.success && response.data?.valid) {
          const instrument: InstrumentSearchResult = {
            symbol: response.data.symbol || symbol,
            name: response.data.name || symbol,
            shortName: response.data.name || symbol,
            exchange: response.data.exchange || 'Unknown',
            currency: (response.data.currency || 'USD') as Currency,
            type: (response.data.type || 'EQUITY') as AssetType,
            success: true
          };
          
          onAssetSelect(instrument);
          setQuery('');
          setSearchResults([]);
          return;
        }
      } catch (err) {
        logger.error('Error validating symbol', { err, symbol });
      } finally {
        setLoading(false);
      }
      
      // Si la validación falla, usar símbolo directo
      const instrument: InstrumentSearchResult = {
        symbol: symbol,
        name: symbol,
        shortName: symbol,
        exchange: 'UNKNOWN',
        currency: 'USD' as Currency,
        type: 'EQUITY' as AssetType,
        success: false
      };
      
      onAssetSelect(instrument);
      setQuery('');
      setSearchResults([]);
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
            <Text size="sm" color="secondary">Buscando activos...</Text>
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
                    <Text size="sm" color="secondary">{asset.name || asset.shortName || asset.symbol}</Text>
                    {asset.sector && (
                      <Text size="xs" color="muted">{asset.sector} • {asset.industry || ''}</Text>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-accent-text hover:bg-accent-subtle">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        
        {!loading && query.length >= 2 && searchResults.length === 0 && (
          <Alert variant="warning">
            <Text size="sm">
              No se encontraron resultados para &quot;{query}&quot;. 
              Puedes usar el símbolo directo o probar con términos más generales.
            </Text>
          </Alert>
        )}
        
        {query.length > 0 && query.length < 2 && (
          <Alert variant="info">
            <Text size="sm">
              Escribe al menos 2 caracteres para buscar activos.
            </Text>
          </Alert>
        )}
      </Stack>
    </div>
  );
};

export default AssetSearcher;