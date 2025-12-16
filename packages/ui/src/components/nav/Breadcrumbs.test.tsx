import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs, type BreadcrumbItem, type LinkComponentProps } from './Breadcrumbs';

const mockItems: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Details' },
];

describe('Breadcrumbs Component', () => {
  describe('Rendering', () => {
    it('should render breadcrumb navigation', () => {
      render(<Breadcrumbs items={mockItems} />);
      const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
      expect(nav).toBeInTheDocument();
    });

    it('should render all breadcrumb items', () => {
      render(<Breadcrumbs items={mockItems} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('should render links for items with href', () => {
      render(<Breadcrumbs items={mockItems} />);
      const homeLink = screen.getByRole('link', { name: 'Home' });
      const productsLink = screen.getByRole('link', { name: 'Products' });

      expect(homeLink).toHaveAttribute('href', '/');
      expect(productsLink).toHaveAttribute('href', '/products');
    });

    it('should not render link for last item', () => {
      render(<Breadcrumbs items={mockItems} />);
      const detailsElement = screen.getByText('Details');
      expect(detailsElement.tagName).toBe('SPAN');
    });

    it('should mark last item as current page', () => {
      render(<Breadcrumbs items={mockItems} />);
      const lastItem = screen.getByText('Details');
      expect(lastItem).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Separators', () => {
    it('should render default separators between items', () => {
      const { container } = render(<Breadcrumbs items={mockItems} />);
      const separators = container.querySelectorAll('[aria-hidden="true"]');
      expect(separators).toHaveLength(2); // Between Home-Products and Products-Details
    });

    it('should not render separator before first item', () => {
      const { container } = render(<Breadcrumbs items={mockItems} />);
      const firstLi = container.querySelector('li');
      const separator = firstLi?.querySelector('[aria-hidden="true"]');
      expect(separator).not.toBeInTheDocument();
    });

    it('should render custom separator', () => {
      render(<Breadcrumbs items={mockItems} separator={<span>/</span>} />);
      const separators = screen.getAllByText('/');
      expect(separators).toHaveLength(2);
    });
  });

  describe('Custom Link Component', () => {
    it('should use custom LinkComponent when provided', () => {
      const CustomLink = ({ href, children, ...props }: LinkComponentProps) => (
        <a href={href} data-custom="true" {...props}>
          {children}
        </a>
      );

      render(<Breadcrumbs items={mockItems} LinkComponent={CustomLink} />);
      const homeLink = screen.getByRole('link', { name: 'Home' });
      expect(homeLink).toHaveAttribute('data-custom', 'true');
    });

    it('should use regular anchor when LinkComponent not provided', () => {
      render(<Breadcrumbs items={mockItems} />);
      const homeLink = screen.getByRole('link', { name: 'Home' });
      expect(homeLink.tagName).toBe('A');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<Breadcrumbs items={mockItems} className="custom-breadcrumb" />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('custom-breadcrumb');
    });

    it('should have base breadcrumb classes', () => {
      const { container } = render(<Breadcrumbs items={mockItems} />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('flex', 'items-center', 'space-x-1', 'text-sm');
    });

    it('should style last item differently', () => {
      render(<Breadcrumbs items={mockItems} />);
      const lastItem = screen.getByText('Details');
      expect(lastItem).toHaveClass('text-text', 'font-medium');
    });

    it('should have hover styles on links', () => {
      render(<Breadcrumbs items={mockItems} />);
      const homeLink = screen.getByRole('link', { name: 'Home' });
      expect(homeLink).toHaveClass('hover:text-text');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<Breadcrumbs items={mockItems} />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
    });

    it('should have ordered list structure', () => {
      const { container } = render(<Breadcrumbs items={mockItems} />);
      const ol = container.querySelector('ol');
      expect(ol).toBeInTheDocument();
      expect(ol?.querySelectorAll('li')).toHaveLength(3);
    });

    it('should have focus-visible ring on links', () => {
      render(<Breadcrumbs items={mockItems} />);
      const homeLink = screen.getByRole('link', { name: 'Home' });
      expect(homeLink).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single item', () => {
      render(<Breadcrumbs items={[{ label: 'Home' }]} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('should handle item without href', () => {
      render(<Breadcrumbs items={[{ label: 'Home' }, { label: 'Current' }]} />);
      const current = screen.getByText('Current');
      expect(current.tagName).toBe('SPAN');
    });

    it('should handle empty items array', () => {
      const { container } = render(<Breadcrumbs items={[]} />);
      const ol = container.querySelector('ol');
      expect(ol?.children).toHaveLength(0);
    });
  });
});
