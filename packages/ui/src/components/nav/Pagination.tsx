import React from 'react';
import { cn } from '../../utils/cn';
import Button from './Button';
import Icon from '../Icon';
import { VisuallyHidden } from '../../primitives/VisuallyHidden';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  maxVisiblePages?: number;
  className?: string;
}

export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ 
    currentPage,
    totalPages,
    onPageChange,
    showFirstLast = true,
    showPrevNext = true,
    maxVisiblePages = 5,
    className,
    ...props 
  }, ref) => {
    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    const getVisiblePages = () => {
      if (totalPages <= maxVisiblePages) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      const half = Math.floor(maxVisiblePages / 2);
      let start = Math.max(1, currentPage - half);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);

      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }

      const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      
      const result = [];
      if (start > 1) {
        result.push(1);
        if (start > 2) {
          result.push('ellipsis-start');
        }
      }
      result.push(...pages);
      if (end < totalPages) {
        if (end < totalPages - 1) {
          result.push('ellipsis-end');
        }
        result.push(totalPages);
      }

      return result;
    };

    const visiblePages = getVisiblePages();

    if (totalPages <= 1) {
      return null;
    }

    return (
      <nav
        ref={ref}
        className={cn('flex items-center justify-center space-x-1', className)}
        aria-label="Pagination"
        {...props}
      >
        {showFirstLast && (
          <>
            <Button
              variant="ghost"
              size="sm"
              iconLeft="chevron-left"
              iconRight="chevron-left"
              onClick={() => onPageChange(1)}
              disabled={!canGoPrevious}
              aria-label="Go to first page"
              className="p-2"
            >
              <VisuallyHidden>First</VisuallyHidden>
            </Button>
          </>
        )}

        {showPrevNext && (
          <Button
            variant="ghost"
            size="sm"
            iconLeft="chevron-left"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
            aria-label={`Go to previous page, page ${currentPage - 1}`}
          >
            Previous
          </Button>
        )}

        {visiblePages.map((page, index) => {
          if (page === 'ellipsis-start' || page === 'ellipsis-end') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 py-1 text-sm text-text-muted"
                aria-hidden="true"
              >
                ...
              </span>
            );
          }

          const isCurrentPage = page === currentPage;

          return (
            <Button
              key={page}
              variant={isCurrentPage ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(page as number)}
              aria-label={`Go to page ${page}`}
              aria-current={isCurrentPage ? 'page' : undefined}
              className="min-w-[2.5rem]"
            >
              {page}
            </Button>
          );
        })}

        {showPrevNext && (
          <Button
            variant="ghost"
            size="sm"
            iconRight="chevron-right"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            aria-label={`Go to next page, page ${currentPage + 1}`}
          >
            Next
          </Button>
        )}

        {showFirstLast && (
          <Button
            variant="ghost"
            size="sm"
            iconLeft="chevron-right"
            iconRight="chevron-right"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext}
            aria-label="Go to last page"
            className="p-2"
          >
            <VisuallyHidden>Last</VisuallyHidden>
          </Button>
        )}
      </nav>
    );
  }
);

Pagination.displayName = 'Pagination';





