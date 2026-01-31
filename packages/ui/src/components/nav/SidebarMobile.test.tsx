import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import { mockSections, MockLink } from './Sidebar/SidebarTestUtils';

describe('Sidebar Mobile Component', () => {
  it('should render in mobile mode when onOpenChange is provided', () => {
    render(
      <Sidebar
        sections={mockSections}
        LinkComponent={MockLink}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );
    // Mobile header should be visible
    expect(screen.getByText('Maat')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('should have mobile styling classes', () => {
    const { container } = render(
      <Sidebar
        sections={mockSections}
        LinkComponent={MockLink}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );
    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar).toHaveClass('w-full');
    expect(sidebar).not.toHaveClass('border-r'); // Border only on desktop
  });

  it('should show close button in mobile mode', () => {
    render(
      <Sidebar
        sections={mockSections}
        LinkComponent={MockLink}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Cerrar menú')).toBeInTheDocument();
  });

  it('should call onOpenChange(false) when close button is clicked', async () => {
    const handleOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Sidebar
        sections={mockSections}
        LinkComponent={MockLink}
        isOpen={true}
        onOpenChange={handleOpenChange}
      />
    );

    const closeButton = screen.getByLabelText('Cerrar menú');
    await user.click(closeButton);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('should close sidebar when clicking an item in mobile mode', async () => {
    const handleOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Sidebar
        sections={mockSections}
        LinkComponent={MockLink}
        isOpen={true}
        onOpenChange={handleOpenChange}
      />
    );

    const dashboardLink = screen.getByText('Dashboard');
    await user.click(dashboardLink);

    expect(handleOpenChange).toHaveBeenCalled();
  });

  it('should use larger touch targets in mobile mode', () => {
    render(
      <Sidebar
        sections={mockSections}
        LinkComponent={MockLink}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );
    
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('px-4', 'py-3.5', 'min-h-[52px]');
  });
});
