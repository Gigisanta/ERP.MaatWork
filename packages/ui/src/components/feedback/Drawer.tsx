'use client';
import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '../../utils/cn.js';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: 'left' | 'right' | 'bottom';
  titleId?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Drawer component with improved mobile UX
 *
 * AI_DECISION: Enhanced drawer for better mobile experience
 * Justificación: Better touch targets, safe area support, and smoother animations
 * Impacto: Works well on all devices including those with notches
 */
export function Drawer({
  open,
  onOpenChange,
  side = 'left',
  titleId,
  className,
  children,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  // Focus management
  useEffect(() => {
    if (open) {
      // Small delay to ensure panel is rendered
      const timeout = setTimeout(() => {
        panelRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  // Handle swipe to close (touch devices)
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    let startX = 0;
    let currentX = 0;
    const threshold = 100; // Minimum swipe distance to close

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      currentX = startX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      currentX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const deltaX = currentX - startX;
      // Close if swiped left (for left drawer) or right (for right drawer)
      if (side === 'left' && deltaX < -threshold) {
        handleClose();
      } else if (side === 'right' && deltaX > threshold) {
        handleClose();
      } else if (side === 'bottom') {
        const deltaY = e.changedTouches[0].clientY - startY; // Use clientY for bottom
        if (deltaY > threshold) handleClose();
      }
      startX = 0;
      currentX = 0;
    };

    // Track Y for bottom sheet
    let startY = 0;
    const handleTouchStartY = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      handleTouchStart(e);
    };

    if (side === 'bottom') {
      panel.addEventListener('touchstart', handleTouchStartY, { passive: true });
    } else {
      panel.addEventListener('touchstart', handleTouchStart, { passive: true });
    }
    panel.addEventListener('touchmove', handleTouchMove, { passive: true });
    panel.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      if (side === 'bottom') {
        panel.removeEventListener('touchstart', handleTouchStartY);
      } else {
        panel.removeEventListener('touchstart', handleTouchStart);
      }
      panel.removeEventListener('touchmove', handleTouchMove);
      panel.removeEventListener('touchend', handleTouchEnd);
    };
  }, [open, side, handleClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      {/* Backdrop with blur effect */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm',
          'transition-opacity duration-300 ease-out',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleClose}
        aria-label="Cerrar menú"
      />

      {/* Panel with safe area support */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'absolute top-0 h-full bg-surface shadow-2xl outline-none',
          // Smooth spring-like animation
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          // Position
          side === 'left'
            ? 'left-0 rounded-r-2xl'
            : side === 'right'
              ? 'right-0 rounded-l-2xl'
              : 'bottom-0 left-0 right-0 rounded-t-2xl w-full h-[90vh] lg:h-auto',
          // Transform
          open
            ? side === 'bottom'
              ? 'translate-y-0'
              : 'translate-x-0'
            : side === 'left'
              ? '-translate-x-full'
              : side === 'right'
                ? 'translate-x-full'
                : 'translate-y-full',
          // Responsive width - adapts to screen size (only for side drawer)
          side !== 'bottom' && 'w-[min(85vw,320px)]',
          // Safe area insets for notched devices
          side === 'left'
            ? 'pl-[env(safe-area-inset-left,0px)]'
            : 'pr-[env(safe-area-inset-right,0px)]',
          'pt-[env(safe-area-inset-top,0px)]',
          'pb-[env(safe-area-inset-bottom,0px)]',
          className
        )}
      >
        {/* Visual indicator for swipe to close */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-border opacity-50',
            side === 'left'
              ? 'right-1.5 top-1/2 -translate-y-1/2 w-1 h-12'
              : side === 'right'
                ? 'left-1.5 top-1/2 -translate-y-1/2 w-1 h-12'
                : 'top-3 left-1/2 -translate-x-1/2 w-12 h-1' // Indicator on top for bottom sheet
          )}
        />

        {children}
      </div>
    </div>
  );
}
