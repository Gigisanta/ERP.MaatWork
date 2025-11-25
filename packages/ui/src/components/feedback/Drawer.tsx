"use client";
import React, { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: 'left' | 'right';
  titleId?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Drawer({
  open,
  onOpenChange,
  side = 'left',
  titleId,
  className,
  children,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Basic focus management: focus panel when opens
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'absolute top-0 h-full w-72 bg-surface border-border border shadow-lg outline-none',
          'transition-transform duration-300 ease-out',
          side === 'left' ? 'left-0' : 'right-0',
          open
            ? 'translate-x-0'
            : side === 'left'
            ? '-translate-x-full'
            : 'translate-x-full',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}


