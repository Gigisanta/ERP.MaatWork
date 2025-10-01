import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Keyboard, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
// import { LayoutConfig } from '../styles/cactus-colors';

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
  category: string;
}

interface KeyboardShortcutsProps {
  className?: string;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ className }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const shortcuts: Shortcut[] = [
    // Navigation shortcuts
    {
      key: 'Alt+D',
      description: 'Ir al Dashboard',
      action: () => navigate('/dashboard'),
      category: 'Navegación'
    },
    {
      key: 'Alt+C',
      description: 'Ir al CRM',
      action: () => navigate('/crm'),
      category: 'Navegación'
    },
    {
      key: 'Alt+T',
      description: 'Ir a Mi Equipo',
      action: () => navigate('/team'),
      category: 'Navegación'
    },
    {
      key: 'Alt+P',
      description: 'Ir al Perfil',
      action: () => navigate('/profile'),
      category: 'Navegación'
    },
    // Manager shortcuts (if user is manager)
    ...(user?.role === 'manager' ? [
      {
        key: 'Alt+M',
        description: 'Panel de Manager',
        action: () => navigate('/manager'),
        category: 'Manager'
      },
      {
        key: 'Alt+A',
        description: 'Aprobaciones',
        action: () => navigate('/manager/approvals'),
        category: 'Manager'
      }
    ] : []),
    // Admin shortcuts (if user is admin)
    ...(user?.role === 'admin' ? [
      {
        key: 'Alt+Shift+A',
        description: 'Panel de Admin',
        action: () => navigate('/admin'),
        category: 'Administración'
      }
    ] : []),
    // General shortcuts
    {
      key: 'Ctrl+/',
      description: 'Mostrar/Ocultar ayuda de atajos',
      action: () => setIsHelpOpen(!isHelpOpen),
      category: 'General'
    },
    {
      key: 'Alt+L',
      description: 'Cerrar sesión',
      action: logout,
      category: 'General'
    },
    {
      key: 'Escape',
      description: 'Cerrar modales/diálogos',
      action: () => setIsHelpOpen(false),
      category: 'General'
    }
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for shortcuts
      shortcuts.forEach(shortcut => {
        const keys = shortcut.key.toLowerCase().split('+');
        const isCtrl = keys.includes('ctrl') && event.ctrlKey;
        const isAlt = keys.includes('alt') && event.altKey;
        const isShift = keys.includes('shift') && event.shiftKey;
        const mainKey = keys[keys.length - 1];
        
        const keyMatches = event.key.toLowerCase() === mainKey || 
                          event.code.toLowerCase() === mainKey ||
                          (mainKey === '/' && event.key === '/');
        
        // Special handling for Escape key
        if (shortcut.key === 'Escape' && event.key === 'Escape') {
          event.preventDefault();
          shortcut.action();
          return;
        }
        
        // Check if all modifiers and key match
        const ctrlMatch = keys.includes('ctrl') ? isCtrl : !event.ctrlKey;
        const altMatch = keys.includes('alt') ? isAlt : !event.altKey;
        const shiftMatch = keys.includes('shift') ? isShift : !event.shiftKey;
        
        if (keyMatches && ctrlMatch && altMatch && shiftMatch) {
          event.preventDefault();
          shortcut.action();
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, isHelpOpen]);

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <>
      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center space-x-2">
                <Keyboard className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Atajos de Teclado</h2>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                <div key={category}>
                  <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-3">{category}</h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                        <span className="text-neutral-900 dark:text-neutral-100">{shortcut.description}</span>
                        <kbd className="px-2 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded text-sm font-mono text-neutral-600 dark:text-neutral-400 shadow-sm">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Presiona <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-xs">Ctrl+/</kbd> en cualquier momento para mostrar/ocultar esta ayuda.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating help button */}
      <button
        onClick={() => setIsHelpOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 bg-cactus-600 hover:bg-cactus-700',
          'text-white p-3 rounded-full shadow-lg transition-all duration-200',
          'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cactus-500 focus:ring-offset-2',
          'z-40',
          className
        )}
        title="Atajos de teclado (Ctrl+/)"
      >
        <Keyboard className="w-5 h-5" />
      </button>
    </>
  );
};

export default KeyboardShortcuts;

// Hook to register custom shortcuts
export const useKeyboardShortcut = (
  key: string,
  callback: () => void,
  dependencies: React.DependencyList = []
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const keys = key.toLowerCase().split('+');
      const isCtrl = keys.includes('ctrl') && event.ctrlKey;
      const isAlt = keys.includes('alt') && event.altKey;
      const isShift = keys.includes('shift') && event.shiftKey;
      const mainKey = keys[keys.length - 1];
      
      const keyMatches = event.key.toLowerCase() === mainKey || 
                        event.code.toLowerCase() === mainKey;
      
      const ctrlMatch = keys.includes('ctrl') ? isCtrl : !event.ctrlKey;
      const altMatch = keys.includes('alt') ? isAlt : !event.altKey;
      const shiftMatch = keys.includes('shift') ? isShift : !event.shiftKey;
      
      if (keyMatches && ctrlMatch && altMatch && shiftMatch) {
        event.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, dependencies);
};

// Component to show keyboard shortcut hints
export const ShortcutHint: React.FC<{
  shortcut: string;
  description: string;
  className?: string;
}> = ({ shortcut, description, className }) => {
  return (
    <div className={cn('flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400', className)}>
      <span>{description}</span>
      <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-xs font-mono">
        {shortcut}
      </kbd>
    </div>
  );
};