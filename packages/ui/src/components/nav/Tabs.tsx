import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../utils/cn.js';

export interface TabItem {
  value: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
    'className' | 'children'
  > {
  items?: TabItem[];
  variant?: 'line' | 'pill' | 'enclosed';
  className?: string;
  children?: React.ReactNode;
}

export const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ items, variant = 'line', className, children, ...props }, ref) => {
    // If items are provided, use the items-based pattern
    if (items) {
      const tabClasses = {
        line: cn(
          'px-4 py-2 text-sm font-medium',
          'border-b-2 border-transparent',
          'text-text-secondary hover:text-text',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'data-[state=active]:border-primary data-[state=active]:text-primary',
          'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'
        ),
        pill: cn(
          'px-3 py-1.5 text-sm font-medium',
          'rounded-md transition-colors',
          'text-text-secondary hover:text-text',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-sm',
          'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'
        ),
        enclosed: cn(
          'px-4 py-2 text-sm font-medium',
          'border-b border-border last:border-b-0',
          'text-text-secondary hover:text-text',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'data-[state=active]:bg-surface data-[state=active]:text-primary',
          'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'
        ),
      };

      return (
        <TabsPrimitive.Root ref={ref} className={cn('w-full', className)} {...props}>
          <TabsPrimitive.List
            className={cn(
              'flex',
              variant === 'line' && 'border-b border-border',
              variant === 'pill' && 'bg-surface-hover p-1 rounded-lg',
              variant === 'enclosed' && 'border border-border rounded-lg overflow-hidden'
            )}
          >
            {items.map((item) => (
              <TabsPrimitive.Trigger
                key={item.value}
                value={item.value}
                disabled={item.disabled}
                className={tabClasses[variant]}
              >
                {item.label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>

          {items.map((item) => (
            <TabsPrimitive.Content
              key={item.value}
              value={item.value}
              className={cn(
                'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                variant === 'enclosed' && 'p-4 border-t border-border'
              )}
            >
              {item.content}
            </TabsPrimitive.Content>
          ))}
        </TabsPrimitive.Root>
      );
    }

    // If no items provided, render children directly (for individual component usage)
    return (
      <TabsPrimitive.Root ref={ref} className={cn('w-full', className)} {...props}>
        {children}
      </TabsPrimitive.Root>
    );
  }
);

Tabs.displayName = 'Tabs';

// Individual components for more flexible usage
export const TabsList = TabsPrimitive.List;
export const TabsTrigger = TabsPrimitive.Trigger;
export const TabsContent = TabsPrimitive.Content;
