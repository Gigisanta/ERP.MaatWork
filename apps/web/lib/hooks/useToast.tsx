"use client";

/**
 * useToast Hook
 * 
 * AI_DECISION: Centralized toast notification system
 * Justificación: Provides consistent UX across the app, reduces code duplication
 * Impacto: Better maintainability, consistent user feedback
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, type ToastVariant } from '@cactus/ui';

interface ToastState {
  show: boolean;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextType {
  showToast: (title: string, description?: string, variant?: ToastVariant) => void;
  hideToast: () => void;
  toast: ToastState;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastState>({
    show: false,
    title: '',
    variant: 'info'
  });

  const showToast = useCallback((title: string, description?: string, variant: ToastVariant = 'info') => {
    const toastState: ToastState = {
      show: true,
      title,
      variant
    };
    if (description) {
      toastState.description = description;
    }
    setToast(toastState);
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toast }}>
      {children}
      {/* Toast component includes its own Provider internally */}
      <Toast
        open={toast.show}
        onOpenChange={(open) => {
          if (!open) {
            hideToast();
          }
        }}
        title={toast.title}
        {...(toast.description && { description: toast.description })}
        variant={toast.variant}
      />
    </ToastContext.Provider>
  );
}

