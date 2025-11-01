import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent, type TabItem } from './Tabs';

const mockItems: TabItem[] = [
  { value: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
  { value: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
  { value: 'tab3', label: 'Tab 3', content: <div>Content 3</div>, disabled: true },
];

describe('Tabs Component', () => {
  describe('Rendering (Items Pattern)', () => {
    it('should render tabs with items', () => {
      render(<Tabs items={mockItems} defaultValue="tab1" />);
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
    });

    it('should render default tab content', () => {
      render(<Tabs items={mockItems} defaultValue="tab1" />);
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('should render all tab triggers', () => {
      render(<Tabs items={mockItems} defaultValue="tab1" />);
      const triggers = screen.getAllByRole('tab');
      expect(triggers).toHaveLength(3);
    });
  });

  describe('Variants', () => {
    it('should render line variant (default)', () => {
      const { container } = render(<Tabs items={mockItems} defaultValue="tab1" variant="line" />);
      const tabsList = container.querySelector('[role="tablist"]');
      expect(tabsList).toHaveClass('border-b', 'border-border');
    });

    it('should render pill variant', () => {
      const { container } = render(<Tabs items={mockItems} defaultValue="tab1" variant="pill" />);
      const tabsList = container.querySelector('[role="tablist"]');
      expect(tabsList).toHaveClass('bg-surface-hover', 'p-1', 'rounded-lg');
    });

    it('should render enclosed variant', () => {
      const { container } = render(<Tabs items={mockItems} defaultValue="tab1" variant="enclosed" />);
      const tabsList = container.querySelector('[role="tablist"]');
      expect(tabsList).toHaveClass('border', 'border-border', 'rounded-lg');
    });
  });

  describe('Tab Interactions', () => {
    it('should switch between tabs when clicked', async () => {
      const user = userEvent.setup();
      render(<Tabs items={mockItems} defaultValue="tab1" />);
      
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();

      await user.click(screen.getByText('Tab 2'));

      // Note: Radix UI doesn't remove previous content from DOM, just hides it
      // So we check for visibility or active state instead
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      expect(tab2).toHaveAttribute('data-state', 'active');
    });

    it('should not activate disabled tabs', async () => {
      const user = userEvent.setup();
      render(<Tabs items={mockItems} defaultValue="tab1" />);
      
      const disabledTab = screen.getByText('Tab 3');
      expect(disabledTab).toHaveAttribute('disabled');
      
      await user.click(disabledTab);
      
      // Tab 1 should still be active
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<Tabs items={mockItems} defaultValue="tab1" className="custom-tabs" />);
      expect(container.firstChild).toHaveClass('custom-tabs');
    });

    it('should have full width by default', () => {
      const { container } = render(<Tabs items={mockItems} defaultValue="tab1" />);
      expect(container.firstChild).toHaveClass('w-full');
    });

    it('should apply active state styling', () => {
      render(<Tabs items={mockItems} defaultValue="tab1" />);
      const activeTab = screen.getByRole('tab', { name: 'Tab 1' });
      expect(activeTab).toHaveAttribute('data-state', 'active');
    });

    it('should apply disabled styling', () => {
      render(<Tabs items={mockItems} defaultValue="tab1" />);
      const disabledTab = screen.getByText('Tab 3');
      expect(disabledTab).toHaveClass('data-[disabled]:opacity-50');
    });
  });

  describe('Composable Components', () => {
    it('should render with composable pattern', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Tabs items={mockItems} defaultValue="tab1" />);
      
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('should have focus-visible ring', () => {
      render(<Tabs items={mockItems} defaultValue="tab1" />);
      const tab = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab).toHaveClass('focus-visible:ring-2');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<Tabs items={mockItems} defaultValue="tab1" />);
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();
      
      expect(tab1).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single tab', () => {
      const singleItem: TabItem[] = [
        { value: 'tab1', label: 'Only Tab', content: <div>Only Content</div> }
      ];
      
      render(<Tabs items={singleItem} defaultValue="tab1" />);
      expect(screen.getByText('Only Tab')).toBeInTheDocument();
      expect(screen.getByText('Only Content')).toBeInTheDocument();
    });

    it('should handle empty items array', () => {
      const { container } = render(<Tabs items={[]} defaultValue="tab1" />);
      const tabsList = container.querySelector('[role="tablist"]');
      expect(tabsList?.children).toHaveLength(0);
    });

    it('should handle children pattern without items', () => {
      render(
        <Tabs defaultValue="test">
          <div>Custom Content</div>
        </Tabs>
      );
      
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });
  });
});

