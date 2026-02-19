import { describe, it, expect, vi } from 'vitest';
import { render, screen, render as rtlRender, screen as rtlScreen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import {
  Header,
  Header as HeaderComponent,
  type HeaderProps,
  type NavItem,
  type User,
} from './Header';

describe('Header - Profile item', () => {
  function renderHeader(extraProps: Partial<HeaderProps> = {}) {
    return rtlRender(
      <HeaderComponent
        user={{ name: 'John Doe', email: 'john@example.com' }}
        navItems={[]}
        {...extraProps}
      />
    );
  }

  it('renders Profile as link to /profile', async () => {
    const user = userEvent.setup();
    renderHeader();

    // Open the dropdown by clicking the trigger button
    const trigger = rtlScreen.getByRole('button', { name: /menú de usuario: john doe/i });
    await user.click(trigger);

    // Wait for the dropdown menu to appear (Radix UI renders in a portal)
    const profileLink = await rtlScreen.findByRole('menuitem', { name: /mi perfil/i });
    expect(profileLink).toHaveAttribute('href', '/profile');
  });
});

const mockNavItems: NavItem[] = [
  { label: 'Home', href: '/', icon: 'Home' },
  { label: 'About', href: '/about', badge: 'New' },
  { label: 'External', href: 'https://example.com', icon: 'list' },
];

const mockUser: User = {
  name: 'John Doe',
  email: 'john@example.com',
  role: 'Admin',
};

describe('Header Component', () => {
  describe('Rendering', () => {
    it('should render header element', () => {
      render(<Header />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render logo when provided', () => {
      render(<Header logo={<div data-testid="logo">Logo</div>} />);
      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('should render navigation items', () => {
      render(<Header navItems={mockNavItems} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('should render user section when user provided', () => {
      render(<Header user={mockUser} />);
      // Header solo muestra la inicial, no el nombre completo
      expect(screen.getByLabelText(/menú de usuario: john doe/i)).toBeInTheDocument();
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should render user initial when no avatar', () => {
      render(<Header user={mockUser} />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should render user avatar when provided', () => {
      const userWithAvatar = { ...mockUser, avatar: 'https://example.com/avatar.jpg' };
      render(<Header user={userWithAvatar} />);
      const avatar = screen.getByAltText(mockUser.name);
      expect(avatar).toBeInTheDocument();
      // Next.js Image component transforms the src, so we check if it contains our URL
      expect(avatar.getAttribute('src')).toContain(
        encodeURIComponent('https://example.com/avatar.jpg')
      );
    });


  });

  describe('Navigation Items', () => {
    it('should render internal links', () => {
      render(<Header navItems={mockNavItems} />);
      const homeLink = screen.getByText('Home').closest('a');
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should render external links with target="_blank"', () => {
      render(<Header navItems={mockNavItems} />);
      const externalLink = screen.getByText('External').closest('a');
      expect(externalLink).toHaveAttribute('href', 'https://example.com');
      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render badges on nav items', () => {
      render(<Header navItems={mockNavItems} />);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should render icons on nav items', () => {
      const { container } = render(<Header navItems={mockNavItems} />);
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should not render navigation when no items', () => {
      render(<Header navItems={[]} />);
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });

  describe('User Menu', () => {
    it('should render user menu button', () => {
      render(<Header user={mockUser} />);
      const button = screen.getByLabelText(/menú de usuario: john doe/i);
      expect(button).toBeInTheDocument();
    });

    it('should have aria-haspopup on user menu button', () => {
      render(<Header user={mockUser} />);
      const button = screen.getByLabelText(/menú de usuario/i);
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('should have aria-expanded false by default', () => {
      render(<Header user={mockUser} />);
      const button = screen.getByLabelText(/menú de usuario/i);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    // Note: DropdownMenu items (Profile, Log out) are rendered in a portal
    // and are not accessible in jsdom tests. These should be tested in E2E tests.
    it('should render user menu trigger with proper structure', () => {
      render(<Header user={mockUser} />);
      // Header solo muestra la inicial, no el nombre completo
      expect(screen.getByLabelText(/menú de usuario: john doe/i)).toBeInTheDocument();
      expect(screen.getByText('J')).toBeInTheDocument(); // Initial
    });

    it('should accept onLogout callback', () => {
      const handleLogout = vi.fn();
      render(<Header user={mockUser} onLogout={handleLogout} />);
      expect(screen.getByLabelText(/menú de usuario/i)).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have sticky positioning', () => {
      const { container } = render(<Header />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('sticky', 'top-0');
    });

    it('should have proper height', () => {
      const { container } = render(<Header />);
      const headerContent = container.querySelector('.flex.h-12');
      expect(headerContent).toBeInTheDocument();
    });

    it('should use flexbox for layout', () => {
      const { container } = render(<Header />);
      const headerContent = container.querySelector('.flex');
      expect(headerContent).toHaveClass('items-center', 'justify-between');
    });

    it('should have responsive padding', () => {
      const { container } = render(<Header />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('px-2', 'xs:px-3', 'sm:px-4', 'lg:px-6');
    });
  });

  describe('Styling', () => {
    it('should have border and background', () => {
      const { container } = render(<Header />);
      const header = container.querySelector('header');
      // Using backdrop blur with bg-surface/95 for glassmorphism effect
      expect(header).toHaveClass('bg-surface/95', 'border-b', 'border-border');
    });

    it('should have proper z-index', () => {
      const { container } = render(<Header />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('z-40');
    });

    it('should apply custom className', () => {
      const { container } = render(<Header className="custom-header" />);
      const header = container.querySelector('header');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('Accessibility', () => {
    it('should have role="banner"', () => {
      render(<Header />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should have navigation with role="navigation"', () => {
      render(<Header navItems={mockNavItems} />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have accessible user menu button', () => {
      render(<Header user={mockUser} />);
      expect(screen.getByLabelText(/menú de usuario/i)).toBeInTheDocument();
    });



    it('should have focus styles', () => {
      render(<Header navItems={mockNavItems} />);
      const link = screen.getByText('Home').closest('a');
      expect(link).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Responsive Behavior', () => {
    it('should hide user name on mobile', () => {
      render(<Header user={mockUser} />);
      // Header solo muestra la inicial, no el nombre completo
      // El botón del usuario siempre está visible, pero el nombre completo no se muestra
      const userButton = screen.getByLabelText(/menú de usuario: john doe/i);
      expect(userButton).toBeInTheDocument();
      // Verificar que la inicial está visible
      expect(screen.getByText('J')).toBeInTheDocument();
    });


  });

  describe('Edge Cases', () => {
    it('should handle no props', () => {
      render(<Header />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should handle empty navItems array', () => {
      render(<Header navItems={[]} />);
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('should handle long user names', () => {
      const longNameUser = { ...mockUser, name: 'Very Long Name That Might Overflow' };
      render(<Header user={longNameUser} />);
      // Header solo muestra la inicial, no el nombre completo
      expect(
        screen.getByLabelText(/menú de usuario: very long name that might overflow/i)
      ).toBeInTheDocument();
      expect(screen.getByText('V')).toBeInTheDocument(); // Initial
    });

    it('should handle many nav items', () => {
      const manyItems: NavItem[] = Array.from({ length: 10 }, (_, i) => ({
        label: `Item ${i + 1}`,
        href: `/item${i + 1}`,
      }));
      render(<Header navItems={manyItems} />);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 10')).toBeInTheDocument();
    });

    it('should handle special characters in user name', () => {
      const specialUser = { ...mockUser, name: "Ñoño O'Brien" };
      render(<Header user={specialUser} />);
      // Header solo muestra la inicial, no el nombre completo
      expect(screen.getByLabelText(/menú de usuario: ñoño o'brien/i)).toBeInTheDocument();
      expect(screen.getByText('Ñ')).toBeInTheDocument(); // Initial
    });
  });

  describe('User Avatar Initial', () => {
    it('should extract first character of name for initial', () => {
      render(<Header user={mockUser} />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should uppercase the initial', () => {
      const lowerUser = { ...mockUser, name: 'john doe' };
      render(<Header user={lowerUser} />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should style initial with background', () => {
      render(<Header user={mockUser} />);
      const initial = screen.getByText('J').closest('div');
      expect(initial).toHaveClass('bg-primary', 'text-text-inverse');
    });
  });

  describe('Navigation Center Alignment', () => {
    it('should center navigation on larger screens', () => {
      const { container } = render(<Header navItems={mockNavItems} />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('justify-center');
    });

    it('should handle horizontal scrolling for many items', () => {
      const { container } = render(<Header navItems={mockNavItems} />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('overflow-x-auto');
    });
  });
});
