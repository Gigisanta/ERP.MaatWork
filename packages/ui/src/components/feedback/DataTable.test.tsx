import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  { id: '2', name: 'Bob', age: 25, status: 'Inactive' },
  { id: '3', name: 'Charlie', age: 35, status: 'Active' },
];

const mockColumns: Column<TestData>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'age', header: 'Age', sortable: true },
  { key: 'status', header: 'Status' },
];

describe('DataTable Component', () => {
  describe('Rendering', () => {
    it('should render table', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should render all columns', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render all rows', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('should render cell values', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();
    });

    it('should render custom cell content', () => {
      const customColumns: Column<TestData>[] = [
        {
          key: 'name',
          header: 'Name',
          cell: (item) => <strong>{item.name.toUpperCase()}</strong>,
        },
      ];
      render(<DataTable data={mockData} columns={customColumns} keyField="id" />);
      expect(screen.getByText('ALICE')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show spinner when loading', () => {
      render(<DataTable data={[]} columns={mockColumns} keyField="id" loading />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no data', () => {
      render(<DataTable data={[]} columns={mockColumns} keyField="id" />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should show custom empty message', () => {
      render(
        <DataTable data={[]} columns={mockColumns} keyField="id" emptyState={<div>No results found</div>} />
      );
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should show sort icons on sortable columns', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);
      const nameHeader = screen.getByText('Name').closest('button');
      expect(nameHeader).toBeInTheDocument();
    });

    it('should not show sort icon button on non-sortable columns', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);
      const statusHeader = screen.getByText('Status').closest('button');
      expect(statusHeader).toBeNull();
    });

    it('should sort ascending on first click', async () => {
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);

      const nameHeader = screen.getByText('Name').closest('button');
      await user.click(nameHeader!);

      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('Alice')).toBeInTheDocument();
      expect(within(rows[2]).getByText('Bob')).toBeInTheDocument();
      expect(within(rows[3]).getByText('Charlie')).toBeInTheDocument();
    });

    it('should sort descending on second click', async () => {
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);

      const nameHeader = screen.getByText('Name').closest('button');
      await user.click(nameHeader!);
      await user.click(nameHeader!);

      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('Charlie')).toBeInTheDocument();
      expect(within(rows[2]).getByText('Bob')).toBeInTheDocument();
      expect(within(rows[3]).getByText('Alice')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should show select all checkbox when selectable', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" selectable />);
      expect(screen.getAllByRole('checkbox')).toHaveLength(4); // 1 header + 3 rows
    });

    it.skip('should select all rows when select all clicked', async () => {
      const handleSelectionChange = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
          selectable
          onSelectionChange={handleSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // Use fireEvent to avoid potential userEvent issues with Radix Checkbox in JSDOM
      fireEvent.click(checkboxes[0]); // Select all

      expect(handleSelectionChange).toHaveBeenCalled();
    });

    it.skip('should select individual row', async () => {
      const handleSelectionChange = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
          selectable
          onSelectionChange={handleSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // Row 1

      expect(handleSelectionChange).toHaveBeenCalled();
    });

    it('should highlight selected rows', () => {
      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
          selectable
          selectedItems={['1']}
        />
      );

      // Alice has id '1', so first row (after header) should be selected
      const rows = screen.getAllByRole('row');
      // Index 0 is header, 1 is Alice
      expect(rows[1]).toHaveClass('bg-primary/5');
    });
  });

  describe('Row Click', () => {
    it('should call onRowClick when row clicked', async () => {
      const handleRowClick = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
          onRowClick={handleRowClick}
        />
      );

      const row = screen.getByText('Alice').closest('tr');
      await user.click(row!);

      expect(handleRowClick).toHaveBeenCalledWith(mockData[0]);
    });

    it('should add cursor pointer when onRowClick provided', () => {
      render(
        <DataTable data={mockData} columns={mockColumns} keyField="id" onRowClick={vi.fn()} />
      );

      const row = screen.getByText('Alice').closest('tr');
      expect(row).toHaveClass('cursor-pointer');
    });
  });
});
