import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from './DataTable';
import type { Column } from './DataTable';

interface TestData extends Record<string, unknown> {
  id: string;
  name: string;
  age: number;
  status: string;
}

const mockData: TestData[] = [
  { id: '1', name: 'Alice', age: 30, status: 'Active' },
];

const mockColumns: Column<TestData>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'age', header: 'Age', sortable: true },
  { key: 'status', header: 'Status' },
];

describe('DataTable Component Extended', () => {
  describe('Column Styling', () => {
    it('should apply custom className', () => {
      const columns: Column<TestData>[] = [{ key: 'name', header: 'Name', className: 'text-center' }];
      render(<DataTable data={mockData} columns={columns} keyField="id" />);
      const header = screen.getByText('Name').closest('th');
      expect(header).toHaveClass('text-center');
    });

    it('should apply custom column width', () => {
      const columns: Column<TestData>[] = [{ key: 'name', header: 'Name', width: '200px' }];
      render(<DataTable data={mockData} columns={columns} keyField="id" />);
      const header = screen.getByText('Name').closest('th');
      expect(header).toHaveStyle({ width: '200px' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty columns array', () => {
      render(<DataTable data={mockData} columns={[]} keyField="id" />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should handle missing column values', () => {
      const dataWithMissing: Partial<TestData>[] = [
        { id: '1', name: 'Alice', age: undefined, status: null as unknown as string },
      ];
      render(
        <DataTable data={dataWithMissing as TestData[]} columns={mockColumns} keyField="id" />
      );
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should handle very large datasets', () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        name: `User ${i}`,
        age: 20 + i,
        status: 'Active',
      }));
      render(<DataTable data={largeData} columns={mockColumns} keyField="id" />);
      expect(screen.getByText('User 0')).toBeInTheDocument();
      expect(screen.getByText('User 99')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render large dataset efficiently', () => {
      const largeData = Array.from({ length: 500 }, (_, i) => ({
        id: `${i}`,
        name: `User ${i}`,
        age: 20 + (i % 50),
        status: i % 2 === 0 ? 'Active' : 'Inactive',
      }));

      const startTime = performance.now();
      render(<DataTable data={largeData} columns={mockColumns} keyField="id" />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(3000);
    });
  });
});
