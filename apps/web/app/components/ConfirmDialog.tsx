"use client";

import { Modal, ModalHeader, ModalFooter, ModalTitle, ModalDescription, ModalContent, Button } from '@cactus/ui';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

/**
 * ConfirmDialog - Componente reutilizable para confirmaciones
 * 
 * Reemplaza confirm() nativo con Modal del design system
 * Siguiendo patrones de .cursorrules
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default'
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="sm">
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          {description && <ModalDescription>{description}</ModalDescription>}
        </ModalHeader>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'primary' : 'primary'}
            onClick={handleConfirm}
            className={variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

