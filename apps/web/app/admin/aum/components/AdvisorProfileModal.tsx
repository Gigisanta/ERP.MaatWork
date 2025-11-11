'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUserById } from '@/lib/api/users';
import type { ApiErrorWithMessage, Row, UserApiResponse } from '@/types';
import {
  Badge,
  Button,
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Spinner,
  Text,
} from '@cactus/ui';

interface AdvisorProfileModalProps {
  row: Row;
  open: boolean;
  onClose: () => void;
}

export default function AdvisorProfileModal({ row, open, onClose }: AdvisorProfileModalProps) {
  const [userDetails, setUserDetails] = useState<UserApiResponse | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const userIdToLoad = row.matchedUserId ?? row.suggestedUserId ?? null;

  useEffect(() => {
    let isCancelled = false;

    if (!open) {
      setUserDetails(null);
      setUserError(null);
      setLoadingUser(false);
      return () => {
        isCancelled = true;
      };
    }

    if (!userIdToLoad) {
      setUserDetails(null);
      setUserError(null);
      setLoadingUser(false);
      return () => {
        isCancelled = true;
      };
    }

    setLoadingUser(true);
    setUserError(null);

    void getUserById(userIdToLoad)
      .then((response) => {
        if (isCancelled) return;
        if (response.success && response.data) {
          setUserDetails(response.data);
        } else {
          setUserError('No se pudo cargar la información del asesor');
        }
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        const apiError = error as ApiErrorWithMessage;
        setUserError(apiError.userMessage || apiError.message || 'No se pudo cargar la información del asesor');
      })
      .finally(() => {
        if (isCancelled) return;
        setLoadingUser(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [open, row.id, userIdToLoad]);

  const aliasNormalized = useMemo(() => {
    const normalized = row.advisorNormalized?.trim();
    if (normalized) return normalized;
    if (row.advisorRaw) return row.advisorRaw.trim().toLowerCase();
    return null;
  }, [row.advisorNormalized, row.advisorRaw]);

  const matchStatusLabel = useMemo(() => {
    switch (row.matchStatus) {
      case 'matched':
        return 'Coincidencia';
      case 'ambiguous':
        return 'Ambiguo';
      default:
        return 'Sin coincidencia';
    }
  }, [row.matchStatus]);

  const matchStatusVariant: 'default' | 'success' | 'warning' | 'error' | 'brand' = useMemo(() => {
    switch (row.matchStatus) {
      case 'matched':
        return 'success';
      case 'ambiguous':
        return 'warning';
      default:
        return 'default';
    }
  }, [row.matchStatus]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const displayUserName = userDetails?.fullName || row.user?.name || null;
  const displayUserEmail = userDetails?.email || row.user?.email || null;
  const displayUserRole = userDetails?.role || null;
  const displayUserActive = userDetails?.isActive;

  return (
    <Modal
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <ModalHeader>
        <ModalTitle>Detalle del asesor</ModalTitle>
        <ModalDescription>
          Gestiona el alias normalizado y la vinculación para la fila de AUM seleccionada.
        </ModalDescription>
      </ModalHeader>

      <ModalContent>
        <div className="space-y-4">
          <div className="space-y-1">
            <Text size="sm" weight="medium">Alias normalizado</Text>
            <Text>{aliasNormalized || 'Sin alias normalizado'}</Text>
            <Text size="xs" color="secondary">
              Se calcula automáticamente aplicando trim + lowercase.
            </Text>
          </div>

          <div className="space-y-1">
            <Text size="sm" weight="medium">Estado actual</Text>
            <Badge variant={matchStatusVariant} size="sm">{matchStatusLabel}</Badge>
            {row.suggestedUserId && !row.matchedUserId ? (
              <Text size="xs" color="secondary">
                Hay un alias sugerido listo para vincular.
              </Text>
            ) : null}
          </div>

          {row.contact ? (
            <div className="space-y-1">
              <Text size="sm" weight="medium">Contacto vinculado</Text>
              <Text>{row.contact.fullName || row.contact.id}</Text>
              <Text size="xs" color="secondary">ID contacto: {row.contact.id}</Text>
            </div>
          ) : (
            <div className="space-y-1">
              <Text size="sm" weight="medium">Contacto vinculado</Text>
              <Text color="secondary" size="sm">Sin contacto asociado.</Text>
            </div>
          )}

          <div className="space-y-2">
            <Text size="sm" weight="medium">Asesor CRM</Text>
            {loadingUser ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Spinner size="sm" /> Cargando información...
              </div>
            ) : (
              <div className="space-y-1">
                {displayUserName || displayUserEmail ? (
                  <>
                    {displayUserName ? <Text>{displayUserName}</Text> : null}
                    {displayUserEmail ? (
                      <Text size="sm" color="secondary">{displayUserEmail}</Text>
                    ) : null}
                  </>
                ) : (
                  <Text color="secondary" size="sm">Sin asesor vinculado.</Text>
                )}
                {displayUserRole ? (
                  <Text size="xs" color="secondary">Rol: {displayUserRole}</Text>
                ) : null}
                {displayUserActive !== undefined ? (
                  <Text size="xs" color="secondary">
                    Estado: {displayUserActive ? 'Activo' : 'Inactivo'}
                  </Text>
                ) : null}
                {userError ? (
                  <Text size="xs" className="text-error">{userError}</Text>
                ) : null}
              </div>
            )}
          </div>

        </div>
      </ModalContent>

      <ModalFooter>
        <div className="flex w-full justify-end">
          <Button variant="ghost" onClick={handleClose} size="sm">
            Cerrar
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

