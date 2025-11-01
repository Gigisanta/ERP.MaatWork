import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from './Card';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render card with children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render with default variant (outlined)', () => {
      const { container } = render(<Card>Default Card</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border', 'border-border-default');
    });

    it('should render with default padding (md)', () => {
      const { container } = render(<Card>Padded Card</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-4');
    });
  });

  describe('Variants', () => {
    it('should apply outlined variant classes', () => {
      const { container } = render(<Card variant="outlined">Outlined</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border', 'border-border-default', 'bg-bg-surface');
    });

    it('should apply elevated variant classes', () => {
      const { container } = render(<Card variant="elevated">Elevated</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('shadow-md', 'bg-bg-surface');
    });

    it('should apply interactive variant classes', () => {
      const { container } = render(<Card variant="interactive">Interactive</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('hover:shadow-md', 'cursor-pointer');
    });
  });

  describe('Padding', () => {
    it('should apply no padding', () => {
      const { container } = render(<Card padding="none">No Padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('p-3', 'p-4', 'p-6');
    });

    it('should apply small padding', () => {
      const { container } = render(<Card padding="sm">Small Padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-3');
    });

    it('should apply medium padding', () => {
      const { container } = render(<Card padding="md">Medium Padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-4');
    });

    it('should apply large padding', () => {
      const { container } = render(<Card padding="lg">Large Padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-6');
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      const { container } = render(<Card className="custom-card">Custom</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-card');
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>With Ref</Card>);
      expect(ref.current).not.toBeNull();
    });

    it('should accept HTML div attributes', () => {
      const { container } = render(<Card data-testid="test-card">Data Attr</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('data-testid', 'test-card');
    });
  });

  describe('Styling', () => {
    it('should have rounded corners', () => {
      const { container } = render(<Card>Rounded</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-lg');
    });
  });
});

describe('CardHeader Component', () => {
  it('should render header with children', () => {
    render(<CardHeader>Header Content</CardHeader>);
    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('should have bottom margin', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('mb-4');
  });

  it('should accept custom className', () => {
    const { container } = render(<CardHeader className="custom-header">Header</CardHeader>);
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('custom-header');
  });

  it('should forward ref correctly', () => {
    const headerRef = React.createRef<HTMLDivElement>();
    render(<CardHeader ref={headerRef}>Header</CardHeader>);
    expect(headerRef.current).not.toBeNull();
  });
});

describe('CardTitle Component', () => {
  it('should render title with children', () => {
    render(<CardTitle>Title Text</CardTitle>);
    expect(screen.getByText('Title Text')).toBeInTheDocument();
  });

  it('should render as h3 element', () => {
    const { container } = render(<CardTitle>Title</CardTitle>);
    const title = container.querySelector('h3');
    expect(title).toBeInTheDocument();
  });

  it('should have title styling', () => {
    const { container } = render(<CardTitle>Title</CardTitle>);
    const title = container.querySelector('h3');
    expect(title).toHaveClass('text-lg', 'font-semibold', 'text-text-primary');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLHeadingElement>();
    render(<CardTitle ref={ref}>Title</CardTitle>);
    expect(ref.current).not.toBeNull();
  });
});

describe('CardDescription Component', () => {
  it('should render description with children', () => {
    render(<CardDescription>Description text</CardDescription>);
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('should render as paragraph element', () => {
    const { container } = render(<CardDescription>Description</CardDescription>);
    const description = container.querySelector('p');
    expect(description).toBeInTheDocument();
  });

  it('should have description styling', () => {
    const { container } = render(<CardDescription>Description</CardDescription>);
    const description = container.querySelector('p');
    expect(description).toHaveClass('text-sm', 'text-text-secondary');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLParagraphElement>();
    render(<CardDescription ref={ref}>Description</CardDescription>);
    expect(ref.current).not.toBeNull();
  });
});

describe('CardContent Component', () => {
  it('should render content with children', () => {
    render(<CardContent>Content area</CardContent>);
    expect(screen.getByText('Content area')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(<CardContent className="custom-content">Content</CardContent>);
    const content = container.firstChild as HTMLElement;
    expect(content).toHaveClass('custom-content');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardContent ref={ref}>Content</CardContent>);
    expect(ref.current).not.toBeNull();
  });
});

describe('CardFooter Component', () => {
  it('should render footer with children', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('should have top margin and border', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    const footer = container.firstChild as HTMLElement;
    expect(footer).toHaveClass('mt-4', 'pt-4', 'border-t', 'border-border-default');
  });

  it('should accept custom className', () => {
    const { container } = render(<CardFooter className="custom-footer">Footer</CardFooter>);
    const footer = container.firstChild as HTMLElement;
    expect(footer).toHaveClass('custom-footer');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardFooter ref={ref}>Footer</CardFooter>);
    expect(ref.current).not.toBeNull();
  });
});

describe('Card Composition', () => {
  it('should render complete card with all subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description</CardDescription>
        </CardHeader>
        <CardContent>Main content goes here</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>
    );
    
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card description')).toBeInTheDocument();
    expect(screen.getByText('Main content goes here')).toBeInTheDocument();
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
  });
});

