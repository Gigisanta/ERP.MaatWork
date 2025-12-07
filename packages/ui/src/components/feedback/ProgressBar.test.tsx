import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar, ProgressBarWithStatus, CircularProgress } from './ProgressBar';

describe('ProgressBar', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<ProgressBar value={50} />);
      const progressbar = screen.getByRole('progressbar');
      
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should clamp value between 0 and max', () => {
      const { rerender } = render(<ProgressBar value={-10} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

      rerender(<ProgressBar value={150} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('should respect custom max value', () => {
      render(<ProgressBar value={25} max={50} />);
      const progressbar = screen.getByRole('progressbar');
      
      expect(progressbar).toHaveAttribute('aria-valuenow', '25');
      expect(progressbar).toHaveAttribute('aria-valuemax', '50');
    });
  });

  describe('Label', () => {
    it('should show percentage label when showLabel is true', () => {
      render(<ProgressBar value={75} showLabel />);
      
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('75/100')).toBeInTheDocument();
    });

    it('should show custom label when provided', () => {
      render(<ProgressBar value={50} label="Uploading..." />);
      
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    it('should not show label by default', () => {
      render(<ProgressBar value={50} />);
      
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply default variant classes', () => {
      const { container } = render(<ProgressBar value={50} />);
      const fill = container.querySelector('.bg-primary');
      
      expect(fill).toBeInTheDocument();
    });

    it('should apply success variant classes', () => {
      const { container } = render(<ProgressBar value={50} variant="success" />);
      const fill = container.querySelector('.bg-success');
      
      expect(fill).toBeInTheDocument();
    });

    it('should apply error variant classes', () => {
      const { container } = render(<ProgressBar value={50} variant="error" />);
      const fill = container.querySelector('.bg-error');
      
      expect(fill).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should apply small size', () => {
      const { container } = render(<ProgressBar value={50} size="sm" />);
      const track = container.querySelector('.h-1');
      
      expect(track).toBeInTheDocument();
    });

    it('should apply medium size (default)', () => {
      const { container } = render(<ProgressBar value={50} />);
      const track = container.querySelector('.h-2');
      
      expect(track).toBeInTheDocument();
    });

    it('should apply large size', () => {
      const { container } = render(<ProgressBar value={50} size="lg" />);
      const track = container.querySelector('.h-3');
      
      expect(track).toBeInTheDocument();
    });
  });

  describe('Indeterminate', () => {
    it('should not have aria-valuenow when indeterminate', () => {
      render(<ProgressBar value={50} indeterminate />);
      const progressbar = screen.getByRole('progressbar');
      
      expect(progressbar).not.toHaveAttribute('aria-valuenow');
    });

    it('should apply indeterminate animation class', () => {
      const { container } = render(<ProgressBar value={50} indeterminate />);
      const fill = container.querySelector('.animate-progress-indeterminate');
      
      expect(fill).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should have transition class when animated (default)', () => {
      const { container } = render(<ProgressBar value={50} />);
      const fill = container.querySelector('.transition-all');
      
      expect(fill).toBeInTheDocument();
    });

    it('should not have transition class when animated=false', () => {
      const { container } = render(<ProgressBar value={50} animated={false} />);
      const fill = container.querySelector('.transition-all');
      
      expect(fill).not.toBeInTheDocument();
    });
  });

  describe('Striped', () => {
    it('should apply striped class when striped is true', () => {
      const { container } = render(<ProgressBar value={50} striped />);
      const fill = container.querySelector('.bg-stripes');
      
      expect(fill).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      const { container } = render(<ProgressBar value={50} className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should forward ref', () => {
      const ref = { current: null };
      render(<ProgressBar value={50} ref={ref} />);
      
      expect(ref.current).not.toBeNull();
    });
  });
});

describe('ProgressBarWithStatus', () => {
  it('should render progress bar with status message', () => {
    render(<ProgressBarWithStatus value={50} status="Uploading file..." />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Uploading file...')).toBeInTheDocument();
  });

  it('should render details when provided', () => {
    render(<ProgressBarWithStatus value={50} details="2 of 4 files" />);
    
    expect(screen.getByText('2 of 4 files')).toBeInTheDocument();
  });

  it('should render both status and details', () => {
    render(
      <ProgressBarWithStatus 
        value={50} 
        status="Uploading..." 
        details="50% complete" 
      />
    );
    
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
    expect(screen.getByText('50% complete')).toBeInTheDocument();
  });
});

describe('CircularProgress', () => {
  it('should render with default props', () => {
    render(<CircularProgress value={50} />);
    const progressbar = screen.getByRole('progressbar');
    
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
  });

  it('should show label when showLabel is true', () => {
    render(<CircularProgress value={75} showLabel />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should not show label when indeterminate', () => {
    render(<CircularProgress value={50} showLabel indeterminate />);
    
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('should apply spin animation when indeterminate', () => {
    const { container } = render(<CircularProgress value={50} indeterminate />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveClass('animate-spin');
  });

  it('should accept custom size', () => {
    const { container } = render(<CircularProgress value={50} size={64} />);
    const svg = container.querySelector('svg');
    
    expect(svg).toHaveAttribute('width', '64');
    expect(svg).toHaveAttribute('height', '64');
  });

  it('should clamp value between 0 and 100', () => {
    const { rerender } = render(<CircularProgress value={-10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    rerender(<CircularProgress value={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
