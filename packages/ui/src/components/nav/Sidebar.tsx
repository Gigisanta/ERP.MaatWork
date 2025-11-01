"use client";
import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import Button from './Button';
import Icon, { type IconName } from '../Icon';
import { Text } from '../../primitives/Text';
import { VisuallyHidden } from '../../primitives/VisuallyHidden';

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
          'flex flex-col h-full bg-surface border-r border-border',
          'transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-64',
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && logo && (
            <div className="flex items-center">
              {logo}
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="ml-auto"
          >
            <Icon name={collapsed ? 'ChevronRight' : 'ChevronLeft'} size={16} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6" role="navigation">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-2">
              {section.title && !collapsed && (
                <Text 
                  size="xs" 
                  weight="semibold" 
                  className="text-text-muted uppercase tracking-wider px-3"
                >
                  {section.title}
                </Text>
              )}
              
              <div className="space-y-1">
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

    return (
      <Link
        ref={ref}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2',
          'text-sm font-medium rounded-md',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isActive
            ? 'bg-primary text-text-inverse'
            : 'text-text-secondary hover:text-text hover:bg-surface-hover'
        )}
        aria-current={isActive ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
      >
        {item.icon && (
          <Icon 
            name={item.icon} 
            size={16}
            className="flex-shrink-0" 
          />
        )}
        
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span className={cn(
                'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ml-auto',
                isActive
                  ? 'bg-text-inverse/20 text-text-inverse'
                  : 'bg-primary text-text-inverse'
              )}>
                {item.badge}
              </span>
            )}
          </>
        )}
        
        {collapsed && item.badge && (
          <VisuallyHidden>Badge: {item.badge}</VisuallyHidden>
        )}
      </Link>
    );
  }
);

SidebarItem.displayName = 'SidebarItem';
