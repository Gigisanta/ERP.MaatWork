'use client';

/**
 * GlobalKeyboardShortcuts Component
 * 
 * AI_DECISION: Componente cliente para manejar atajos de teclado globales
 * Justificación: Necesitamos un Client Component para usar hooks y eventos de teclado
 * Impacto: Modal de atajos disponible en toda la app con Cmd/Ctrl + ?
 */

import React, { useEffect, useState, useCallback } from 'react';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

export default function GlobalKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check for Cmd/Ctrl + ?
    const isModifier = event.metaKey || event.ctrlKey;
    const isQuestionMark = event.key === '?' || (event.shiftKey && event.key === '/');

    if (isModifier && isQuestionMark) {
      event.preventDefault();
      setIsOpen(prev => !prev);
    }

    // Also close on Escape when modal is open
    if (event.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <KeyboardShortcutsModal 
      open={isOpen} 
      onOpenChange={setIsOpen} 
    />
  );
}
