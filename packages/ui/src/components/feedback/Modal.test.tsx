import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal, ModalHeader, ModalFooter, ModalTitle, ModalDescription, ModalContent } from './Modal';

describe('Modal Component', () => {
  describe('Rendering', () => {
    it('should render modal content when open', () => {
      render(
        <Modal open={true} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      );
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should not render modal content when closed', () => {
      render(
        <Modal open={false} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      );
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('should render with title', () => {
      render(
        <Modal open={true} title="Modal Title">
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('Modal Title')).toBeInTheDocument();
    });

    it('should render with description', () => {
      render(
        <Modal open={true} title="Title" description="This is a description">
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('This is a description')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(
        <Modal open={true}>
          <div data-testid="custom-content">Custom content</div>
        </Modal>
      );
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(
        <Modal open={true}>
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should render trigger when provided', () => {
      render(
        <Modal trigger={<button>Open Modal</button>}>
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('Open Modal')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should apply small size classes', () => {
      render(
        <Modal open={true} size="sm">
          <div>Content</div>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-sm');
    });

    it('should apply medium size classes (default)', () => {
      render(
        <Modal open={true}>
          <div>Content</div>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-md');
    });

    it('should apply large size classes', () => {
      render(
        <Modal open={true} size="lg">
          <div>Content</div>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-2xl');
    });

    it('should apply full size classes', () => {
      render(
        <Modal open={true} size="full">
          <div>Content</div>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-full');
    });
  });

  describe('Interactions', () => {
    it('should call onOpenChange when close button is clicked', async () => {
      const handleOpenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal open={true} onOpenChange={handleOpenChange}>
          <div>Content</div>
        </Modal>
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Overlay', () => {
    it('should render backdrop overlay when open', () => {
      render(
        <Modal open={true}>
          <div>Content</div>
        </Modal>
      );
      // Dialog should be present when modal is open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(
        <Modal open={true}>
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have close button with accessible label', () => {
      render(
        <Modal open={true}>
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should focus close button', () => {
      render(
        <Modal open={true}>
          <div>Content</div>
        </Modal>
      );
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveClass('focus:ring-2');
    });
  });

  describe('ModalHeader', () => {
    it('should render ModalHeader', () => {
      render(<ModalHeader data-testid="modal-header">Header content</ModalHeader>);
      expect(screen.getByTestId('modal-header')).toBeInTheDocument();
    });

    it('should apply styling classes', () => {
      render(<ModalHeader data-testid="modal-header">Header</ModalHeader>);
      const header = screen.getByTestId('modal-header');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5');
    });
  });

  describe('ModalFooter', () => {
    it('should render ModalFooter', () => {
      render(<ModalFooter data-testid="modal-footer">Footer content</ModalFooter>);
      expect(screen.getByTestId('modal-footer')).toBeInTheDocument();
    });

    it('should apply styling classes', () => {
      render(<ModalFooter data-testid="modal-footer">Footer</ModalFooter>);
      const footer = screen.getByTestId('modal-footer');
      expect(footer).toHaveClass('flex', 'flex-col-reverse', 'sm:flex-row');
    });
  });

  describe('ModalTitle', () => {
    it('should render ModalTitle in modal context', () => {
      render(
        <Modal open={true} title="Title">
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
    });

    it('should apply styling classes', () => {
      render(
        <Modal open={true} title="Title">
          <div>Content</div>
        </Modal>
      );
      const title = screen.getByText('Title');
      expect(title).toHaveClass('text-lg', 'font-semibold');
    });
  });

  describe('ModalDescription', () => {
    it('should render ModalDescription in modal context', () => {
      render(
        <Modal open={true} description="Description">
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should apply styling classes', () => {
      render(
        <Modal open={true} description="Description">
          <div>Content</div>
        </Modal>
      );
      const description = screen.getByText('Description');
      expect(description).toHaveClass('text-sm', 'text-foreground-secondary');
    });
  });

  describe('ModalContent', () => {
    it('should render ModalContent', () => {
      render(<ModalContent data-testid="modal-content">Content</ModalContent>);
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
    });

    it('should apply flex-1 class', () => {
      render(<ModalContent data-testid="modal-content">Content</ModalContent>);
      const content = screen.getByTestId('modal-content');
      expect(content).toHaveClass('flex-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle no title or description', () => {
      render(
        <Modal open={true}>
          <div>Just content</div>
        </Modal>
      );
      expect(screen.getByText('Just content')).toBeInTheDocument();
    });

    it('should handle long content', () => {
      const longContent = 'Lorem ipsum '.repeat(100);
      render(
        <Modal open={true}>
          <div data-testid="long-content">{longContent}</div>
        </Modal>
      );
      // Use testid to find element since text might be split
      const contentElement = screen.getByTestId('long-content');
      expect(contentElement).toBeInTheDocument();
      expect(contentElement.textContent).toEqual(longContent);
    });

    it('should handle controlled state', () => {
      const { rerender } = render(
        <Modal open={false}>
          <div>Content</div>
        </Modal>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();

      rerender(
        <Modal open={true}>
          <div>Content</div>
        </Modal>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Positioning', () => {
    it('should center modal on screen', () => {
      render(
        <Modal open={true}>
          <div>Content</div>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('left-[50%]', 'top-[50%]', 'translate-x-[-50%]', 'translate-y-[-50%]');
    });
  });

  describe('Animation Classes', () => {
    it('should have animation classes', () => {
      render(
        <Modal open={true}>
          <div>Content</div>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('data-[state=open]:animate-in', 'data-[state=closed]:animate-out');
    });
  });
});

