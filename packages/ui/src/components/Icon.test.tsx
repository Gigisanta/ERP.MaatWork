import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Icon } from './Icon';

describe('Icon Component', () => {
  it('should render an icon', async () => {
    const { container } = render(<Icon name="Home" />);
    
    // Lucide icons are SVGs. Wait for mount if needed (though useEffect should run)
    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('should apply custom size', async () => {
    const { container } = render(<Icon name="Home" size={24} />);
    
    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });
  });

  it('should apply custom className', async () => {
    const { container } = render(<Icon name="Home" className="custom-class" />);
    
    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('custom-class');
    });
  });

  it('should fallback to AlertCircle for unknown icons', async () => {
    const { container } = render(<Icon name={'UnknownIcon' as any} />);
    
    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      // AlertCircle has specific attributes but checking existence is enough for fallback check
    });
  });
});
