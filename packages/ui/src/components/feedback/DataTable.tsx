'use client';
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '../../utils/cn.js';
import { EmptyState } from './EmptyState.js';
import { Spinner } from './Spinner.js';
import { DataTableHeader } from './DataTable/DataTableHeader.js';
import { DataTableRow } from './DataTable/DataTableRow.js';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string | number;
  className?: string;
  /** @deprecated Use `cell` instead. Alias for backwards compatibility. */
  render?: (item: T) => React.ReactNode;
  cell?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  selectable?: boolean;
  selectedItems?: (string | number)[];
  onSelectionChange?: (selectedItems: T[]) => void;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  shouldVirtualize?: boolean;
  virtualThreshold?: number;
  virtualRowHeight?: number;
  getRowClassName?: (item: T) => string;
  getRowStyle?: (item: T) => React.CSSProperties;
  defaultSortColumn?: string | null;
  defaultSortDirection?: SortDirection;
}

export const DataTable = <T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  selectable = false,
  selectedItems,
  onSelectionChange,
  onRowClick,
  loading = false,
  emptyState,
  className,
  shouldVirtualize = false,
  virtualThreshold = 20,
  virtualRowHeight = 50,
  getRowClassName,
  getRowStyle,
  defaultSortColumn = null,
  defaultSortDirection = null,
}: DataTableProps<T>) => {
  const [sortColumn, setSortColumn] = useState<string | null>(defaultSortColumn);
  const [sortOrder, setSortOrder] = useState<SortDirection>(defaultSortDirection);
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<string | number>>(new Set());

  const selectedItemsSet = useMemo(() => {
    if (selectedItems) return new Set(selectedItems);
    return internalSelectedItems;
  }, [selectedItems, internalSelectedItems]);

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortOrder) return data;
    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      if (aValue === bValue) return 0;
      const comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortOrder]);

  const allSelected = data.length > 0 && selectedItemsSet.size === data.length;
  const indeterminate = selectedItemsSet.size > 0 && selectedItemsSet.size < data.length;

  const handleSort = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortOrder('asc');
    }
  }, [sortColumn]);

  const handleSelectAll = useCallback(() => {
    let next: Set<string | number>;
    if (allSelected) {
      next = new Set();
    } else {
      next = new Set(data.map(item => item[keyField] as string | number));
    }
    if (!selectedItems) {
      setInternalSelectedItems(next);
    }
    onSelectionChange?.(data.filter(item => next.has(item[keyField] as string | number)));
  }, [allSelected, data, keyField, onSelectionChange, selectedItems]);

  const handleSelectItem = useCallback((item: T) => {
    const id = item[keyField] as string | number;
    const next = new Set(selectedItemsSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    if (!selectedItems) {
      setInternalSelectedItems(next);
    }
    onSelectionChange?.(data.filter(i => next.has(i[keyField] as string | number)));
  }, [data, keyField, onSelectionChange, selectedItems, selectedItemsSet]);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const isVirtualized = shouldVirtualize && data.length > virtualThreshold;

  const virtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => virtualRowHeight,
    overscan: 10,
    enabled: isVirtualized,
  });

  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
  if (data.length === 0) return emptyState || <EmptyState title="No data available" />;

  return (
    <div ref={tableContainerRef} className={cn('relative overflow-auto border border-border rounded-lg bg-surface', className)}>
      <table className="w-full border-collapse">
        <DataTableHeader
          selectable={selectable}
          allSelected={allSelected}
          indeterminate={indeterminate}
          onSelectAll={handleSelectAll}
          columns={columns}
          sortColumn={sortColumn}
          sortOrder={sortOrder}
          onSort={handleSort}
          isVirtualized={isVirtualized}
        />
        <tbody className={cn(isVirtualized ? 'relative' : '')} style={isVirtualized ? { height: `${virtualizer.getTotalSize()}px` } : undefined}>
          {isVirtualized ? (
            virtualizer.getVirtualItems().map((virtualRow) => (
              <DataTableRow
                key={virtualRow.key}
                item={sortedData[virtualRow.index]}
                columns={columns}
                selectable={selectable}
                selected={selectedItemsSet.has(sortedData[virtualRow.index][keyField] as string | number)}
                onSelect={() => handleSelectItem(sortedData[virtualRow.index])}
                onRowClick={onRowClick}
                isVirtualized={true}
                virtualRow={virtualRow}
                getRowClassName={getRowClassName}
                getRowStyle={getRowStyle}
              />
            ))
          ) : (
            sortedData.map((item, index) => (
              <DataTableRow
                key={String(item[keyField]) || index}
                item={item}
                columns={columns}
                selectable={selectable}
                selected={selectedItemsSet.has(item[keyField] as string | number)}
                onSelect={() => handleSelectItem(item)}
                onRowClick={onRowClick}
                isVirtualized={false}
                getRowClassName={getRowClassName}
                getRowStyle={getRowStyle}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
