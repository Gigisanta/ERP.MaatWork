import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../utils/cn.js';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
}

export const Tooltip = ({ content, children, side = 'top', delayDuration = 200 }: TooltipProps) => (
  <TooltipPrimitive.Provider delayDuration={delayDuration}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          className={cn(
            'z-50 px-3 py-1.5 text-sm rounded-md',
            'bg-foreground-inverse text-background-base',
            'shadow-lg animate-in fade-in-0 zoom-in-95',
            'data-[side=top]:animate-in data-[side=top]:fade-in-0 data-[side=top]:zoom-in-95',
            'data-[side=right]:animate-in data-[side=right]:fade-in-0 data-[side=right]:zoom-in-95',
            'data-[side=bottom]:animate-in data-[side=bottom]:fade-in-0 data-[side=bottom]:zoom-in-95',
            'data-[side=left]:animate-in data-[side=left]:fade-in-0 data-[side=left]:zoom-in-95'
          )}
          sideOffset={5}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-foreground-inverse" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);

Tooltip.displayName = 'Tooltip';
