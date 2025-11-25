import React from 'react';
import { cn } from '../../utils/cn';
import Button from './Button';
import Icon, { type IconName } from '../Icon';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export interface NavItem {
  label: string;
  href: string;
  icon?: IconName;
  badge?: string | number;
  children?: NavItem[];
}

export interface User {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  navItems?: NavItem[];
  user?: User;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  className?: string;
}

export const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ 
    logo,
    navItems = [],
    user,
    onLogout,
    onToggleSidebar,
    sidebarOpen = false,
    className,
    ...props 
  }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          'sticky top-0 z-40',
          'bg-surface border-b border-border',
          'px-3 sm:px-4 lg:px-6',
          className
        )}
        {...props}
      >
        <div className="flex h-12 items-center justify-between flex-nowrap gap-2">
          {/* Left section: Logo + Page Title + Mobile menu button */}
          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="lg:hidden shrink-0"
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                <Icon name="Menu" size={16} />
              </Button>
            )}
            
            {logo && (
              <div className="flex items-center min-w-0 flex-1 overflow-hidden">
                {logo}
              </div>
            )}
          </div>

          {/* Center section: Navigation (desktop) */}
          {navItems.length > 0 && (
            <nav
              className="flex items-center space-x-4 overflow-x-auto whitespace-nowrap flex-1 justify-center min-w-0"
              role="navigation"
            >
              {navItems.map((item) => (
                item.href.startsWith('http') ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md no-underline',
                      'text-sm font-medium text-text-secondary',
                      'hover:text-text hover:bg-surface-hover',
                      'rounded-md transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                    )}
                  >
                    {/* AI_DECISION: Abrir links externos en nueva pestaña por seguridad/usabilidad */}
                    {item.icon && <Icon name={item.icon} size={16} />}
                    {item.label}
                    {item.badge && (
                      <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-text-inverse">
                        {item.badge}
                      </span>
                    )}
                  </a>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md no-underline',
                      'text-sm font-medium text-text-secondary',
                      'hover:text-text hover:bg-surface-hover',
                      'rounded-md transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                    )}
                  >
                    {item.icon && <Icon name={item.icon} size={16} />}
                    {item.label}
                    {item.badge && (
                      <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-text-inverse">
                        {item.badge}
                      </span>
                    )}
                  </a>
                )
              ))}
            </nav>
          )}

          {/* Right section: User menu */}
          {user && (
            <div className="flex items-center gap-4">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center justify-center p-1"
                    aria-label={`User menu for ${user.name}`}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt=""
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-text-inverse">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className={cn(
                      'min-w-[200px] bg-surface rounded-md border border-border shadow-lg',
                      'p-1 z-50',
                      'data-[state=open]:animate-in data-[state=closed]:animate-out',
                      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                      'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                      'data-[side=bottom]:slide-in-from-top-2'
                    )}
                    sideOffset={5}
                  >
                    <DropdownMenu.Item asChild>
                      <a
                        href="/profile"
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer no-underline',
                          'text-text hover:bg-surface-hover',
                          'focus:bg-surface-hover focus:outline-none',
                          'rounded-sm transition-colors'
                        )}
                      >
                        <Icon name="User" size={16} />
                        Profile
                      </a>
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator className="my-1 h-px bg-border" />

                    <DropdownMenu.Item
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer',
                        'text-error hover:bg-error-subtle',
                        'focus:bg-error-subtle focus:outline-none',
                        'rounded-sm transition-colors'
                      )}
                      onClick={onLogout}
                    >
                      <Icon name="LogOut" size={16} />
                      Log out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          )}
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';
