import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import Icon from '../Icon.js';
import { cn } from '../../utils/cn.js';
import Button from '../nav/Button.js';

export interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  trigger?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  full: 'max-w-full w-[95vw] h-[95vh]',
};

/**
 * Modal component with brand styling.
 * Uses Poppins for titles and Open Sans for body content.
 * Focus ring uses Secondary Purple color.
 *
 * @example
 * ```tsx
 * <Modal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Confirm Action"
 *   description="Are you sure you want to continue?"
 * >
 *   <ModalContent>Content here</ModalContent>
 *   <ModalFooter>
 *     <Button variant="outline">Cancel</Button>
 *     <Button variant="primary">Confirm</Button>
 *   </ModalFooter>
 * </Modal>
 * ```
 */
export const Modal = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, ModalProps>(
  ({ open, onOpenChange, title, description, children, size = 'md', trigger, ...props }, ref) => {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-secondary/40 backdrop-blur-sm',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'duration-300'
            )}
          />
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4',
              'border border-border bg-background p-6 shadow-2xl',
              'duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
              'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
              'sm:rounded-xl font-body',
              sizeClasses[size]
            )}
            aria-describedby={!description ? undefined : undefined}
            {...props}
          >
            {(title || description) && (
              <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                {title && (
                  <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight font-display text-text">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className="text-sm text-text-secondary font-body">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
            )}

            <div className="flex-1">{children}</div>

            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-4 rounded-full opacity-70 transition-all duration-200 hover:opacity-100 hover:rotate-90 hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none"
              >
                <Icon name="x" size={16} />
                <span className="sr-only">Close</span>
              </Button>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }
);

Modal.displayName = DialogPrimitive.Content.displayName;

// Modal Header component
export const ModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);

ModalHeader.displayName = 'ModalHeader';

// Modal Footer component
export const ModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);

ModalFooter.displayName = 'ModalFooter';

// Modal Title component
export const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight font-display text-text',
      className
    )}
    {...props}
  />
));

ModalTitle.displayName = DialogPrimitive.Title.displayName;

// Modal Description component
export const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-text-secondary font-body', className)}
    {...props}
  />
));

ModalDescription.displayName = DialogPrimitive.Description.displayName;

// Modal Content component
export const ModalContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex-1 font-body', className)} {...props} />
  )
);

ModalContent.displayName = 'ModalContent';
