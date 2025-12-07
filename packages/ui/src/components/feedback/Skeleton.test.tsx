import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonGroup, SkeletonCard, SkeletonTable } from './Skeleton';

describe('Skeleton', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('skeleton-wave');
      expect(skeleton).toHaveClass('bg-surface');
    });

    it('should be hidden from accessibility tree', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Variants', () => {
    it('should render text variant by default', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toHaveClass('rounded');
      expect(skeleton).toHaveClass('h-4');
    });

    it('should render circle variant', () => {
      const { container } = render(<Skeleton variant="circle" width={40} height={40} />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toHaveClass('rounded-full');
    });

    it('should render rectangle variant', () => {
      const { container } = render(<Skeleton variant="rectangle" />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toHaveClass('rounded-md');
    });
  });

  describe('Dimensions', () => {
    it('should accept width as number', () => {
      const { container } = render(<Skeleton width={200} />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton.style.width).toBe('200px');
    });

    it('should accept width as string', () => {
      const { container } = render(<Skeleton width="50%" />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton.style.width).toBe('50%');
    });

    it('should accept height as number', () => {
      const { container } = render(<Skeleton height={24} />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton.style.height).toBe('24px');
    });
  });

  describe('Multiple Lines', () => {
    it('should render multiple lines when lines > 1', () => {
      const { container } = render(<Skeleton lines={3} />);
      const wrapper = container.firstChild;
      
      expect(wrapper?.childNodes.length).toBe(3);
    });

    it('should make last line shorter for natural appearance', () => {
      const { container } = render(<Skeleton lines={2} />);
      const lines = container.firstChild?.childNodes;
      
      expect(lines?.[0]).toHaveStyle({ width: '100%' });
      expect(lines?.[1]).toHaveStyle({ width: '75%' });
    });
  });

  describe('Animation', () => {
    it('should animate by default', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild;
      
      // Default animation is 'wave', not 'pulse'
      expect(skeleton).toHaveClass('skeleton-wave');
    });

    it('should not animate when animate=false', () => {
      const { container } = render(<Skeleton animate={false} />);
      const skeleton = container.firstChild;
      
      expect(skeleton).not.toHaveClass('animate-pulse');
      expect(skeleton).not.toHaveClass('skeleton-wave');
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      const { container } = render(<Skeleton className="custom-class" />);
      const skeleton = container.firstChild;
      
      expect(skeleton).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<Skeleton ref={ref} />);
      
      expect(ref.current).not.toBeNull();
    });
  });
});

describe('SkeletonGroup', () => {
  it('should render children', () => {
    render(
      <SkeletonGroup>
        <Skeleton data-testid="child1" />
        <Skeleton data-testid="child2" />
      </SkeletonGroup>
    );
    
    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
  });

  it('should apply row direction by default', () => {
    const { container } = render(
      <SkeletonGroup>
        <Skeleton />
      </SkeletonGroup>
    );
    
    expect(container.firstChild).toHaveClass('flex-row');
  });

  it('should apply column direction when specified', () => {
    const { container } = render(
      <SkeletonGroup direction="column">
        <Skeleton />
      </SkeletonGroup>
    );
    
    expect(container.firstChild).toHaveClass('flex-col');
  });

  it('should apply gap classes', () => {
    const { container } = render(
      <SkeletonGroup gap="lg">
        <Skeleton />
      </SkeletonGroup>
    );
    
    expect(container.firstChild).toHaveClass('gap-4');
  });
});

describe('SkeletonCard', () => {
  it('should render with avatar by default', () => {
    const { container } = render(<SkeletonCard />);
    const avatar = container.querySelector('.rounded-full');
    
    expect(avatar).toBeInTheDocument();
  });

  it('should hide avatar when showAvatar=false', () => {
    const { container } = render(<SkeletonCard showAvatar={false} />);
    const avatar = container.querySelector('.rounded-full');
    
    expect(avatar).not.toBeInTheDocument();
  });

  it('should render correct number of text lines', () => {
    const { container } = render(<SkeletonCard lines={4} />);
    // 1 title + 3 text lines (lines - 1)
    const textSkeletons = container.querySelectorAll('.h-4');
    
    expect(textSkeletons.length).toBeGreaterThanOrEqual(3);
  });
});

describe('SkeletonTable', () => {
  it('should render correct number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} columns={2} />);
    // 1 header + 3 rows = 4 flex containers
    const flexRows = container.querySelectorAll('.flex.gap-4');
    
    expect(flexRows.length).toBe(4);
  });

  it('should render correct number of columns', () => {
    const { container } = render(<SkeletonTable rows={2} columns={5} />);
    const firstRow = container.querySelector('.flex.gap-4');
    
    expect(firstRow?.childNodes.length).toBe(5);
  });

  it('should use default values', () => {
    const { container } = render(<SkeletonTable />);
    // Default: 1 header + 5 rows = 6 flex containers
    const flexRows = container.querySelectorAll('.flex.gap-4');
    
    expect(flexRows.length).toBe(6);
  });
});
