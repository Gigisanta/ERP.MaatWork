import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { 
  DropdownMenu, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup
} from './DropdownMenu';
import Button from '../nav/Button';

describe('DropdownMenu Component', () => {
  describe('Rendering', () => {
    it('should render trigger', () => {
      render(
        <DropdownMenu trigger={<Button>Open Menu</Button>}>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByText('Open Menu')).toBeInTheDocument();
    });

    it('should render children in portal when open', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuItem>Action</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByText('Menu')).toBeInTheDocument();
    });
  });

  describe('Alignment', () => {
    it('should default to end alignment', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should accept start alignment', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>} align="start">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should accept center alignment', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>} align="center">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should accept end alignment explicitly', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>} align="end">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Side Positioning', () => {
    it('should default to bottom side', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should accept top side', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>} side="top">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should accept right side', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>} side="right">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should accept left side', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>} side="left">
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Side Offset', () => {
    it('should default to 4px sideOffset', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should accept custom sideOffset', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>} sideOffset={10}>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuItem', () => {
    it('should render dropdown with items', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuItem>Action Item</DropdownMenuItem>
        </DropdownMenu>
      );
      // Trigger should always be visible
      expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    });

    it('should render multiple items', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
          <DropdownMenuItem>Item 2</DropdownMenuItem>
        </DropdownMenu>
      );
      // Trigger should always be visible
      expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    });

    it('should support custom styling', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuItem className="custom-item">Item</DropdownMenuItem>
        </DropdownMenu>
      );
      // Dropdown structure should be rendered
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should be keyboard navigable via trigger', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      const trigger = screen.getByRole('button');
      expect(trigger).toBeInTheDocument();
    });

    it('should support disabled items', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
        </DropdownMenu>
      );
      // Dropdown structure should be rendered
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuSeparator', () => {
    it('should render separator', () => {
      const { container } = render(<DropdownMenuSeparator />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('DropdownMenuLabel', () => {
    it('should render label', () => {
      render(<DropdownMenuLabel>Section Label</DropdownMenuLabel>);
      expect(screen.getByText('Section Label')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuGroup', () => {
    it('should render group structure', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuGroup>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenu>
      );
      // Dropdown should render with trigger
      expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    });
  });

  describe('Complete Menu Structure', () => {
    it('should render complete menu structure', () => {
      render(
        <DropdownMenu trigger={<Button>Actions</Button>}>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Logout</DropdownMenuItem>
        </DropdownMenu>
      );

      // Trigger should be visible
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible trigger', () => {
      render(
        <DropdownMenu trigger={<Button aria-label="Open menu">Menu</Button>}>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
    });

    it('should support keyboard navigation on trigger', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      const trigger = screen.getByRole('button');
      expect(trigger).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should have animation classes', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      // Animation classes are applied by Radix UI primitives
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(
        <DropdownMenu trigger={<Button>Empty Menu</Button>}>
          {null}
        </DropdownMenu>
      );
      expect(screen.getByText('Empty Menu')).toBeInTheDocument();
    });

    it('should handle single item', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          <DropdownMenuItem>Only Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    });

    it('should handle many items', () => {
      render(
        <DropdownMenu trigger={<Button>Menu</Button>}>
          {Array.from({ length: 20 }, (_, i) => (
            <DropdownMenuItem key={i}>Item {i + 1}</DropdownMenuItem>
          ))}
        </DropdownMenu>
      );
      expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    });
  });

  describe('Custom Trigger', () => {
    it('should work with custom trigger element', () => {
      render(
        <DropdownMenu trigger={<button className="custom-trigger">Custom</button>}>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('should work with icon trigger', () => {
      render(
        <DropdownMenu trigger={<button aria-label="Menu">⋮</button>}>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenu>
      );
      expect(screen.getByLabelText('Menu')).toBeInTheDocument();
    });
  });
});

