import React from 'react';
import { cn } from '../../utils/cn.js';
import Icon from '../Icon.js';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Props para LinkComponent customizado
 */
export interface LinkComponentProps {
  href: string;
  className?: string;
  'aria-current'?: 'page' | undefined;
  children: React.ReactNode;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
  /**
   * Custom Link component (e.g., Next.js Link, React Router Link)
   * If not provided, will use a regular <a> tag
   */
  LinkComponent?: React.ComponentType<LinkComponentProps>;
}

export const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsProps>(
  ({ items, separator, className, LinkComponent, ...props }, ref) => {
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

            const linkClassName = cn(
              'text-text-secondary hover:text-text',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'rounded-sm px-1 py-0.5'
            );

            return (
              <li key={index} className="flex items-center">
                {!isFirst && (
                  <span className="mx-2 text-text-muted" aria-hidden="true">
                    {separator || defaultSeparator}
                  </span>
                )}

                {item.href && !isLast ? (
                  LinkComponent ? (
                    <LinkComponent href={item.href} className={linkClassName}>
                      {item.label}
                    </LinkComponent>
                  ) : (
                    <a href={item.href} className={linkClassName}>
                      {item.label}
                    </a>
                  )
                ) : (
                  <span
                    className={cn(isLast ? 'text-text font-medium' : 'text-text-secondary')}
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
