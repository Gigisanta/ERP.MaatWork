'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import Button from './Button';
import Icon, { type IconName } from '../Icon';
import { Text } from '../../primitives/Text';
import { VisuallyHidden } from '../../primitives/VisuallyHidden';
import { Tooltip } from '../feedback/Tooltip';

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  label: string;
  href: string;
  icon?: IconName;
  badge?: string | number;
  children?: SidebarItem[];
}

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  sections: SidebarSection[];
  logo?: React.ReactNode;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  defaultCollapsed?: boolean;
  currentPath?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    'aria-current'?: 'page' | undefined;
    title?: string;
    children: React.ReactNode;
  }>;
  className?: string;
}

/**
 * Sidebar navigation component with brand styling.
 * Active items use Primary Purple background.
 * Focus rings use Primary Purple color.
 *
 * AI_DECISION: Improved responsive behavior and touch targets
 * Justificación: Better UX on mobile with larger touch targets and smoother scrolling
 * Impacto: Sidebar works well on all screen sizes with proper accessibility
 *
 * @example
 * ```tsx
 * <Sidebar
 *   sections={[
 *     {
 *       title: 'Main',
 *       items: [
 *         { label: 'Dashboard', href: '/', icon: 'home' },
 *         { label: 'Contacts', href: '/contacts', icon: 'users' },
 *       ]
 *     }
 *   ]}
 *   currentPath={pathname}
 * />
 * ```
 */
export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      sections,
      logo,
      collapsed: controlledCollapsed,
      onCollapse,
      defaultCollapsed = false,
      currentPath = '',
      isOpen,
      onOpenChange,
      LinkComponent,
      className,
      ...props
    },
    ref
  ) => {
    const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);

    const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

    const handleToggle = useCallback(() => {
      const newCollapsed = !collapsed;
      if (controlledCollapsed === undefined) {
        setInternalCollapsed(newCollapsed);
      }
      onCollapse?.(newCollapsed);
    }, [collapsed, controlledCollapsed, onCollapse]);

    const handleClose = useCallback(() => {
      onOpenChange?.(false);
    }, [onOpenChange]);

    // Persist collapsed state to localStorage
    useEffect(() => {
      if (controlledCollapsed === undefined && typeof window !== 'undefined') {
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved !== null) {
          setInternalCollapsed(JSON.parse(saved));
        }
      }
    }, [controlledCollapsed]);

    useEffect(() => {
      if (controlledCollapsed === undefined && typeof window !== 'undefined') {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
      }
    }, [collapsed, controlledCollapsed]);

    // Determine if we're in mobile/drawer mode
    const isMobileMode = onOpenChange !== undefined;

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex flex-col h-full bg-transparent',
          // Border only on desktop
          !isMobileMode && 'border-r border-border',
          'transition-all duration-300 ease-in-out',
          'overflow-x-hidden',
          // Width based on collapsed state (desktop) or full width (mobile)
          isMobileMode ? 'w-full' : collapsed ? 'w-16' : 'w-52',
          className
        )}
        data-open={isOpen === undefined ? undefined : isOpen}
        {...props}
      >
        {/* Mobile header with close button */}
        {isMobileMode && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚖️</span>
              <span className="text-lg font-bold text-secondary">Maat</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="min-w-[44px] min-h-[44px] p-0 hover:bg-error-subtle hover:text-error"
              aria-label="Cerrar menú"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden',
            // Better scrolling on mobile
            'overscroll-contain scroll-smooth',
            // Responsive padding
            isMobileMode ? 'py-4 px-3' : 'py-3 px-2',
            'space-y-3'
          )}
          role="navigation"
          aria-label="Navegación principal"
        >
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-1">
              {section.title && !collapsed && (
                <Text
                  size="xs"
                  weight="semibold"
                  className={cn(
                    'text-text-muted uppercase tracking-wider',
                    isMobileMode ? 'px-3 mb-2' : 'px-2 mb-1'
                  )}
                >
                  {section.title}
                </Text>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SidebarItemComponent
                    key={item.href}
                    item={item}
                    collapsed={collapsed && !isMobileMode}
                    currentPath={currentPath}
                    LinkComponent={LinkComponent}
                    isMobileMode={isMobileMode}
                    onNavigate={handleClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Expand/Collapse button - Only on desktop */}
        {!isMobileMode && (
          <div className="border-t border-border pt-2 pb-2 px-2 shrink-0">
            <button
              onClick={handleToggle}
              aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
              className={cn(
                'w-full flex items-center justify-center',
                'h-10 rounded-lg',
                'text-text-muted hover:text-text',
                'hover:bg-surface-hover',
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                collapsed ? 'px-0' : 'px-3'
              )}
            >
              <Icon name={collapsed ? 'ChevronRight' : 'ChevronLeft'} size={16} />
              {!collapsed && <span className="ml-2 text-sm font-medium font-body">Colapsar</span>}
            </button>
          </div>
        )}
      </div>
    );
  }
);

