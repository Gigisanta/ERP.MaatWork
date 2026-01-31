'use client';

import React from 'react';
import { Modal, Stack, Input, Button } from '@maatwork/ui';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface TeamForm {
  name: string;
}

interface MemberForm {
  email: string;
  teamId?: string;
}

interface ProfileModalsProps {
  // Password Modal
  showPasswordForm: boolean;
  setShowPasswordForm: (show: boolean) => void;
  passwordForm: PasswordForm;
  setPasswordForm: React.Dispatch<React.SetStateAction<PasswordForm>>;
  actionLoading: string | null;
  onPasswordChange: () => void;

  // Team Modal
  showTeamForm: boolean;
  setShowTeamForm: (show: boolean) => void;
  teamForm: TeamForm;
  setTeamForm: React.Dispatch<React.SetStateAction<TeamForm>>;
  onCreateTeam: () => void;

  // Member Modal
  showAddMemberForm: boolean;
  setShowAddMemberForm: (show: boolean) => void;
  memberForm: MemberForm;
  setMemberForm: React.Dispatch<React.SetStateAction<MemberForm>>;
  onAddMember: () => void;
}

/**
 * Modales del perfil (contraseña, crear equipo, agregar miembro)
 */
export function ProfileModals({
  showPasswordForm,
  setShowPasswordForm,
  passwordForm,
  setPasswordForm,
  actionLoading,
  onPasswordChange,
  showTeamForm,
  setShowTeamForm,
  teamForm,
  setTeamForm,
  onCreateTeam,
  showAddMemberForm,
  setShowAddMemberForm,
  memberForm,
  setMemberForm,
  onAddMember,
}: ProfileModalsProps) {
  return (
    <>
      {/* Modal Cambiar Contraseña */}
      <Modal open={showPasswordForm} onOpenChange={setShowPasswordForm} title="Cambiar Contraseña">
        <Stack direction="column" gap="sm">
          <Input
            label="Contraseña actual"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
            }
            required
          />
          <Input
            label="Nueva contraseña"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
            required
            minLength={6}
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
            }
            required
            minLength={6}
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={onPasswordChange}
              disabled={actionLoading === 'password'}
            >
              Cambiar Contraseña
            </Button>
            <Button variant="outline" onClick={() => setShowPasswordForm(false)}>
              Cancelar
            </Button>
          </div>
        </Stack>
      </Modal>

      {/* Modal Crear Equipo */}
      <Modal open={showTeamForm} onOpenChange={setShowTeamForm} title="Crear Nuevo Equipo">
        <Stack direction="column" gap="sm">
          <Input
            label="Nombre del equipo"
            value={teamForm.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nombre del equipo"
            required
          />
          <div className="flex gap-2">
            <Button variant="primary" onClick={onCreateTeam} disabled={actionLoading === 'team'}>
              Crear Equipo
            </Button>
            <Button variant="outline" onClick={() => setShowTeamForm(false)}>
              Cancelar
            </Button>
          </div>
        </Stack>
      </Modal>

      {/* Modal Agregar Miembro */}
      <Modal
        open={showAddMemberForm}
        onOpenChange={setShowAddMemberForm}
        title="Agregar Miembro al Equipo"
      >
        <Stack direction="column" gap="sm">
          <Input
            label="Email del miembro"
            type="email"
            value={memberForm.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="miembro@email.com"
            required
          />
          <div className="flex gap-2">
            <Button variant="primary" onClick={onAddMember} disabled={actionLoading === 'member'}>
              Enviar Invitación
            </Button>
            <Button variant="outline" onClick={() => setShowAddMemberForm(false)}>
              Cancelar
            </Button>
          </div>
        </Stack>
      </Modal>
    </>
  );
}
