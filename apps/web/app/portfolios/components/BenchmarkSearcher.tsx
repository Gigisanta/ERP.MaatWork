'use client';

import { useState, useCallback, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input, Text, Stack, Spinner } from '@cactus/ui';
import { searchInstruments } from '@/lib/api';
import type { InstrumentSearchResult } from '@/types';

interface BenchmarkSearcherProps {
  onBenchmarkSelect: (symbol: string) => void;
  selectedSymbol?: string | null;
  placeholder?: string;
}

export function BenchmarkSearcher({
  onBenchmarkSelect,
  selectedSymbol,
  placeholder = 'Buscar índice (ej: ^MERV, ^GSPC, SPY)',
}: BenchmarkSearcherProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InstrumentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setLoading(true);

      try {
        const response = await searchInstruments(searchQuery);

        if (response.success && response.data) {
          // Filtrar resultados que parezcan índices (empiezan con ^ o son ETFs comunes)
          const indexResults = response.data.filter(
            (item) =>
              item.symbol.startsWith('^') ||
              item.symbol.toUpperCase().includes('INDEX') ||
              item.type === 'INDEX' ||
              item.name?.toUpperCase().includes('INDEX')
          );
          setSearchResults(indexResults.slice(0, 5)); // Limitar a 5 resultados
          setShowResults(true);
        } else {
          setSearchResults([]);
          setShowResults(false);
        }
      } catch (err) {
        console.error('Error searching benchmarks:', err);
        setSearchResults([]);
        setShowResults(false);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      debounceTimeout.current = setTimeout(() => {
        search(value);
      }, 300);
    },
    [search]
  );

  const handleSelect = useCallback(
    (result: InstrumentSearchResult) => {
      onBenchmarkSelect(result.symbol);
      setQuery(result.symbol);
      setShowResults(false);
      inputRef.current?.blur();
    },
    [onBenchmarkSelect]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setShowResults(false);
    onBenchmarkSelect('');
  }, [onBenchmarkSelect]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          value={query || selectedSymbol || ''}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
          onBlur={() => {
            // Delay para permitir click en resultados
            setTimeout(() => setShowResults(false), 200);
          }}
          placeholder={placeholder}
          className="pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Spinner size="sm" />}
          {!loading && query && (
            <button
              type="button"
              onClick={handleClear}
              className="text-foreground-tertiary hover:text-foreground-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {!loading && !query && (
            <Search className="w-4 h-4 text-foreground-tertiary" />
          )}
        </div>
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {searchResults.map((result) => (
            <button
              key={result.symbol}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full px-3 py-2 text-left hover:bg-surface-hover transition-colors border-b border-border last:border-b-0"
            >
              <Stack direction="column" gap="xs">
                <div className="flex items-center justify-between">
                  <Text weight="semibold" size="sm">
                    {result.symbol}
                  </Text>
                  {result.currency && (
                    <Text size="xs" color="secondary">
                      {result.currency}
                    </Text>
                  )}
                </div>
                {result.name && (
                  <Text size="xs" color="secondary" className="truncate">
                    {result.name}
                  </Text>
                )}
              </Stack>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

