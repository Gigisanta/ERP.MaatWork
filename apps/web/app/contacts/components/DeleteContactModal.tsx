/**
 * Delete Contact Modal
 *
 * Confirmation modal for deleting a contact
 */

import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Button,
} from '@maatwork/ui';
import type { Contact } from '@/types';

interface DeleteContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onConfirm: () => void;
}

export default function DeleteContactModal({
  open,
  onOpenChange,
  contact,
  onConfirm,
}: DeleteContactModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalHeader>
        <ModalTitle>Confirmar eliminación</ModalTitle>
        <ModalDescription>
          ¿Estás seguro de que quieres eliminar el contacto &quot;{contact?.fullName}&quot;? Esta
          acción no se puede deshacer.
        </ModalDescription>
      </ModalHeader>
      <ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Eliminar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
