import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from './Alert';

describe('Alert Component', () => {
  describe('Rendering', () => {
    it('should render alert with children', () => {
      render(<Alert>Alert message</Alert>);
      expect(screen.getByText('Alert message')).toBeInTheDocument();
    });

    it('should render with title', () => {
      render(<Alert title="Important">Message</Alert>);
      expect(screen.getByText('Important')).toBeInTheDocument();
      expect(screen.getByText('Message')).toBeInTheDocument();
    });

    it('should render with default variant (info)', () => {
      render(<Alert>Info alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-info', 'bg-info-subtle');
    });

    it('should have role alert', () => {
      render(<Alert>Alert</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply info variant classes', () => {
      render(<Alert variant="info">Info</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-info', 'bg-info-subtle', 'text-text');
    });

    it('should apply success variant classes', () => {
      render(<Alert variant="success">Success</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-success', 'bg-success-subtle', 'text-text');
    });

    it('should apply warning variant classes', () => {
      render(<Alert variant="warning">Warning</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-warning', 'bg-warning-subtle', 'text-text');
    });

    it('should apply error variant classes', () => {
      render(<Alert variant="error">Error</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-error', 'bg-error-subtle', 'text-text');
    });
  });

  describe('Icon', () => {
    it('should hide icon when icon prop is false', () => {
      const { container } = render(<Alert icon={false}>Without icon</Alert>);
      // When icon is false, no Icon component should be rendered
      expect(container.querySelector('.flex-shrink-0')).not.toBeInTheDocument();
    });

    it('should show icon container by default', () => {
      const { container } = render(<Alert>With icon</Alert>);
      // Icon component wraps in a div with flex-shrink-0 class
      expect(container.querySelector('.flex-shrink-0')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      render(<Alert className="custom-alert">Custom</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('custom-alert');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Alert ref={ref}>With Ref</Alert>);
      expect(ref.current).not.toBeNull();
    });

    it('should accept HTML div attributes', () => {
      render(<Alert data-testid="test-alert">Data Attr</Alert>);
      expect(screen.getByTestId('test-alert')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have base styling classes', () => {
      render(<Alert>Styled Alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('relative', 'w-full', 'rounded-lg', 'border', 'p-4');
    });

    it('should have flex layout for content', () => {
      const { container } = render(<Alert>Content</Alert>);
      const flexContainer = container.querySelector('.flex');
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass('flex', 'items-start', 'space-x-3');
    });
  });

  describe('Title and Content Layout', () => {
    it('should render title as h4', () => {
      const { container } = render(<Alert title="Alert Title">Content</Alert>);
      const title = container.querySelector('h4');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Alert Title');
    });

    it('should have proper spacing when title is present', () => {
      const { container } = render(<Alert title="Title">Content</Alert>);
      const title = container.querySelector('h4');
      expect(title).toHaveClass('mb-1');
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" for screen readers', () => {
      render(<Alert>Accessible alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('role', 'alert');
    });

    it('should be announced to screen readers', () => {
      render(<Alert variant="error">Critical error occurred</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toContainHTML('Critical error occurred');
    });
  });
});

describe('AlertTitle Component', () => {
  it('should render title with children', () => {
    render(<AlertTitle>Alert Title</AlertTitle>);
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
  });

  it('should render as h5 element', () => {
    const { container } = render(<AlertTitle>Title</AlertTitle>);
    const title = container.querySelector('h5');
    expect(title).toBeInTheDocument();
  });

  it('should have title styling', () => {
    const { container } = render(<AlertTitle>Title</AlertTitle>);
    const title = container.querySelector('h5');
    expect(title).toHaveClass('mb-1', 'font-semibold', 'leading-none', 'tracking-tight');
  });

  it('should accept custom className', () => {
    const { container } = render(<AlertTitle className="custom-title">Title</AlertTitle>);
    const title = container.querySelector('h5');
    expect(title).toHaveClass('custom-title');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLHeadingElement>();
    render(<AlertTitle ref={ref}>Title</AlertTitle>);
    expect(ref.current).not.toBeNull();
  });
});

describe('AlertDescription Component', () => {
  it('should render description with children', () => {
    render(<AlertDescription>Description text</AlertDescription>);
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('should render as div element', () => {
    const { container } = render(<AlertDescription>Description</AlertDescription>);
    const description = container.firstChild as HTMLElement;
    expect(description.tagName).toBe('DIV');
  });

  it('should have description styling', () => {
    const { container } = render(<AlertDescription>Description</AlertDescription>);
    const description = container.firstChild as HTMLElement;
    expect(description).toHaveClass('text-sm');
  });

  it('should accept custom className', () => {
    const { container } = render(
      <AlertDescription className="custom-desc">Description</AlertDescription>
    );
    const description = container.firstChild as HTMLElement;
    expect(description).toHaveClass('custom-desc');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<AlertDescription ref={ref}>Description</AlertDescription>);
    expect(ref.current).not.toBeNull();
  });
});

describe('Alert Composition', () => {
  it('should render complete alert with all subcomponents', () => {
    render(
      <Alert variant="success">
        <AlertTitle>Success!</AlertTitle>
        <AlertDescription>Your changes have been saved.</AlertDescription>
      </Alert>
    );

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Your changes have been saved.')).toBeInTheDocument();
  });

  it('should work with mixed content and subcomponents', () => {
    render(
      <Alert variant="info" title="Information">
        <AlertDescription>
          <p>First paragraph</p>
          <p>Second paragraph</p>
        </AlertDescription>
      </Alert>
    );

    expect(screen.getByText('Information')).toBeInTheDocument();
    expect(screen.getByText('First paragraph')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph')).toBeInTheDocument();
  });
});
