import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../utils/cn';
import Icon, { type IconName } from '../Icon';

export interface NavItem {
  label: string;
  href: string;
  icon?: IconName;
  badge?: string | number;
  children?: NavItem[];
}

export interface NavProps extends React.HTMLAttributes<HTMLElement> {
  items: NavItem[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Nav = React.forwardRef<HTMLElement, NavProps>(
  ({ items, orientation = 'horizontal', className, ...props }, ref) => {
    const pathname = usePathname();

    const navClasses = cn(
      'flex',
      orientation === 'horizontal' ? 'flex-row space-x-1' : 'flex-col space-y-1',
      className
    );

    const itemClasses = (href: string) => cn(
      'flex items-center gap-2 px-3 py-2',
      'text-sm font-medium',
      'rounded-md transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      pathname === href
        ? 'bg-primary text-text-inverse'
        : 'text-text-secondary hover:text-text hover:bg-surface-hover'
    );

    return (
      <nav
        ref={ref}
        className={navClasses}
        role="navigation"
        {...props}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={itemClasses(item.href)}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            {item.icon && <Icon name={item.icon} size="sm" />}
            {item.label}
            {item.badge && (
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                pathname === item.href
                  ? 'bg-text-inverse/20 text-text-inverse'
                  : 'bg-primary text-text-inverse'
              )}>
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
    );
  }
);

Nav.displayName = 'Nav';





