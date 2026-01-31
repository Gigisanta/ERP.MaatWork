'use client';
import React from 'react';
import { Checkbox } from '../../forms/Checkbox.js';
import { Icon } from '../../Icon.js';
import { cn } from '../../../utils/cn.js';
import type { Column } from '../DataTable.js';

interface DataTableHeaderProps<T> {
  selectable: boolean;
  allSelected: boolean;
  indeterminate: boolean;
  onSelectAll: () => void;
  columns: Column<T>[];
  sortColumn: string | null;
  sortOrder: 'asc' | 'desc' | null;
  onSort: (key: string) => void;
  isVirtualized: boolean;
}

export const DataTableHeader = <T,>({
  selectable,
  allSelected,
  indeterminate,
  onSelectAll,
  columns,
  sortColumn,
  sortOrder,
  onSort,
  isVirtualized
}: DataTableHeaderProps<T>) => {
  return (
    <thead className={cn('bg-surface sticky top-0 z-10', isVirtualized ? 'flex w-full' : '')}>
      <tr className={cn('border-b border-border', isVirtualized ? 'flex w-full' : '')}>
        {selectable && (
          <th className="w-12 px-4 py-3 text-left">
            <Checkbox
              checked={allSelected}
              indeterminate={indeterminate}
              onChange={onSelectAll}
            />
          </th>
        )}
        {columns.map((column) => (
          <th
            key={String(column.key)}
            className={cn(
              'px-4 py-3 text-left text-sm font-semibold text-text-muted',
              column.className,
              isVirtualized ? 'flex-1' : ''
            )}
            style={column.width ? { width: column.width, flex: column.width ? 'none' : '1' } : {}}
          >
            {column.sortable ? (
              <button
                className="flex items-center gap-1 hover:text-text transition-colors"
                onClick={() => onSort(String(column.key))}
              >
                <span>{column.header}</span>
                <Icon
                  name="ChevronUp"
                  className={cn(
                    'h-3 w-3 transition-transform',
                    sortColumn === String(column.key) && sortOrder === 'desc' ? 'rotate-180' : '',
                    sortColumn !== String(column.key) && 'opacity-0'
                  )}
                />
              </button>
            ) : (
              <span>{column.header}</span>
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
};
