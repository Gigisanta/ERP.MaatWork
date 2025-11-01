import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import type { SidebarSection, SidebarProps } from './Sidebar';
import type { ComponentProps } from 'react';

/**
 * Tipo para LinkComponent basado en SidebarProps
 */
type LinkComponentProps = NonNullable<SidebarProps['LinkComponent']> extends React.ComponentType<infer P> ? P : never;

const mockSections: SidebarSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'Home', badge: 3 },
      { label: 'Analytics', href: '/analytics', icon: 'BarChart3' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Profile', href: '/profile', icon: 'User' },
      { label: 'Preferences', href: '/preferences' },
    ],
  },
];

const MockLink = ({ href, className, children, ...props }: LinkComponentProps & ComponentProps<'a'>) => (
  <a href={href} className={className} {...props}>
    {children}
  </a>
);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Sidebar Component', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render sidebar', () => {
      const { container } = render(
        <Sidebar sections={mockSections} LinkComponent={MockLink} />
      );
      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('should render all sections', () => {
      render(<Sidebar sections={mockSections} LinkComponent={MockLink} />);
      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render all section items', () => {
      render(<Sidebar sections={mockSections} LinkComponent={MockLink} />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });

    it('should render icons when provided', () => {
      const { container } = render(
        <Sidebar sections={mockSections} LinkComponent={MockLink} />
      );
      const icons = container.querySelectorAll('span');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render badges when provided', () => {
      render(<Sidebar sections={mockSections} LinkComponent={MockLink} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render logo when provided', () => {
      render(
        <Sidebar
          sections={mockSections}
          logo={<div data-testid="logo">Logo</div>}
          LinkComponent={MockLink}
        />
      );
      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('should render toggle button', () => {
      render(<Sidebar sections={mockSections} LinkComponent={MockLink} />);
      const toggleButton = screen.getByLabelText(/collapse sidebar/i);
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Collapsed State', () => {
    it('should be expanded by default', () => {
      const { container } = render(
        <Sidebar sections={mockSections} LinkComponent={MockLink} />
      );
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('w-64');
    });

    it('should be collapsed when defaultCollapsed is true', () => {
      const { container } = render(
        <Sidebar sections={mockSections} defaultCollapsed={true} LinkComponent={MockLink} />
      );
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('w-16');
    });

    it('should toggle collapsed state on button click', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Sidebar sections={mockSections} LinkComponent={MockLink} />
      );

      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('w-64');

      const toggleButton = screen.getByLabelText(/collapse sidebar/i);
      await user.click(toggleButton);

      expect(sidebar).toHaveClass('w-16');
    });

    it('should hide section titles when collapsed', () => {
      render(<Sidebar sections={mockSections} defaultCollapsed={true} LinkComponent={MockLink} />);

      expect(screen.queryByText('Main')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should hide item labels when collapsed', () => {
      render(<Sidebar sections={mockSections} defaultCollapsed={true} LinkComponent={MockLink} />);

      // Labels should not be visible when collapsed
      const labels = screen.queryAllByText('Dashboard');
      expect(labels.length).toBeLessThan(2);
    });

    it('should hide logo when collapsed', () => {
      render(
        <Sidebar
          sections={mockSections}
          logo={<div data-testid="logo">Logo</div>}
          defaultCollapsed={true}
          LinkComponent={MockLink}
        />
      );
      expect(screen.queryByTestId('logo')).not.toBeInTheDocument();
    });

    it('should change toggle button label when collapsed', () => {
      render(<Sidebar sections={mockSections} defaultCollapsed={true} LinkComponent={MockLink} />);
      const toggleButton = screen.getByLabelText(/expand sidebar/i);
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Controlled State', () => {
    it('should use controlled collapsed prop', () => {
      const { container } = render(
        <Sidebar sections={mockSections} collapsed={true} LinkComponent={MockLink} />
      );
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('w-16');
    });

    it('should call onCollapse when toggle button is clicked', async () => {
      const handleCollapse = vi.fn();
      const user = userEvent.setup();

      render(
        <Sidebar
          sections={mockSections}
          collapsed={false}
          onCollapse={handleCollapse}
          LinkComponent={MockLink}
        />
      );

      const toggleButton = screen.getByLabelText(/collapse sidebar/i);
      await user.click(toggleButton);

      expect(handleCollapse).toHaveBeenCalledWith(true);
    });
  });

  describe('Active State', () => {
    it('should highlight active item', () => {
      render(
        <Sidebar
          sections={mockSections}
          currentPath="/dashboard"
          LinkComponent={MockLink}
        />
      );
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveClass('bg-primary', 'text-text-inverse');
    });

    it('should not highlight inactive items', () => {
      render(
        <Sidebar
          sections={mockSections}
          currentPath="/dashboard"
          LinkComponent={MockLink}
        />
      );
      const analyticsLink = screen.getByText('Analytics').closest('a');
      expect(analyticsLink).toHaveClass('text-text-secondary');
    });

    it('should set aria-current on active item', () => {
      render(
        <Sidebar
          sections={mockSections}
          currentPath="/analytics"
          LinkComponent={MockLink}
        />
      );
      const analyticsLink = screen.getByText('Analytics').closest('a');
      expect(analyticsLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Badge Styling', () => {
    it('should style badge differently for active item', () => {
      render(
        <Sidebar
          sections={mockSections}
          currentPath="/dashboard"
          LinkComponent={MockLink}
        />
      );
      const badge = screen.getByText('3');
      expect(badge).toHaveClass('bg-text-inverse/20', 'text-text-inverse');
    });

    it('should style badge normally for inactive item', () => {
      render(
        <Sidebar
          sections={mockSections}
          currentPath="/analytics"
          LinkComponent={MockLink}
        />
      );
      const badge = screen.getByText('3');
      expect(badge).toHaveClass('bg-primary', 'text-text-inverse');
    });
  });

  describe('Accessibility', () => {
    it('should have role="navigation"', () => {
      render(<Sidebar sections={mockSections} LinkComponent={MockLink} />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have accessible toggle button', () => {
      render(<Sidebar sections={mockSections} LinkComponent={MockLink} />);
      const button = screen.getByLabelText(/sidebar/i);
      expect(button).toBeInTheDocument();
    });

    it('should show title on collapsed items', () => {
      render(
        <Sidebar
          sections={mockSections}
          defaultCollapsed={true}
          LinkComponent={MockLink}
        />
      );
      const dashboardLink = screen.getByTitle('Dashboard');
      expect(dashboardLink).toBeInTheDocument();
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should save collapsed state to localStorage', async () => {
      const user = userEvent.setup();
      render(<Sidebar sections={mockSections} LinkComponent={MockLink} />);

      const toggleButton = screen.getByLabelText(/collapse sidebar/i);
      await user.click(toggleButton);

      expect(localStorageMock.getItem('sidebar-collapsed')).toBe('true');
    });

    it('should load collapsed state from localStorage', () => {
      localStorageMock.setItem('sidebar-collapsed', 'true');

      const { container } = render(
        <Sidebar sections={mockSections} LinkComponent={MockLink} />
      );
      
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('w-16');
    });

    it('should not persist state when controlled', async () => {
      const user = userEvent.setup();
      const handleCollapse = vi.fn();

      render(
        <Sidebar
          sections={mockSections}
          collapsed={false}
          onCollapse={handleCollapse}
          LinkComponent={MockLink}
        />
      );

      const toggleButton = screen.getByLabelText(/collapse sidebar/i);
      await user.click(toggleButton);

      // Should not write to localStorage when controlled
      expect(localStorageMock.getItem('sidebar-collapsed')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections', () => {
      const { container } = render(
        <Sidebar sections={[]} LinkComponent={MockLink} />
      );
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('should handle sections without titles', () => {
      const sectionsNoTitles: SidebarSection[] = [
        {
          items: [{ label: 'Item 1', href: '/item1' }],
        },
      ];
      render(<Sidebar sections={sectionsNoTitles} LinkComponent={MockLink} />);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('should handle items without icons', () => {
      render(<Sidebar sections={mockSections} LinkComponent={MockLink} />);
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });

    it('should handle items without badges', () => {
      render(<Sidebar sections={mockSections} LinkComponent={MockLink} />);
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });

    it('should handle long labels', () => {
      const longLabelSections: SidebarSection[] = [
        {
          items: [
            {
              label: 'This is a very long label that might overflow',
              href: '/long',
            },
          ],
        },
      ];
      render(<Sidebar sections={longLabelSections} LinkComponent={MockLink} />);
      expect(screen.getByText(/This is a very long label/)).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <Sidebar
          sections={mockSections}
          className="custom-sidebar"
          LinkComponent={MockLink}
        />
      );
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('custom-sidebar');
    });
  });

  describe('Transitions', () => {
    it('should have transition classes', () => {
      const { container } = render(
        <Sidebar sections={mockSections} LinkComponent={MockLink} />
      );
      const sidebar = container.firstChild as HTMLElement;
      expect(sidebar).toHaveClass('transition-all', 'duration-300');
    });
  });
});

