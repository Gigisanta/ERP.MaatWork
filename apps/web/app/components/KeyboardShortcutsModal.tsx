'use client';

/**
 * KeyboardShortcutsModal Component
 *
 * AI_DECISION: Modal centralizado para mostrar atajos de teclado disponibles
 * Justificación: Mejora la accesibilidad y productividad de usuarios avanzados
 * Impacto: UX mejorada, usuarios pueden descubrir y usar atajos fácilmente
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Modal, ModalHeader, ModalTitle, ModalContent, Text, Icon } from '@maatwork/ui';

interface KeyboardShortcut {
  /** Keys to press (e.g., ['Cmd', 'K']) */
  keys: string[];
  /** Description of what the shortcut does */
  description: string;
  /** Category for grouping */
  category: 'navigation' | 'actions' | 'general';
  /** Whether this shortcut is available on the current page */
  available?: boolean;
}

interface KeyboardShortcutsModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal state changes */
  onOpenChange: (open: boolean) => void;
  /** Additional shortcuts specific to the current page */
  pageShortcuts?: KeyboardShortcut[];
}

// Global keyboard shortcuts available everywhere
const globalShortcuts: KeyboardShortcut[] = [
  {
    keys: ['Cmd/Ctrl', '?'],
    description: 'Mostrar este panel de atajos',
    category: 'general',
  },
  {
    keys: ['Cmd/Ctrl', 'K'],
    description: 'Búsqueda rápida',
    category: 'navigation',
  },
  {
    keys: ['Esc'],
    description: 'Cerrar modales y paneles',
    category: 'general',
  },
  {
    keys: ['Cmd/Ctrl', '/'],
    description: 'Enfocar campo de búsqueda',
    category: 'navigation',
  },
];

// Contact page specific shortcuts
const contactShortcuts: KeyboardShortcut[] = [
  {
    keys: ['N'],
    description: 'Nuevo contacto',
    category: 'actions',
  },
  {
    keys: ['Tab'],
    description: 'Navegar entre campos',
    category: 'navigation',
  },
  {
    keys: ['Enter'],
    description: 'Abrir contacto seleccionado',
    category: 'actions',
  },
];

// Categorías de atajos
const categories = {
  general: {
    title: 'General',
    icon: 'Settings' as const,
  },
  navigation: {
    title: 'Navegación',
    icon: 'Navigation' as const,
  },
  actions: {
    title: 'Acciones',
    icon: 'Zap' as const,
  },
};

/**
 * Single keyboard shortcut key badge
 */
function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded shadow-sm">
      {children}
    </kbd>
  );
}

/**
 * Shortcut row component
 */
function ShortcutRow({ shortcut }: { shortcut: KeyboardShortcut }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 transition-colors">
      <Text size="sm" className="text-text-secondary">
        {shortcut.description}
      </Text>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <React.Fragment key={key}>
            <KeyBadge>{key}</KeyBadge>
            {index < shortcut.keys.length - 1 && <span className="text-gray-400 text-xs">+</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * Shortcut category section
 */
function ShortcutSection({
  category,
  shortcuts,
}: {
  category: keyof typeof categories;
  shortcuts: KeyboardShortcut[];
}) {
  const config = categories[category];
  const filteredShortcuts = shortcuts.filter((s) => s.category === category);

  if (filteredShortcuts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3">
        <Icon name={config.icon} size={14} className="text-gray-400" />
        <Text size="xs" weight="medium" className="text-gray-500 uppercase tracking-wider">
          {config.title}
        </Text>
      </div>
      <div className="space-y-1">
        {filteredShortcuts.map((shortcut, index) => (
          <ShortcutRow key={index} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

/**
 * Main KeyboardShortcutsModal component
 */
export default function KeyboardShortcutsModal({
  open,
  onOpenChange,
  pageShortcuts = [],
}: KeyboardShortcutsModalProps) {
  const allShortcuts = [...globalShortcuts, ...pageShortcuts];

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalHeader>
        <ModalTitle className="flex items-center gap-2">
          <Icon name="command" size={18} className="text-primary" />
          Atajos de Teclado
        </ModalTitle>
      </ModalHeader>
      <ModalContent className="max-h-[60vh] overflow-y-auto">
        <div className="space-y-6">
          {/* Tips */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <Icon name="info" size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <Text size="xs" className="text-blue-700">
              <strong>Tip:</strong> Usa <KeyBadge>Cmd</KeyBadge> en Mac o <KeyBadge>Ctrl</KeyBadge>{' '}
              en Windows/Linux. Presiona <KeyBadge>?</KeyBadge> en cualquier momento para ver este
              panel.
            </Text>
          </div>

          {/* Shortcut sections */}
          <ShortcutSection category="general" shortcuts={allShortcuts} />
          <ShortcutSection category="navigation" shortcuts={allShortcuts} />
          <ShortcutSection category="actions" shortcuts={allShortcuts} />
        </div>
      </ModalContent>
    </Modal>
  );
}

/**
 * Hook to manage keyboard shortcuts modal
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isOpen, open, close } = useKeyboardShortcutsModal();
 *
 *   return (
 *     <>
 *       <KeyboardShortcutsModal open={isOpen} onOpenChange={close} />
 *       <button onClick={open}>Show shortcuts</button>
 *     </>
 *   );
 * }
 * ```
 */
function useKeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Listen for Cmd/Ctrl + ? to open the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd/Ctrl + ?
      const isModifier = event.metaKey || event.ctrlKey;
      const isQuestionMark = event.key === '?' || (event.shiftKey && event.key === '/');

      if (isModifier && isQuestionMark) {
        event.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return {
    isOpen,
    open,
    close: () => setIsOpen(false),
    toggle,
  };
}

/**
 * Provider component that adds global keyboard shortcut modal
 */
function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useKeyboardShortcutsModal();

  return (
    <>
      {children}
      <KeyboardShortcutsModal open={isOpen} onOpenChange={close} />
    </>
  );
}
