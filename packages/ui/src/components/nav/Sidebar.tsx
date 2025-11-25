"use client";
import React, { useState, useEffect } from 'react';
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

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ 
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
  }, ref) => {
    const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
    
    const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
    
    const handleToggle = () => {
      const newCollapsed = !collapsed;
      if (controlledCollapsed === undefined) {
        setInternalCollapsed(newCollapsed);
      }
      onCollapse?.(newCollapsed);
    };

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

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex flex-col h-full bg-surface border-r border-border',
          'transition-all duration-300 ease-in-out',
          collapsed ? 'w-14' : 'w-64',
          className
        )}
        data-open={isOpen === undefined ? undefined : isOpen}
        {...props}
      >
        {/* Close button for mobile drawer usage - Top right corner */}
        {onOpenChange && (
          <div className="absolute top-2 right-2 z-10 lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-7 w-7 p-0"
              aria-label="Close menu"
            >
              <Icon name="X" size={14} />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-1.5 space-y-4" role="navigation">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-1">
              {section.title && !collapsed && (
                <Text 
                  size="xs" 
                  weight="semibold" 
                  className="text-text-muted uppercase tracking-wider px-2 mb-1"
                >
                  {section.title}
                </Text>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    currentPath={currentPath}
                    LinkComponent={LinkComponent}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Expand/Collapse button - Bottom, integrated */}
        <div className="border-t border-border pt-1.5 pb-1.5 px-1.5">
          <button
            onClick={handleToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'w-full flex items-center justify-center',
              'h-10 rounded-xl',
              'text-text-muted hover:text-text',
              'hover:bg-surface-hover',
              'transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              collapsed ? 'px-0' : 'px-2'
            )}
          >
            <Icon name={collapsed ? 'ChevronRight' : 'ChevronLeft'} size={16} />
            {!collapsed && (
              <span className="ml-2 text-xs font-medium">Colapsar</span>
            )}
          </button>
        </div>
      </div>
    );
  }
);

Sidebar.displayName = 'Sidebar';

interface SidebarItemProps {
  item: SidebarItem;
  collapsed: boolean;
  currentPath?: string;
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    'aria-current'?: 'page' | undefined;
    title?: string;
    children: React.ReactNode;
  }>;
}

const SidebarItem = React.forwardRef<HTMLAnchorElement, SidebarItemProps>(
  ({ item, collapsed, currentPath = '', LinkComponent }, ref) => {
    const isActive = currentPath === item.href;
    const Link = LinkComponent || 'a';

    const linkElement = (
      <Link
        ref={ref}
        href={item.href}
        className={cn(
          'relative flex items-center',
          'rounded-xl',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          collapsed 
            ? 'justify-center w-10 h-10'
            : 'gap-2.5 px-2.5 py-2 w-full',
          isActive
            ? 'bg-primary text-text-inverse shadow-md scale-105'
            : 'text-text-secondary hover:text-text hover:bg-surface-hover hover:scale-105'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        {item.icon && (
          <Icon 
            name={item.icon} 
            size={collapsed ? 20 : 18}
            className="flex-shrink-0" 
          />
        )}
        
        {!collapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            {item.badge && (
              <span className={cn(
                'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium min-w-[18px] h-[18px]',
                isActive
                  ? 'bg-text-inverse/30 text-text-inverse'
                  : 'bg-primary text-text-inverse'
              )}>
                {item.badge}
              </span>
            )}
          </>
        )}
        
        {item.badge && collapsed && (
          <span className={cn(
            'absolute -top-1 -right-1 z-10',
            'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium min-w-[18px] h-[18px]',
            isActive
              ? 'bg-text-inverse/30 text-text-inverse'
              : 'bg-primary text-text-inverse'
          )}>
            {item.badge}
          </span>
        )}
        
        {collapsed && item.badge && (
          <VisuallyHidden>Badge: {item.badge}</VisuallyHidden>
        )}
      </Link>
    );

    // Wrap with tooltip when collapsed
    if (collapsed) {
      return (
        <Tooltip content={item.label} side="right">
          {linkElement}
        </Tooltip>
      );
    }

    return linkElement;
  }
);

SidebarItem.displayName = 'SidebarItem';
