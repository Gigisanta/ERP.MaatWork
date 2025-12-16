'use client';

/**
 * Página de Perfil de Usuario
 *
 * AI_DECISION: Refactorizado desde 984 líneas a ~200 líneas usando componentes y hooks especializados
 * Justificación: Mejor mantenibilidad, testabilidad y separación de responsabilidades
 * Impacto: Código más organizado, dividido en:
 *   - hooks/useProfileData.ts: Carga de datos del perfil
 *   - hooks/useProfileActions.ts: Acciones del perfil
 *   - hooks/useAliases.ts: Gestión de aliases AUM
 *   - components/PersonalInfoSection.tsx: Información personal
 *   - components/AliasesSection.tsx: Aliases AUM
 *   - components/TeamsSection.tsx: Equipos y calendario
 *   - components/InvitationsSection.tsx: Invitaciones
 *   - components/TeamMembersSection.tsx: Miembros del equipo
 *   - components/ProfileModals.tsx: Modales
 */

import React, { useState, useEffect } from 'react';
import { useRequireAuth } from '../auth/useRequireAuth';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Heading,
  Text,
  Stack,
  Grid,
  Button,
  Alert,
} from '@cactus/ui';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../../lib/hooks/useToast';

// Hooks especializados
import { useProfileData, useProfileActions, useAliases } from './hooks';

// Componentes especializados
import {
  PersonalInfoSection,
  ThemeSelectorSection,
  AliasesSection,
  TeamsSection,
  InvitationsSection,
  TeamMembersSection,
  ProfileModals,
  GoogleCalendarSection,
} from './components';

export default function ProfilePage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const { showToast } = useToast();

  // Estados para formularios
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);

  // Estados para ConfirmDialog
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

  // Hook de datos del perfil
  const {
    userInfo,
    setUserInfo,
    teams,
    setTeams,
    teamMembers,
    invitations,
    setInvitations,
    dataLoading,
    error,
    setError,
    fetchUserInfo,
  } = useProfileData({ user });

  // Hook de acciones del perfil
  const {
    actionLoading,
    passwordForm,
    setPasswordForm,
    teamForm,
    setTeamForm,
    memberForm,
    setMemberForm,
    isEditingPhone,
    setIsEditingPhone,
    phoneValue,
    setPhoneValue,
    phoneError,
    setPhoneError,
    handleInvitation,
    handlePasswordChange,
    handleCreateTeam,
    handleAddMember,
    handleLeaveTeam,
    handleSavePhone,
    handleCancelEditPhone,
  } = useProfileActions({
    user,
    showToast,
    setError,
    setInvitations,
    setTeams,
    setUserInfo,
    fetchUserInfo,
    router,
  });

  // Hook de aliases
  const {
    aliases,
    newAlias,
    setNewAlias,
    aliasLoading,
    addAlias,
    deleteAliasRef,
    aliasLoadingRef,
  } = useAliases({ user, showToast, setError });

  // Inicializar phoneValue cuando se carga userInfo
  useEffect(() => {
    if (userInfo) {
      setPhoneValue(userInfo.phone ?? '');
    }
  }, [userInfo, setPhoneValue]);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <Text>Cargando información del perfil...</Text>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <Stack direction="column" gap="md">
        <div>
          <Heading level={2}>Mi Perfil</Heading>
          <Text size="sm" color="secondary">
            Gestiona tu información personal y equipos
          </Text>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Grid cols={1} gap="md">
          {/* Información del Usuario */}
          <Card padding="sm" className="p-2">
            <CardHeader className="mb-1.5">
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent>
              <Stack direction="column" gap="sm">
                <PersonalInfoSection
                  userInfo={userInfo}
                  isEditingPhone={isEditingPhone}
                  phoneValue={phoneValue}
                  phoneError={phoneError}
                  actionLoading={actionLoading}
                  onPhoneChange={setPhoneValue}
                  onPhoneErrorClear={() => setPhoneError(null)}
                  onSavePhone={handleSavePhone}
                  onCancelEditPhone={() => handleCancelEditPhone(userInfo?.phone)}
                  onStartEditPhone={() => setIsEditingPhone(true)}
                />

                {/* Separador visual */}
                <div className="border-t border-border my-3" />

                {/* Selector de Tema */}
                <ThemeSelectorSection />

                {/* Secciones integradas en Grid */}
                <Grid cols={{ base: 1, md: 2 }} gap="sm">
                  {/* Google Calendar */}
                  <GoogleCalendarSection />

                  {/* Aliases AUM */}
                  <AliasesSection
                    aliases={aliases}
                    newAlias={newAlias}
                    aliasLoading={aliasLoading}
                    onNewAliasChange={setNewAlias}
                    onAddAlias={addAlias}
                    deleteAliasRef={deleteAliasRef}
                    aliasLoadingRef={aliasLoadingRef}
                  />

                  {/* Equipos y Calendario */}
                  <TeamsSection
                    user={user}
                    teams={teams}
                    onShowTeamForm={() => setShowTeamForm(true)}
                  />
                </Grid>

                <div className="mt-2 flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordForm(true)}
                    className="w-fit"
                  >
                    Cambiar Contraseña
                  </Button>
                  {user?.role === 'admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/plandecarrera')}
                      className="w-fit"
                    >
                      Configurar Plan de Carrera
                    </Button>
                  )}
                </div>
              </Stack>
            </CardContent>
          </Card>

          {/* Invitaciones a equipos */}
          <InvitationsSection
            invitations={invitations}
            actionLoading={actionLoading}
            onInvitation={handleInvitation}
          />
        </Grid>

        {/* Tabla de Miembros */}
        <TeamMembersSection
          user={user}
          teamMembers={teamMembers}
          onShowAddMemberForm={() => setShowAddMemberForm(true)}
        />
      </Stack>

      {/* Modales */}
      <ProfileModals
        showPasswordForm={showPasswordForm}
        setShowPasswordForm={setShowPasswordForm}
        passwordForm={passwordForm}
        setPasswordForm={setPasswordForm}
        actionLoading={actionLoading}
        onPasswordChange={() => handlePasswordChange(() => setShowPasswordForm(false))}
        showTeamForm={showTeamForm}
        setShowTeamForm={setShowTeamForm}
        teamForm={teamForm}
        setTeamForm={setTeamForm}
        onCreateTeam={() => handleCreateTeam(() => setShowTeamForm(false))}
        showAddMemberForm={showAddMemberForm}
        setShowAddMemberForm={setShowAddMemberForm}
        memberForm={memberForm}
        setMemberForm={setMemberForm}
        onAddMember={() => handleAddMember(() => setShowAddMemberForm(false))}
      />

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
    </main>
  );
}
