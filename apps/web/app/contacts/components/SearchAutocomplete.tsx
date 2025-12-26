'use client';

/**
 * SearchAutocomplete Component
 *
 * AI_DECISION: Componente de búsqueda con historial y autocompletado
 * Justificación: Mejora la UX al recordar búsquedas anteriores
 * Impacto: Búsquedas más rápidas, menor esfuerzo del usuario
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Input, Icon, Text } from '@maatwork/ui';

const STORAGE_KEY = 'contacts_search_history';
const MAX_HISTORY_ITEMS = 10;

interface SearchAutocompleteProps {
  /** Controlled search value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Input placeholder */
  placeholder?: string;
  /** Input ref for keyboard shortcuts */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
  /** Optional list of suggestions from external source */
  suggestions?: string[];
}

/**
 * Get search history from localStorage
 */
function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const history = localStorage.getItem(STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

/**
 * Save search term to history
 */
function saveToHistory(term: string): void {
  if (typeof window === 'undefined' || !term.trim()) return;

  try {
    const history = getSearchHistory();
    // Remove duplicates and add new term at the beginning
    const newHistory = [
      term.trim(),
      ...history.filter((item) => item.toLowerCase() !== term.toLowerCase().trim()),
    ].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear search history
 */
function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export default function SearchAutocomplete({
  value,
  onChange,
  placeholder = 'Buscar...',
  inputRef,
  size = 'sm',
  className,
  suggestions = [],
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const localInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = inputRef || localInputRef;

  // Load history on mount
  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  // Combined suggestions: history + external suggestions
  const combinedSuggestions = useMemo(() => {
    const searchLower = value.toLowerCase();

    // Filter history items that match the current search
    const matchingHistory = value
      ? history.filter(
          (item) => item.toLowerCase().includes(searchLower) && item.toLowerCase() !== searchLower
        )
      : history;

    // Filter external suggestions
    const matchingSuggestions = suggestions.filter(
      (item) =>
        item.toLowerCase().includes(searchLower) &&
        item.toLowerCase() !== searchLower &&
        !history.some((h) => h.toLowerCase() === item.toLowerCase())
    );

    return [...matchingHistory, ...matchingSuggestions].slice(0, 8);
  }, [value, history, suggestions]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen || combinedSuggestions.length === 0) {
        if (event.key === 'ArrowDown' && combinedSuggestions.length > 0) {
          setIsOpen(true);
          event.preventDefault();
        }
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex((prev) => (prev < combinedSuggestions.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : combinedSuggestions.length - 1));
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < combinedSuggestions.length) {
            selectSuggestion(combinedSuggestions[highlightedIndex]);
          } else if (value.trim()) {
            // Save current search to history
            saveToHistory(value);
            setHistory(getSearchHistory());
            setIsOpen(false);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [isOpen, combinedSuggestions, highlightedIndex, value]
  );

  // Select a suggestion
  const selectSuggestion = useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      saveToHistory(suggestion);
      setHistory(getSearchHistory());
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  // Handle input focus
  const handleFocus = useCallback(() => {
    if (combinedSuggestions.length > 0) {
      setIsOpen(true);
    }
  }, [combinedSuggestions.length]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      setIsOpen(true);
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  // Handle clear history
  const handleClearHistory = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    clearHistory();
    setHistory([]);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <Input
        ref={activeInputRef}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        leftIcon="search"
        size={size}
        className="w-full"
        rightIcon={value ? 'x' : undefined}
        onRightIconClick={value ? () => onChange('') : undefined}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={isOpen ? 'search-suggestions' : undefined}
        aria-expanded={isOpen}
      />

      {/* Suggestions dropdown */}
      {isOpen && combinedSuggestions.length > 0 && (
        <div
          id="search-suggestions"
          className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden"
          role="listbox"
        >
          {/* History header */}
          {history.length > 0 && !value && (
            <div className="px-3 py-2 bg-surface-hover border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon name="Clock" size={12} className="text-text-muted" />
                <Text size="xs" className="text-text-secondary">
                  Búsquedas recientes
                </Text>
              </div>
              <button
                onClick={handleClearHistory}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Limpiar
              </button>
            </div>
          )}

          {/* Suggestion items */}
          <ul className="max-h-60 overflow-y-auto">
            {combinedSuggestions.map((suggestion, index) => {
              const isHistory = history.includes(suggestion);
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={suggestion}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`
                    px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors
                    ${isHighlighted ? 'bg-primary/10 text-primary' : 'hover:bg-surface-hover'}
                  `}
                  onClick={() => selectSuggestion(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <Icon
                    name={isHistory ? 'Clock' : 'search'}
                    size={14}
                    className={isHighlighted ? 'text-primary' : 'text-text-muted'}
                  />
                  <span className="text-sm flex-1 truncate">
                    {/* Highlight matching text */}
                    {value ? (
                      <>
                        {suggestion.split(new RegExp(`(${value})`, 'gi')).map((part, i) => (
                          <span
                            key={i}
                            className={
                              part.toLowerCase() === value.toLowerCase()
                                ? 'font-semibold text-primary'
                                : ''
                            }
                          >
                            {part}
                          </span>
                        ))}
                      </>
                    ) : (
                      suggestion
                    )}
                  </span>
                  {isHistory && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newHistory = history.filter((h) => h !== suggestion);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
                        setHistory(newHistory);
                      }}
                      className="text-text-muted hover:text-text-secondary p-0.5"
                      aria-label={`Eliminar "${suggestion}" del historial`}
                    >
                      <Icon name="x" size={12} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Keyboard hints */}
          <div className="px-3 py-1.5 bg-surface-hover border-t border-border flex items-center gap-3">
            <Text size="xs" className="text-text-muted">
              <kbd className="px-1 py-0.5 bg-surface border border-border rounded text-[10px]">
                ↑↓
              </kbd>{' '}
              navegar
            </Text>
            <Text size="xs" className="text-text-muted">
              <kbd className="px-1 py-0.5 bg-surface border border-border rounded text-[10px]">
                Enter
              </kbd>{' '}
              seleccionar
            </Text>
            <Text size="xs" className="text-text-muted">
              <kbd className="px-1 py-0.5 bg-surface border border-border rounded text-[10px]">
                Esc
              </kbd>{' '}
              cerrar
            </Text>
          </div>
        </div>
      )}
    </div>
  );
}
