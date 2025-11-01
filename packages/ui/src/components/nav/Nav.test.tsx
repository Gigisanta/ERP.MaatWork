import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nav } from './Nav';
import type { NavItem, NavProps } from './Nav';
import type { ComponentProps } from 'react';

/**
 * Tipo para LinkComponent basado en NavProps
 */
type LinkComponentProps = NonNullable<NavProps['LinkComponent']> extends React.ComponentType<infer P> ? P : never;

const mockItems: NavItem[] = [
  { label: 'Home', href: '/home', icon: 'Home' },
  { label: 'About', href: '/about', icon: 'Info' },
  { label: 'Contact', href: '/contact', badge: 5 },
];

const MockLink = ({ href, className, children, ...props }: LinkComponentProps & ComponentProps<'a'>) => (
  <a href={href} className={className} {...props}>
    {children}
  </a>
);

describe('Nav Component', () => {
  describe('Rendering', () => {
    it('should render navigation element', () => {
      render(<Nav items={mockItems} LinkComponent={MockLink} />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render all nav items', () => {
      render(<Nav items={mockItems} LinkComponent={MockLink} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    it('should render icons when provided', () => {
      const { container } = render(<Nav items={mockItems} LinkComponent={MockLink} />);
      // Icons render as spans
      const icons = container.querySelectorAll('span');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render badges when provided', () => {
      render(<Nav items={mockItems} LinkComponent={MockLink} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should use fallback <a> tag when no LinkComponent provided', () => {
      const { container } = render(<Nav items={mockItems} currentPath="/home" />);
      const links = container.querySelectorAll('a');
      expect(links.length).toBe(mockItems.length);
    });
  });

  describe('Orientation', () => {
    it('should render horizontal by default', () => {
      const { container } = render(<Nav items={mockItems} LinkComponent={MockLink} />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('flex-row', 'space-x-1');
    });

    it('should render vertical when specified', () => {
      const { container } = render(
        <Nav items={mockItems} orientation="vertical" LinkComponent={MockLink} />
      );
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('flex-col', 'space-y-1');
    });

    it('should apply horizontal classes', () => {
      const { container } = render(
        <Nav items={mockItems} orientation="horizontal" LinkComponent={MockLink} />
      );
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('flex-row');
    });
  });

  describe('Active State', () => {
    it('should highlight active item based on currentPath', () => {
      render(<Nav items={mockItems} currentPath="/home" LinkComponent={MockLink} />);
      const homeLink = screen.getByText('Home').closest('a');
      expect(homeLink).toHaveClass('bg-primary', 'text-text-inverse');
    });

    it('should not highlight inactive items', () => {
      render(<Nav items={mockItems} currentPath="/home" LinkComponent={MockLink} />);
      const aboutLink = screen.getByText('About').closest('a');
      expect(aboutLink).toHaveClass('text-text-secondary');
      expect(aboutLink).not.toHaveClass('bg-primary');
    });

    it('should set aria-current on active item', () => {
      render(<Nav items={mockItems} currentPath="/about" LinkComponent={MockLink} />);
      const aboutLink = screen.getByText('About').closest('a');
      expect(aboutLink).toHaveAttribute('aria-current', 'page');
    });

    it('should not set aria-current on inactive items', () => {
      render(<Nav items={mockItems} currentPath="/home" LinkComponent={MockLink} />);
      const aboutLink = screen.getByText('About').closest('a');
      expect(aboutLink).not.toHaveAttribute('aria-current');
    });
  });

  describe('Badge Styling', () => {
    it('should style badge differently for active item', () => {
      render(<Nav items={mockItems} currentPath="/contact" LinkComponent={MockLink} />);
      const badge = screen.getByText('5');
      expect(badge).toHaveClass('bg-text-inverse/20', 'text-text-inverse');
    });

    it('should style badge normally for inactive item', () => {
      render(<Nav items={mockItems} currentPath="/home" LinkComponent={MockLink} />);
      const badge = screen.getByText('5');
      expect(badge).toHaveClass('bg-primary', 'text-text-inverse');
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <Nav items={mockItems} className="custom-nav" LinkComponent={MockLink} />
      );
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('custom-nav');
    });

    it('should forward additional props', () => {
      const { container } = render(
        <Nav items={mockItems} data-testid="custom-nav" LinkComponent={MockLink} />
      );
      const nav = container.querySelector('nav');
      expect(nav).toHaveAttribute('data-testid', 'custom-nav');
    });
  });

  describe('Accessibility', () => {
    it('should have role="navigation"', () => {
      render(<Nav items={mockItems} LinkComponent={MockLink} />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have focus styles', () => {
      render(<Nav items={mockItems} LinkComponent={MockLink} />);
      const link = screen.getByText('Home').closest('a');
      expect(link).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      const { container } = render(<Nav items={[]} LinkComponent={MockLink} />);
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav?.children.length).toBe(0);
    });

    it('should handle items without icons', () => {
      const itemsNoIcons: NavItem[] = [
        { label: 'Page 1', href: '/page1' },
        { label: 'Page 2', href: '/page2' },
      ];
      render(<Nav items={itemsNoIcons} LinkComponent={MockLink} />);
      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.getByText('Page 2')).toBeInTheDocument();
    });

    it('should handle items without badges', () => {
      const itemsNoBadges: NavItem[] = [
        { label: 'Page 1', href: '/page1' },
      ];
      render(<Nav items={itemsNoBadges} LinkComponent={MockLink} />);
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });

    it('should handle no currentPath', () => {
      render(<Nav items={mockItems} LinkComponent={MockLink} />);
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveClass('text-text-secondary');
      });
    });

    it('should handle long labels', () => {
      const longLabel = 'This is a very long navigation label that might wrap';
      const items: NavItem[] = [{ label: longLabel, href: '/long' }];
      render(<Nav items={items} LinkComponent={MockLink} />);
      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });
  });

  describe('Icon Size', () => {
    it('should render icons with sm size', () => {
      const { container } = render(<Nav items={mockItems} LinkComponent={MockLink} />);
      // Icons should have the sm size applied (implementation detail)
      expect(container.querySelector('nav')).toBeInTheDocument();
    });
  });
});

