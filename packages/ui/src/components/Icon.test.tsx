import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Icon from './Icon';
import type { IconName } from './Icon';

describe('Icon Component', () => {
  describe('Rendering', () => {
    it('should render icon with default size', () => {
      const { container } = render(<Icon name="Home" />);
      const icon = container.querySelector('span');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveStyle({ fontSize: '16px' });
    });

    it('should render correct icon character', () => {
      const { container } = render(<Icon name="Home" />);
      const icon = container.querySelector('span');
      expect(icon).toHaveTextContent('🏠');
    });

    it('should render different icons correctly', () => {
      const { container: container1 } = render(<Icon name="Users" />);
      expect(container1.querySelector('span')).toHaveTextContent('👥');

      const { container: container2 } = render(<Icon name="Settings" />);
      expect(container2.querySelector('span')).toHaveTextContent('⚙️');

      const { container: container3 } = render(<Icon name="CheckCircle" />);
      expect(container3.querySelector('span')).toHaveTextContent('✅');
    });
  });

  describe('Size', () => {
    it('should apply custom size', () => {
      const { container } = render(<Icon name="Home" size={24} />);
      const icon = container.querySelector('span');
      expect(icon).toHaveStyle({ fontSize: '24px' });
    });

    it('should apply size as width and height', () => {
      const { container } = render(<Icon name="Home" size={32} />);
      const icon = container.querySelector('span');
      expect(icon).toHaveStyle({ 
        width: '32px',
        height: '32px'
      });
    });

    it('should handle small icons', () => {
      const { container } = render(<Icon name="Home" size={12} />);
      const icon = container.querySelector('span');
      expect(icon).toHaveStyle({ fontSize: '12px' });
    });

    it('should handle large icons', () => {
      const { container } = render(<Icon name="Home" size={48} />);
      const icon = container.querySelector('span');
      expect(icon).toHaveStyle({ fontSize: '48px' });
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<Icon name="Home" className="custom-class" />);
      const icon = container.querySelector('span');
      expect(icon).toHaveClass('custom-class');
    });

    it('should have inline-block display', () => {
      const { container } = render(<Icon name="Home" />);
      const icon = container.querySelector('span');
      expect(icon).toHaveStyle({ display: 'inline-block' });
    });

    it('should have centered text alignment', () => {
      const { container } = render(<Icon name="Home" />);
      const icon = container.querySelector('span');
      expect(icon).toHaveStyle({ textAlign: 'center' });
    });
  });

  describe('Icon Names', () => {
    it('should handle camelCase icon names', () => {
      const { container } = render(<Icon name="ChevronUp" />);
      expect(container.querySelector('span')).toHaveTextContent('▲');
    });

    it('should handle kebab-case icon names', () => {
      const { container } = render(<Icon name="chevron-down" />);
      expect(container.querySelector('span')).toHaveTextContent('▼');
    });

    it('should show fallback for unknown icon', () => {
      // Test que el componente maneja nombres de iconos no válidos
      const { container } = render(<Icon name={'UnknownIcon' as IconName} />);
      expect(container.querySelector('span')).toHaveTextContent('?');
    });
  });

  describe('All Icons', () => {
    const iconTests = [
      { name: 'Home' as const, char: '🏠' },
      { name: 'Users' as const, char: '👥' },
      { name: 'BarChart3' as const, char: '📊' },
      { name: 'Settings' as const, char: '⚙️' },
      { name: 'LogOut' as const, char: '🚪' },
      { name: 'Menu' as const, char: '☰' },
      { name: 'X' as const, char: '✕' },
      { name: 'User' as const, char: '👤' },
    ];

    iconTests.forEach(({ name, char }) => {
      it(`should render ${name} icon correctly`, () => {
        const { container } = render(<Icon name={name} />);
        expect(container.querySelector('span')).toHaveTextContent(char);
      });
    });
  });
});