Sidebar.displayName = 'Sidebar';

interface SidebarItemComponentProps {
  item: SidebarItem;
  collapsed: boolean;
  currentPath?: string;
  isMobileMode?: boolean;
  onNavigate?: () => void;
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    'aria-current'?: 'page' | undefined;
    title?: string;
    children: React.ReactNode;
  }>;
}

const SidebarItemComponent = React.forwardRef<HTMLAnchorElement, SidebarItemComponentProps>(
  ({ item, collapsed, currentPath = '', isMobileMode = false, onNavigate, LinkComponent }, ref) => {
    const isActive = currentPath === item.href;
    const Link = LinkComponent || 'a';

    const handleClick = useCallback(() => {
      // Close drawer on navigation in mobile mode
      if (isMobileMode && onNavigate) {
        onNavigate();
      }
    }, [isMobileMode, onNavigate]);

    const linkElement = (
      <Link
        ref={ref}
        href={item.href}
        className={cn(
          'relative flex items-center',
          'rounded-xl',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          'min-w-0 max-w-full',
          // Size based on mode
          collapsed
            ? 'justify-center w-12 h-11'
            : isMobileMode
              ? // Mobile: larger touch targets
                'gap-3 px-4 py-3.5 w-full min-h-[52px]'
              : // Desktop: compact
                'gap-2 px-3 py-2 w-full',
          // Active/hover states
          isActive
            ? 'bg-primary text-text-inverse shadow-md'
            : 'text-text-secondary hover:text-text hover:bg-surface-hover active:scale-[0.98]'
        )}
        aria-current={isActive ? 'page' : undefined}
        onClick={handleClick}
      >
        {item.icon && (
          <Icon
            name={item.icon}
            size={collapsed ? 22 : isMobileMode ? 22 : 18}
            className="flex-shrink-0"
          />
        )}

        {!collapsed && (
          <>
            <span
              className={cn('truncate flex-1 font-body', isMobileMode ? 'text-base' : 'text-sm')}
            >
              {item.label}
            </span>
            {item.badge && (
              <span
                className={cn(
                  'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium min-w-[20px] h-[20px] font-body',
                  isActive ? 'bg-text-inverse/30 text-text-inverse' : 'bg-primary text-text-inverse'
                )}
              >
                {item.badge}
              </span>
            )}
          </>
        )}

        {item.badge && collapsed && (
          <span
            className={cn(
              'absolute -top-1 -right-1 z-10',
              'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium min-w-[18px] h-[18px] font-body',
              isActive ? 'bg-text-inverse/30 text-text-inverse' : 'bg-primary text-text-inverse'
            )}
          >
            {item.badge}
          </span>
        )}

        {collapsed && item.badge && <VisuallyHidden>Badge: {item.badge}</VisuallyHidden>}
      </Link>
    );

    // Wrap with tooltip when collapsed (desktop only)
    if (collapsed && !isMobileMode) {
      return (
        <Tooltip content={item.label} side="right">
          {linkElement}
        </Tooltip>
      );
    }

    return linkElement;
  }
);

SidebarItemComponent.displayName = 'SidebarItem';
