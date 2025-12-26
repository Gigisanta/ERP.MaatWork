'use client';
import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Heading,
  Text,
  Stack,
  Input,
  Select,
  Badge,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Spinner,
  EmptyState,
  Alert,
} from '@maatwork/ui';
import { ConfirmDialog } from '@maatwork/ui';
import { useBrokerAccounts } from '@/lib/api-hooks';
import { createBrokerAccount, deleteBrokerAccount } from '@/lib/api';
import { logger, toLogContext } from '@/lib/logger';
import type { BrokerAccount } from '@/types';

// AI_DECISION: Extracted to client island for CRUD operations isolation
// Justificación: Server component for static data, client only where needed
// Impacto: Reduces First Load JS ~400KB → ~150KB for this route

interface BrokerAccountsSectionProps {
  contactId: string;
  initialBrokerAccounts: BrokerAccount[];
}

/**
 * BrokerAccountsSection - Client Island for broker account management
 *
 * @example
 * <BrokerAccountsSection
 *   contactId={contact.id}
 *   initialBrokerAccounts={brokerAccounts}
 * />
 */
export default function BrokerAccountsSection({
  contactId,
  initialBrokerAccounts,
}: BrokerAccountsSectionProps) {
  const { brokerAccounts, error, isLoading, mutate } = useBrokerAccounts(contactId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado para ConfirmDialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'default';
  }>({
    open: false,
    title: '',
    onConfirm: () => {},
  });

  const [newAccount, setNewAccount] = useState({
    broker: '',
    accountNumber: '',
    holderName: '',
    status: 'active' as 'active' | 'closed',
  });

  const handleCreateAccount = async () => {
    setSaving(true);
    try {
      await createBrokerAccount({
        ...newAccount,
        contactId,
      });

      await mutate(); // Refresh data
      setShowCreateModal(false);
      setNewAccount({ broker: '', accountNumber: '', holderName: '', status: 'active' });
    } catch (err) {
      logger.error(
        'Error creating broker account',
        toLogContext({ err, contactId, account: newAccount })
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Eliminar cuenta',
      description: '¿Estás seguro de que quieres eliminar esta cuenta?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteBrokerAccount(accountId);
          await mutate(); // Refresh data
        } catch (err) {
          logger.error('Error deleting broker account', toLogContext({ err, accountId }));
        }
      },
    });
  };

  const accounts =
    Array.isArray(brokerAccounts) && brokerAccounts.length > 0
      ? brokerAccounts
      : initialBrokerAccounts;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Cuentas de Broker</CardTitle>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            Agregar Cuenta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <Alert variant="error" title="Error">
            Error al cargar las cuentas de broker
          </Alert>
        ) : accounts.length === 0 ? (
          <EmptyState
            title="Sin cuentas de broker"
            description="Este contacto no tiene cuentas de broker asociadas"
          />
        ) : (
          <Stack direction="column" gap="md">
            {accounts.map((account: BrokerAccount) => (
              <div key={account.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Heading size="sm">{account.broker}</Heading>
                      <Badge variant="default">Activa</Badge>
                    </div>
                    <Text size="sm" color="secondary">
                      Número: {account.accountNumber}
                    </Text>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAccount(account.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </Stack>
        )}
      </CardContent>

      {/* Create Modal */}
      <Modal open={showCreateModal} onOpenChange={setShowCreateModal}>
        <ModalHeader>
          <ModalTitle>Agregar Cuenta de Broker</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <Stack direction="column" gap="md">
            <div>
              <Text size="sm" weight="medium" className="mb-1">
                Broker
              </Text>
              <Input
                value={newAccount.broker}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, broker: e.target.value }))}
                placeholder="Ej: Balanz, IOL, etc."
              />
            </div>
            <div>
              <Text size="sm" weight="medium" className="mb-1">
                Número de Cuenta
              </Text>
              <Input
                value={newAccount.accountNumber}
                onChange={(e) =>
                  setNewAccount((prev) => ({ ...prev, accountNumber: e.target.value }))
                }
                placeholder="Número de cuenta"
              />
            </div>
            <div>
              <Text size="sm" weight="medium" className="mb-1">
                Titular (opcional)
              </Text>
              <Input
                value={newAccount.holderName}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, holderName: e.target.value }))}
                placeholder="Nombre del titular"
              />
            </div>
            <div>
              <Text size="sm" weight="medium" className="mb-1">
                Estado
              </Text>
              <Select
                value={newAccount.status}
                onValueChange={(value: string) =>
                  setNewAccount((prev) => ({ ...prev, status: value as 'active' | 'closed' }))
                }
                items={[
                  { value: 'active', label: 'Activa' },
                  { value: 'closed', label: 'Cerrada' },
                ]}
              />
            </div>
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateAccount}
            disabled={saving || !newAccount.broker || !newAccount.accountNumber}
          >
            {saving ? <Spinner size="sm" /> : 'Crear Cuenta'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant || 'default'}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
      />
    </Card>
  );
}
