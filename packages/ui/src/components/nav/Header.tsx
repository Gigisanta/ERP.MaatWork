import React from 'react';
import Image from 'next/image';
import { cn } from '../../utils/cn.js';
import { Button } from './Button.js';
import { Icon, type IconName } from '../Icon.js';
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
  notificationComponent?: React.ReactNode;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  className?: string;
  children?: React.ReactNode;
  leftContent?: React.ReactNode;
}

/**
 * Header component with brand styling.
 * Uses smooth transitions and Primary Purple for focus states and highlights.
 *
 * AI_DECISION: Improved responsive behavior for small screens
 * Justificación: Better UX on mobile devices with proper spacing and touch targets
 * Impacto: Header works well on screens as small as 320px
 */
export const Header = React.forwardRef<HTMLElement, HeaderProps>(
  (
    {
      logo,
      navItems = [],
      user,
      notificationComponent,
      onLogout,
      onToggleSidebar,
      sidebarOpen = false,
      className,
      children,
      leftContent,
      ...props
    },
    ref
  ) => {
    return (
      <header
        ref={ref}
        className={cn(
          'sticky top-0 z-40',
          'bg-surface/95 backdrop-blur-sm border-b border-border',
          // Responsive padding with safe area support
          'px-2 xs:px-3 sm:px-4 lg:px-6',
          'safe-area-inset-x',
          'transition-all duration-200',
          className
        )}
        {...props}
      >
        <div className="flex h-12 sm:h-14 items-center justify-between flex-nowrap gap-2 sm:gap-3">
          {/* Left section: Mobile menu button + Logo + Left Content */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
            {/* Drawer toggle removed as requested for mobile bottom bar */}
            {/* {onToggleSidebar && ( ... )} */}

            {logo && <div className="flex items-center min-w-0 shrink-0">{logo}</div>}

            {leftContent && (
              <div className="flex items-center min-w-0 flex-1 ml-2">{leftContent}</div>
            )}
          </div>

          {/* Center section: Navigation or Children (desktop) */}
          {/* AI_DECISION: Only take flex-1 space when there's actual content to prevent squishing the logo on mobile */}
          {/* Justificación: When center is empty, logo should get more horizontal space */}
          {/* Impacto: Better mobile UX, logo doesn't truncate */}
          <div
            className={cn(
              'flex justify-center min-w-0 px-2 sm:px-4',
              children || navItems.length > 0 ? 'flex-1' : 'hidden lg:flex lg:flex-1'
            )}
          >
            {children ? (
              children
            ) : navItems.length > 0 ? (
              <nav
                className="flex items-center space-x-4 overflow-x-auto whitespace-nowrap justify-center min-w-0 hide-scrollbar"
                role="navigation"
              >
                {navItems.map((item) =>
                  item.href.startsWith('http') ? (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md no-underline',
                        'text-sm font-medium text-text-secondary',
                        'hover:text-primary hover:bg-primary-subtle',
                        'transition-all duration-200',
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
                  ) : (
                    <a
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md no-underline',
                        'text-sm font-medium text-text-secondary',
                        'hover:text-primary hover:bg-primary-subtle',
                        'transition-all duration-200',
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
                )}
              </nav>
            ) : null}
          </div>

          {/* Right section: User menu */}
          <div className="flex items-center shrink-0 gap-2 sm:gap-3">
            {notificationComponent && (
              <div className="flex items-center">{notificationComponent}</div>
            )}

            {user && (
              <div className="flex items-center shrink-0">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'flex items-center justify-center p-1',
                        'transition-transform duration-200 hover:scale-105 active:scale-95',
                        // Minimum touch target for accessibility
                        'min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px]'
                      )}
                      aria-label={`Menú de usuario: ${user.name}`}
                    >
                      {user.avatar ? (
                        <div className="relative h-8 w-8 sm:h-9 sm:w-9">
                          <Image
                            src={user.avatar}
                            alt={user.name}
                            fill
                            sizes="(max-width: 640px) 32px, 36px"
                            className="rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all duration-200 object-cover"
                            priority={true}
                          />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-primary text-xs sm:text-sm font-medium text-text-inverse ring-2 ring-transparent hover:ring-primary/30 transition-all duration-200">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className={cn(
                        // Responsive width - smaller on mobile
                        'w-[calc(100vw-1rem)] xs:w-[280px] sm:min-w-[260px]',
                        'max-w-[320px]',
                        'bg-background rounded-xl border border-border shadow-xl',
                        'p-1.5 z-50',
                        // Animations
                        'data-[state=open]:animate-in data-[state=closed]:animate-out',
                        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                        'data-[side=bottom]:slide-in-from-top-2',
                        // Safe area for mobile
                        'mr-2 sm:mr-0'
                      )}
                      sideOffset={8}
                      align="end"
                      collisionPadding={8}
                    >
                      {/* User info header */}
                      <div className="px-3 py-2.5 border-b border-border mb-1">
                        <p className="text-sm font-semibold text-text truncate">{user.name}</p>
                        <p className="text-xs text-text-muted truncate mt-0.5">{user.email}</p>
                        {user.role && (
                          <p className="text-xs text-primary font-medium mt-1">{user.role}</p>
                        )}
                      </div>

                      <DropdownMenu.Item asChild>
                        <a
                          href="/profile"
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer no-underline',
                            'text-text hover:bg-primary-subtle hover:text-primary',
                            'focus:bg-primary-subtle focus:text-primary focus:outline-none',
                            'rounded-lg transition-all duration-150',
                            // Touch target
                            'min-h-[44px] sm:min-h-[40px]'
                          )}
                        >
                          <Icon name="User" size={18} />
                          Mi Perfil
                        </a>
                      </DropdownMenu.Item>

                      <DropdownMenu.Separator className="my-1.5 h-px bg-border" />

                      <DropdownMenu.Item
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer',
                          'text-error hover:bg-error-subtle',
                          'focus:bg-error-subtle focus:outline-none',
                          'rounded-lg transition-all duration-150',
                          // Touch target
                          'min-h-[44px] sm:min-h-[40px]'
                        )}
                        onClick={onLogout}
                      >
                        <Icon name="LogOut" size={18} />
                        Cerrar Sesión
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';
