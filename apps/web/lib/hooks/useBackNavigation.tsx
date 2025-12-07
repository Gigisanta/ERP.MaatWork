'use client';

/**
 * useBackNavigation Hook
 * 
 * AI_DECISION: Hook para navegación "volver" con contexto
 * Justificación: Proporciona botón volver inteligente que recuerda de dónde vino el usuario
 * Impacto: Mejor UX, navegación más intuitiva
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button, Icon } from '@cactus/ui';

export interface UseBackNavigationOptions {
  /** Default path to navigate to if no history is available */
  fallbackPath?: string;
  /** Whether to check referrer for same-origin navigation */
  checkReferrer?: boolean;
  /** Paths that should be considered as "home" and trigger fallback behavior */
  homePaths?: string[];
}

export interface UseBackNavigationReturn {
  /** Navigate back (uses history.back if available, otherwise fallback) */
  goBack: () => void;
  /** Whether there's a valid back history entry */
  canGoBack: boolean;
  /** The path that back will navigate to (if known) */
  backPath: string | null;
  /** Component to render a back button */
  BackButton: (props: BackButtonProps) => React.ReactElement;
}

export interface BackButtonProps {
  /** Custom label for the button */
  label?: string;
  /** Additional className */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Hook for contextual back navigation
 * 
 * @example
 * ```tsx
 * function ContactDetailPage() {
 *   const { goBack, canGoBack, BackButton } = useBackNavigation({
 *     fallbackPath: '/contacts'
 *   });
 *   
 *   return (
 *     <div>
 *       <BackButton label="Volver a Contactos" />
 *       ...
 *     </div>
 *   );
 * }
 * ```
 */
export function useBackNavigation(options: UseBackNavigationOptions = {}): UseBackNavigationReturn {
  // AI_DECISION: Explicit return type annotation to help TypeScript understand control flow
  // Justificación: TypeScript sometimes has trouble inferring return types in complex hooks
  // Impacto: Ensures type safety and helps compiler understand all code paths return
  const {
    fallbackPath = '/',
    checkReferrer = true,
    homePaths = ['/', '/home', '/login'],
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const historyLengthRef = useRef<number>(0);

  // Track navigation history on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      historyLengthRef.current = window.history.length;
      
      // Try to get previous path from sessionStorage
      const storedPath = sessionStorage.getItem('previousPath');
      if (storedPath && storedPath !== pathname) {
        setPreviousPath(storedPath);
      } else {
        setPreviousPath(null);
      }

      // Store current path for next navigation
      sessionStorage.setItem('previousPath', pathname || '');
    }
  }, [pathname]);

  // Determine if we can go back
  const canGoBack = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    // Check if we have history entries
    if (window.history.length <= 1) return false;

    // Check if current path is a "home" path
    if (homePaths.includes(pathname || '')) return false;

    return true;
  }, [pathname, homePaths]);

  // Determine the back path (best effort)
  const backPath = useMemo(() => {
    // If we have a stored previous path, use it
    if (previousPath) {
      return previousPath;
    }

    // Try to extract from pathname (e.g., /contacts/123 -> /contacts)
    if (pathname) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 1) {
        return '/' + parts.slice(0, -1).join('/');
      }
    }

    return null;
  }, [pathname, previousPath]);

  // Navigate back
  const goBack = useCallback(() => {
    if (typeof window === 'undefined') {
      router.push(fallbackPath);
      return;
    }

    // Check if we have history to go back to
    if (window.history.length > 1 && canGoBack) {
      // Check referrer for same-origin
      if (checkReferrer && document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          const currentUrl = new URL(window.location.href);
          
          if (referrerUrl.origin === currentUrl.origin) {
            window.history.back();
            return;
          }
        } catch {
          // Invalid URL, fall through to fallback
        }
      } else if (!checkReferrer) {
        window.history.back();
        return;
      }
    }

    // Use previous path if available
    if (previousPath && previousPath !== pathname) {
      router.push(previousPath);
      return;
    }

    // Use inferred back path
    if (backPath) {
      router.push(backPath);
      return;
    }

    // Fallback to specified path
    router.push(fallbackPath);
  }, [router, fallbackPath, canGoBack, checkReferrer, backPath, pathname, previousPath]);

  // Back button component
  const BackButton = useCallback(
    ({ label = 'Volver', className = '', size = 'sm' }: BackButtonProps): React.ReactElement => {
      const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
        sm: 'text-sm px-3 py-1.5',
        md: 'text-base px-4 py-2',
        lg: 'text-lg px-5 py-2.5',
      };

      const iconSize = size === 'sm' ? 14 : size === 'md' ? 16 : 18;
      const buttonTitle = backPath ? `Volver a ${backPath}` : label;
      const combinedClassName = `${sizeClasses[size]} ${className}`.trim();

      return (
        <Button
          variant="ghost"
          onClick={goBack}
          className={combinedClassName}
          title={buttonTitle}
        >
          <Icon name="ChevronLeft" size={iconSize} className="mr-1" />
          {label}
        </Button>
      );
    },
    [goBack, backPath]
  );

  // Return hook values
  const result: UseBackNavigationReturn = {
    goBack,
    canGoBack,
    backPath,
    BackButton,
  };
  
  return result;
}

export default useBackNavigation;
