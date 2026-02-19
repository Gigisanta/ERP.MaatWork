'use client';
import React from 'react';
import { cn } from '../../../utils/cn.js';
import { Checkbox } from '../../forms/Checkbox.js';
import type { Column } from '../DataTable.js';

export interface DataTableRowProps<T> {
  item: T;
  columns: Column<T>[];
  selectable: boolean;
  selected: boolean;
  onSelect: () => void;
  onRowClick?: (item: T) => void;
  isVirtualized: boolean;
  virtualRow?: {
    size: number;
    start: number;
  };
  getRowClassName?: (item: T) => string;
  getRowStyle?: (item: T) => React.CSSProperties;
}

export const DataTableRow = <T extends Record<string, unknown>>({
  item,
  columns,
  selectable,
  selected,
  onSelect,
  onRowClick,
  isVirtualized,
  virtualRow,
  getRowClassName,
  getRowStyle
}: DataTableRowProps<T>) => {
  return (
    <tr
      className={cn(
        'hover:bg-surface-hover/50 transition-colors border-b border-border last:border-b-0',
        onRowClick && 'cursor-pointer',
        selected && 'bg-primary/5',
        isVirtualized ? 'flex w-full items-center' : '',
        getRowClassName?.(item)
      )}
      onClick={() => onRowClick?.(item)}
      style={{
        ...(isVirtualized && virtualRow ? {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start}px)`
        } : {}),
        ...getRowStyle?.(item)
      }}
    >
      {selectable && (
        <td
          className="w-12 px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onChange={onSelect}
          />
        </td>
      )}
      {columns.map((column) => (
        <td
          key={String(column.key)}
          className={cn(
            'px-4 py-3 text-sm text-text',
            column.className,
            isVirtualized ? 'flex-1' : ''
          )}
          style={column.width ? { width: column.width, flex: column.width ? 'none' : '1' } : {}}
        >
          {column.cell ? column.cell(item) : (item[column.key] as React.ReactNode)}
        </td>
      ))}
    </tr>
  );
};
