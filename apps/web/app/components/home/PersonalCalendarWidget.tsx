/**
 * Personal Calendar Widget
 *
 * Widget para mostrar eventos del calendario personal del usuario en /home
 *
 * AI_DECISION: Mejorar manejo de errores y visualización de estados
 * Justificación: Usuarios necesitan ver claramente cuando algo falla y qué pueden hacer
 * Impacto: Mejor UX, menos confusión cuando Google Calendar tiene problemas
 */

'use client';

import React, { useMemo, useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Alert,
  Switch,
  Label,
  Heading,
  cn,
} from '@maatwork/ui';
import { useCalendarEvents, useUserTeams, useTeamCalendar } from '@/lib/api-hooks';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '@/lib/api-error';
import { logger, toLogContextValue } from '@/lib/logger';
import Link from 'next/link';
import { WeeklyCalendarView } from './WeeklyCalendarView';
import type { CalendarEvent } from '@/types';

export function PersonalCalendarWidget() {
  const { user, mutateUser } = useAuth();
  const [showTeamEvents, setShowTeamEvents] = useState(true);

  // AI_DECISION: Usar useMemo para mantener fechas estables y evitar re-renders infinitos
  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado
    endOfWeek.setHours(23, 59, 59, 999);

    return {
      timeMin: startOfWeek.toISOString(),
      timeMax: endOfWeek.toISOString(),
    };
  }, []);

  const isGoogleConnected = user?.isGoogleConnected;

  useEffect(() => {
    mutateUser();
  }, []);

  // Fetch Personal Events
  const {
    data: personalEvents,
    error: personalError,
    isLoading: personalLoading,
    mutate: mutatePersonal,
  } = useCalendarEvents(
    isGoogleConnected
      ? {
          timeMin: dateRange.timeMin,
          timeMax: dateRange.timeMax,
          maxResults: 100,
        }
      : undefined
  );

  // Fetch Teams and Team Events
  const { teams } = useUserTeams();
  const activeTeam = teams?.[0]; // Default to first team for unified view

  const {
    data: teamEvents,
    isLoading: teamLoading,
    mutate: mutateTeam,
  } = useTeamCalendar(showTeamEvents && activeTeam ? activeTeam.id : '', {
    timeMin: dateRange.timeMin,
    maxResults: 100,
  });

  // Merge events and mark them
  const mergedEvents = useMemo(() => {
    const pEvents = (personalEvents || []).map((e) => ({ ...e, isPersonal: true }));
    const tEvents = (teamEvents || []).map((e) => ({ 
      ...e, 
      id: e.id ? `team_${e.id}` : `team_${Math.random()}`, // Safety check for ID
      isPersonal: false 
    }));
    
    return showTeamEvents ? [...pEvents, ...tEvents] : pEvents;
  }, [personalEvents, teamEvents, showTeamEvents]);

  const handleRefresh = async () => {
    logger.info('[PersonalCalendarWidget] Manual refresh triggered');
    try {
      await Promise.all([mutatePersonal(), mutateTeam()]);
    } catch (err) {
      logger.error('[PersonalCalendarWidget] Refresh failed', { error: toLogContextValue(err) });
    }
  };

  if (!isGoogleConnected) {
    return (
      <Card className="border-none shadow-xl bg-surface/30 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-xl font-display font-bold">Agenda MaatWork</CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center">
          <Stack direction="column" gap="lg" align="center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-2 max-w-sm">
              <Text weight="bold" size="xl">Conecta tu Calendario</Text>
              <Text color="secondary">
                Sincroniza tus eventos de Google Calendar para gestionar tus reuniones directamente desde aquí.
              </Text>
            </div>
            <Link href="/profile">
              <Button size="lg" className="shadow-primary-lg">
                Conectar ahora
              </Button>
            </Link>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const isLoading = personalLoading || (showTeamEvents && teamLoading);
  const error = personalError;

  if (error) {
    return (
      <Card className="border-error/20 bg-error/[0.02]">
        <CardHeader>
          <CardTitle>Mi Calendario</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack direction="column" gap="md">
            <Alert variant="error" className="rounded-xl">
              <Text size="sm">Hubo un problema al conectar con Google Calendar.</Text>
            </Alert>
            <div className="flex gap-3">
              <Link href="/profile">
                <Button variant="outline" size="sm" className="rounded-full">Reconectar</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="rounded-full">
                Reintentar
              </Button>
            </div>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl font-display font-bold text-text">Mi Agenda</h2>
          <Text size="sm" color="secondary" className="opacity-70">Gestiona tus eventos personales y de equipo</Text>
        </div>
        
        {activeTeam && (
          <div className="flex items-center gap-3 bg-surface/50 p-2 pr-4 rounded-full border border-border shadow-sm">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              showTeamEvents ? "bg-joy text-white shadow-sm" : "bg-surface text-text-secondary"
            )}>
              {activeTeam.name[0]}
            </div>
            <Label htmlFor="team-toggle" className="text-sm font-medium cursor-pointer">
              Eventos de {activeTeam.name}
            </Label>
            <Switch 
              id="team-toggle" 
              checked={showTeamEvents} 
              onCheckedChange={setShowTeamEvents}
            />
          </div>
        )}
      </div>

      <WeeklyCalendarView
        events={mergedEvents as CalendarEvent[]}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        hideHeader={true}
      />
    </div>
  );
}
