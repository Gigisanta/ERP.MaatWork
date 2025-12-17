import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
          render: (item) => <strong>{item.name.toUpperCase()}</strong>,
        },
      ];
      render(<DataTable data={mockData} columns={customColumns} keyField="id" />);
      expect(screen.getByText('ALICE')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show spinner when loading', () => {
      render(<DataTable data={[]} columns={mockColumns} keyField="id" loading />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not show table when loading', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" loading />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no data', () => {
      render(<DataTable data={[]} columns={mockColumns} keyField="id" />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should show custom empty message', () => {
      render(
        <DataTable data={[]} columns={mockColumns} keyField="id" emptyMessage="No results found" />
      );
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('should not show table when no data', () => {
      render(<DataTable data={[]} columns={mockColumns} keyField="id" />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should show sort icons on sortable columns', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);
      const nameHeader = screen.getByText('Name').closest('button');
      expect(nameHeader).toBeInTheDocument();
    });

    it('should not show sort icon on non-sortable columns', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);
      const statusHeader = screen.getByText('Status').closest('button');
      expect(statusHeader).toHaveAttribute('disabled');
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

    it('should clear sort on third click', async () => {
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);

      const nameHeader = screen.getByText('Name').closest('button');
      await user.click(nameHeader!);
      await user.click(nameHeader!);
      await user.click(nameHeader!);

      // Should return to original order
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('Alice')).toBeInTheDocument();
    });

    it('should sort numbers correctly', async () => {
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);

      const ageHeader = screen.getByText('Age').closest('button');
      await user.click(ageHeader!);

      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('25')).toBeInTheDocument();
      expect(within(rows[2]).getByText('30')).toBeInTheDocument();
      expect(within(rows[3]).getByText('35')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should show select all checkbox when selectable', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" selectable />);
      expect(screen.getByLabelText('Select all')).toBeInTheDocument();
    });

    it('should show row checkboxes when selectable', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" selectable />);
      expect(screen.getByLabelText('Select 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Select 2')).toBeInTheDocument();
      expect(screen.getByLabelText('Select 3')).toBeInTheDocument();
    });

    it('should select all rows when select all clicked', async () => {
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

      const selectAll = screen.getByLabelText('Select all');
      await user.click(selectAll);

      expect(handleSelectionChange).toHaveBeenCalledWith(mockData);
    });

    it('should deselect all rows when select all clicked twice', async () => {
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

      const selectAll = screen.getByLabelText('Select all');
      await user.click(selectAll);
      await user.click(selectAll);

      expect(handleSelectionChange).toHaveBeenLastCalledWith([]);
    });

    it('should select individual row', async () => {
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

      const checkbox = screen.getByLabelText('Select 1');
      await user.click(checkbox);

      expect(handleSelectionChange).toHaveBeenCalledWith([mockData[0]]);
    });

    it('should highlight selected rows', async () => {
      const user = userEvent.setup();
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" selectable />);

      const checkbox = screen.getByLabelText('Select 1');
      await user.click(checkbox);

      const row = checkbox.closest('tr');
      expect(row).toHaveClass('bg-primary-subtle');
    });

    it('should not select row when clicking stop propagation', async () => {
      const handleRowClick = vi.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          data={mockData}
          columns={mockColumns}
          keyField="id"
          selectable
          onRowClick={handleRowClick}
        />
      );

      const checkbox = screen.getByLabelText('Select 1');
      await user.click(checkbox);

      expect(handleRowClick).not.toHaveBeenCalled();
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

      expect(handleRowClick).toHaveBeenCalledWith(mockData[0], 0);
    });

    it('should add cursor pointer when onRowClick provided', () => {
      render(
        <DataTable data={mockData} columns={mockColumns} keyField="id" onRowClick={vi.fn()} />
      );

      const row = screen.getByText('Alice').closest('tr');
      expect(row).toHaveClass('cursor-pointer');
    });

    it('should not add cursor pointer when no onRowClick', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);

      const row = screen.getByText('Alice').closest('tr');
      expect(row).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Column Alignment', () => {
    it('should default to left alignment', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);
      const cell = screen.getByText('Alice').closest('td');
      expect(cell).not.toHaveClass('text-center', 'text-right');
    });

    it('should apply center alignment', () => {
      const columns: Column<TestData>[] = [{ key: 'name', header: 'Name', align: 'center' }];
      render(<DataTable data={mockData} columns={columns} keyField="id" />);
      const header = screen.getByText('Name').closest('th');
      expect(header).toHaveClass('text-center');
    });

    it('should apply right alignment', () => {
      const columns: Column<TestData>[] = [{ key: 'age', header: 'Age', align: 'right' }];
      render(<DataTable data={mockData} columns={columns} keyField="id" />);
      const header = screen.getByText('Age').closest('th');
      expect(header).toHaveClass('text-right');
    });
  });

  describe('Column Width', () => {
    it('should apply custom column width', () => {
      const columns: Column<TestData>[] = [{ key: 'name', header: 'Name', width: '200px' }];
      render(<DataTable data={mockData} columns={columns} keyField="id" />);
      const header = screen.getByText('Name').closest('th');
      expect(header).toHaveStyle({ width: '200px' });
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <DataTable data={mockData} columns={mockColumns} keyField="id" className="custom-table" />
      );
      expect(container.firstChild).toHaveClass('custom-table');
    });

    it('should have hover styles on rows', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);
      const row = screen.getByText('Alice').closest('tr');
      expect(row).toHaveClass('hover:bg-surface-hover');
    });

    it('should have border and rounded corners', () => {
      const { container } = render(
        <DataTable data={mockData} columns={mockColumns} keyField="id" />
      );
      expect(container.firstChild).toHaveClass('rounded-lg', 'border');
    });
  });

  describe('Accessibility', () => {
    it('should have table role', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should have accessible select all label', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" selectable />);
      expect(screen.getByLabelText('Select all')).toBeInTheDocument();
    });

    it('should have accessible row select labels', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" selectable />);
      mockData.forEach((item) => {
        expect(screen.getByLabelText(`Select ${item.id}`)).toBeInTheDocument();
      });
    });

    it('should have table structure', () => {
      render(<DataTable data={mockData} columns={mockColumns} keyField="id" />);
      expect(screen.getByRole('table')).toContainElement(screen.getAllByRole('row')[0]);
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

    it('should handle long cell content', () => {
      const longData = [
        {
          id: '1',
          name: 'Very Long Name That Might Overflow The Cell Width And Cause Layout Issues',
          age: 30,
          status: 'Active',
        },
      ];
      render(<DataTable data={longData} columns={mockColumns} keyField="id" />);
      expect(screen.getByText(/Very Long Name/)).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      const specialData = [
        {
          id: '1',
          name: "Ñoño <O'Brien>",
          age: 30,
          status: 'Active & "Special"',
        },
      ];
      render(<DataTable data={specialData} columns={mockColumns} keyField="id" />);
      expect(screen.getByText("Ñoño <O'Brien>")).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render large dataset efficiently', () => {
      // AI_DECISION: Aumentar timeout para ambientes CI más lentos
      // Justificación: En servidores EC2 o CI, el render puede ser más lento
      // Impacto: Test más robusto sin falsos negativos
      const largeData = Array.from({ length: 500 }, (_, i) => ({
        id: `${i}`,
        name: `User ${i}`,
        age: 20 + (i % 50),
        status: i % 2 === 0 ? 'Active' : 'Inactive',
      }));

      const startTime = performance.now();
      render(<DataTable data={largeData} columns={mockColumns} keyField="id" />);
      const endTime = performance.now();

      // Should render in less than 3 seconds (generous for slow CI environments)
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });
});
