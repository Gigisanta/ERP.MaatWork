'use client';

import React, { useState, useCallback } from 'react';
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
// import { useAuth } from '../../auth/AuthContext';

interface AssetSearcherProps {
  onAssetSelect: (asset: any) => void;
  placeholder?: string;
}

// Lista de activos comunes para demostración
const COMMON_ASSETS = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
  { symbol: '^GSPC', name: 'S&P 500', exchange: 'INDEX' },
  { symbol: '^MERV', name: 'MERVAL', exchange: 'INDEX' },
  { symbol: 'GGAL.BA', name: 'Grupo Financiero Galicia', exchange: 'BYMA' },
  { symbol: 'PAMP.BA', name: 'Pampa Energía', exchange: 'BYMA' },
  { symbol: 'ALUA.BA', name: 'Aluar Aluminio Argentino', exchange: 'BYMA' },
];

const AssetSearcher: React.FC<AssetSearcherProps> = ({ onAssetSelect, placeholder = "Buscar por símbolo o nombre (ej: AAPL, Apple)" }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // const { user } = useAuth();

  const search = useCallback(
    (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setLoading(true);
      
      // Simular búsqueda con delay
      setTimeout(() => {
        const filtered = COMMON_ASSETS.filter(asset => 
          asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        setSearchResults(filtered);
        setLoading(false);
      }, 300);
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    search(value);
  };

  const handleSelectAsset = (asset: any) => {
    // Crear objeto de instrumento simulado
    const instrument = {
      id: `temp-${Date.now()}`,
      symbol: asset.symbol,
      name: asset.name,
      exchange: asset.exchange,
      currency: asset.exchange === 'BYMA' ? 'ARS' : 'USD',
      assetClass: 'equity',
      isActive: true
    };
    
    onAssetSelect(instrument);
    setQuery('');
    setSearchResults([]);
  };

  const handleDirectSymbol = () => {
    if (query.trim()) {
      const instrument = {
        id: `temp-${Date.now()}`,
        symbol: query.trim().toUpperCase(),
        name: query.trim().toUpperCase(),
        exchange: 'UNKNOWN',
        currency: 'USD',
        assetClass: 'equity',
        isActive: true
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
                        {asset.exchange}
                      </span>
                    </Stack>
                    <Text size="sm" color="secondary">{asset.name}</Text>
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
              No se encontraron resultados para "{query}". 
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