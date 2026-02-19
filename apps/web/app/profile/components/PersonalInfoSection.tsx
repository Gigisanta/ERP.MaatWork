'use client';

import React from 'react';
import { Grid, Text, Badge, Input, Button, Stack, Alert } from '@maatwork/ui';
import type { UserApiResponse as User } from '@/types';

interface PersonalInfoSectionProps {
  userInfo: User | null;
  isEditingPhone: boolean;
  phoneValue: string;
  phoneError: string | null;
  actionLoading: string | null;
  onPhoneChange: (value: string) => void;
  onPhoneErrorClear: () => void;
  onSavePhone: () => void;
  onCancelEditPhone: () => void;
  onStartEditPhone: () => void;
}

/**
 * Sección de información personal del perfil
 */
export function PersonalInfoSection({
  userInfo,
  isEditingPhone,
  phoneValue,
  phoneError,
  actionLoading,
  onPhoneChange,
  onPhoneErrorClear,
  onSavePhone,
  onCancelEditPhone,
  onStartEditPhone,
}: PersonalInfoSectionProps) {
  return (
    <>
      <Grid cols={{ base: 1, md: 2 }} gap="sm">
        <div className="space-y-1">
          <Text weight="medium" size="xs" color="secondary">
            Nombre completo
          </Text>
          <Text size="sm" className="text-text">
            {userInfo?.fullName || 'No disponible'}
          </Text>
        </div>
        <div className="space-y-1">
          <Text weight="medium" size="xs" color="secondary">
            Email
          </Text>
          <Text size="sm" className="text-text">
            {userInfo?.email || 'No disponible'}
          </Text>
        </div>
        <div className="space-y-1">
          <Text weight="medium" size="xs" color="secondary">
            Teléfono
          </Text>
          {isEditingPhone ? (
            <Stack direction="column" gap="xs">
              <Input
                type="tel"
                value={phoneValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  onPhoneChange(e.target.value);
                  onPhoneErrorClear();
                }}
                placeholder="Ingrese su número de teléfono"
                required
                maxLength={50}
                error={phoneError || undefined}
                size="sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={onSavePhone} disabled={actionLoading === 'phone'}>
                  {actionLoading === 'phone' ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelEditPhone}
                  disabled={actionLoading === 'phone'}
                >
                  Cancelar
                </Button>
              </div>
            </Stack>
          ) : (
            <div className="flex items-center gap-2">
              <Text size="sm" className="text-text">
                {userInfo?.phone || 'No configurado'}
              </Text>
              <Button size="sm" variant="outline" onClick={onStartEditPhone}>
                {userInfo?.phone ? 'Editar' : 'Agregar'}
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <Text weight="medium" size="xs" color="secondary">
            Rol
          </Text>
          <div>
            <Badge variant={userInfo?.role === 'admin' ? 'secondary' : 'default'}>
              {userInfo?.role || 'No disponible'}
            </Badge>
          </div>
        </div>
        <div className="space-y-1">
          <Text weight="medium" size="xs" color="secondary">
            Estado
          </Text>
          <div>
            <Badge variant={userInfo?.isActive ? 'success' : 'error'}>
              {userInfo?.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </div>
      </Grid>
      {!userInfo?.phone && !isEditingPhone && (
        <Alert variant="error" className="mt-1">
          <Text size="xs">
            El número de teléfono es obligatorio para utilizar las automatizaciones del sistema. Por
            favor, agregue su número de teléfono.
          </Text>
        </Alert>
      )}
    </>
  );
}
