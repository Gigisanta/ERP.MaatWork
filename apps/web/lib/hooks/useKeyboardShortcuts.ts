/**
 * useKeyboardShortcuts Hook
 *
 * AI_DECISION: Centralized keyboard shortcuts system
 * Justificación: Improves productivity for power users, consistent UX
 * Impacto: Faster navigation and interaction
 */

import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
  description?: string;
}

/**
 * Hook for managing keyboard shortcuts
 *
 * @param shortcuts - Array of keyboard shortcut configurations
 * @param enabled - Whether shortcuts are enabled (default: true)
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcuts) {
        const keyMatch =
          event.key === shortcut.key || event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch =
          shortcut.ctrlKey === undefined
            ? true
            : shortcut.ctrlKey
              ? event.ctrlKey || event.metaKey
              : !event.ctrlKey && !event.metaKey;
        const shiftMatch =
          shortcut.shiftKey === undefined ? true : shortcut.shiftKey === event.shiftKey;
        const altMatch = shortcut.altKey === undefined ? true : shortcut.altKey === event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          // Prevent default browser behavior
          if (shortcut.ctrlKey || shortcut.metaKey) {
            event.preventDefault();
          }
          shortcut.handler();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Hook for focusing search input with Ctrl+K
 *
 * @param searchInputRef - Ref to the search input element
 * @param enabled - Whether the shortcut is enabled (default: true)
 */
export function useSearchShortcut(
  searchInputRef: React.RefObject<HTMLInputElement>,
  enabled: boolean = true
) {
  useKeyboardShortcuts(
    [
      {
        key: 'k',
        ctrlKey: true,
        handler: () => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
          }
        },
        description: 'Focus search input',
      },
    ],
    enabled
  );
}

/**
 * Hook for closing modals with Escape key
 *
 * @param onClose - Function to call when Escape is pressed
 * @param enabled - Whether the shortcut is enabled (default: true)
 */
export function useEscapeShortcut(onClose: () => void, enabled: boolean = true) {
  useKeyboardShortcuts(
    [
      {
        key: 'Escape',
        handler: onClose,
        description: 'Close modal/dialog',
      },
    ],
    enabled
  );
}
