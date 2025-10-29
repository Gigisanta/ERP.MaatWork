"use client";
import React, { useState, useMemo } from 'react';
import Icon from '../Icon';
import { cn } from '../../utils/cn';
import Button from '../nav/Button';
import { Checkbox } from '../Checkbox';
import EmptyState from './EmptyState';
import { Spinner } from './Spinner';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T, index: number) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedItems: T[]) => void;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  keyField,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  selectable = false,
  onSelectionChange,
  className,
  ...props
}: DataTableProps<T>) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Handle sorting
  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  // Handle selection
  const handleSelectAll = () => {
    if (selectedItems.size === data.length) {
      setSelectedItems(new Set());
      onSelectionChange?.([]);
    } else {
      const allKeys = new Set(data.map(item => String(item[keyField])));
      setSelectedItems(allKeys);
      onSelectionChange?.(data);
    }
  };

  const handleSelectItem = (item: T, checked: boolean) => {
    const itemKey = String(item[keyField]);
    const newSelected = new Set(selectedItems);
    
    if (checked) {
      newSelected.add(itemKey);
    } else {
      newSelected.delete(itemKey);
    }
    
    setSelectedItems(newSelected);
    const selectedData = data.filter(item => newSelected.has(String(item[keyField])));
    onSelectionChange?.(selectedData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border-base', className)} {...props}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background-surface">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={selectedItems.size === data.length}
                    indeterminate={selectedItems.size > 0 && selectedItems.size < data.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-medium text-foreground-secondary',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.width && `w-[${column.width}]`
                  )}
                  style={{ width: column.width }}
                >
                  <button
                    className={cn(
                      'flex items-center space-x-1 hover:text-foreground-base',
                      !column.sortable && 'cursor-default'
                    )}
                    onClick={() => column.sortable && handleSort(String(column.key))}
                    disabled={!column.sortable}
                  >
                    <span>{column.header}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <Icon
                          name="chevron-up"
                          size={12}
                          className={cn(
                            'text-foreground-tertiary',
                            sortColumn === String(column.key) && sortDirection === 'asc' && 'text-foreground-base'
                          )}
                        />
                        <Icon
                          name="chevron-down"
                          size={12}
                          className={cn(
                            'text-foreground-tertiary -mt-1',
                            sortColumn === String(column.key) && sortDirection === 'desc' && 'text-foreground-base'
                          )}
                        />
                      </div>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-base">
            {sortedData.map((item, index) => (
              <tr
                key={String(item[keyField])}
                className={cn(
                  'hover:bg-background-surface transition-colors',
                  onRowClick && 'cursor-pointer',
                  selectedItems.has(String(item[keyField])) && 'bg-accent-subtle'
                )}
                onClick={() => onRowClick?.(item, index)}
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedItems.has(String(item[keyField]))}
                      onCheckedChange={(checked) => handleSelectItem(item, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${String(item[keyField])}`}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={cn(
                      'px-4 py-3 text-sm',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {column.render ? column.render(item, index) : String(item[column.key] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

DataTable.displayName = 'DataTable';
