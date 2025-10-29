import React from 'react';
import Link from 'next/link';
import { cn } from '../../utils/cn';
import Icon from '../Icon';
import { Text } from '../../primitives/Text';
import { VisuallyHidden } from '../../primitives/VisuallyHidden';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsProps>(
  ({ items, separator, className, ...props }, ref) => {
    const defaultSeparator = <Icon name="ChevronRight" size={16} className="text-text-muted" />;

    return (
      <nav
        ref={ref}
        className={cn('flex items-center space-x-1 text-sm', className)}
        aria-label="Breadcrumb"
        {...props}
      >
        <ol className="flex items-center space-x-1">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const isFirst = index === 0;

            return (
              <li key={index} className="flex items-center">
                {!isFirst && (
                  <span 
                    className="mx-2 text-text-muted"
                    aria-hidden="true"
                  >
                    {separator || defaultSeparator}
                  </span>
                )}

                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className={cn(
                      'text-text-secondary hover:text-text',
                      'transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      'rounded-sm px-1 py-0.5'
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      isLast ? 'text-text font-medium' : 'text-text-secondary'
                    )}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
);

Breadcrumbs.displayName = 'Breadcrumbs';





