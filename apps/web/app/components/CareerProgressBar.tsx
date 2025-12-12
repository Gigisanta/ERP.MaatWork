'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getUserCareerProgress } from '@/lib/api/career-plan';
import type { UserCareerProgress } from '@/types/career-plan';
import {
  formatProgressPercentage,
  formatAnnualGoal,
  formatLevelPercentage,
} from '@/lib/utils/career-plan';

// Fetcher para SWR usando la función del cliente API
const fetcher = async (): Promise<UserCareerProgress> => {
  const response = await getUserCareerProgress();
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener progreso');
  }
  return response.data;
};

/**
 * Career Progress Bar - Shows user's career level progress
 *
 * AI_DECISION: Made fully responsive with different layouts for different screen sizes
 * Justificación: Progress bar needs to adapt to available space without breaking layout
 * Impacto: Works well on tablets and larger screens where it's displayed
 */
export default function CareerProgressBar() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR<UserCareerProgress>(
    'career-plan-user-progress',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache por 60 segundos
      shouldRetryOnError: false,
    }
  );

  const handleClick = useCallback(() => {
    router.push('/plandecarrera');
  }, [router]);

  // Mostrar estado de carga sutil
  if (isLoading) {
    return (
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
        <div className="h-1.5 sm:h-2 w-12 xs:w-14 sm:w-16 bg-border rounded-full overflow-hidden animate-pulse">
          <div className="h-full w-1/2 bg-primary/30 rounded-full" />
        </div>
      </div>
    );
  }

  // Si hay error, mostrar barra vacía como indicador visual (mejor UX que desaparecer)
  if (error) {
    return (
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 opacity-50">
        <div className="h-1.5 sm:h-2 w-12 xs:w-14 sm:w-16 bg-border rounded-full overflow-hidden" />
      </div>
    );
  }

  // Si no hay datos, no mostrar nada
  if (!data) {
    return null;
  }

  const progress = data;

  // No mostrar si no hay nivel actual y no hay producción
  if (!progress.currentLevel && progress.annualProduction === 0) {
    return null;
  }

  // Determinar nivel a mostrar (actual o siguiente si no hay actual)
  const displayLevel = progress.currentLevel || progress.nextLevel;
  const levelName = displayLevel?.level || 'Sin nivel';
  const goalUsd = displayLevel?.annualGoalUsd || 0;
  const commissionPercentage = displayLevel?.percentage || '0';

  // Calcular porcentaje visual (cap at 100% para la barra, pero mostrar el real)
  const visualProgressPercentage = Math.min(progress.progressPercentage, 100);

  return (
    <button
      onClick={handleClick}
      className={[
        // Base styles
        'flex items-center gap-1 sm:gap-1.5 md:gap-2',
        'hover:opacity-80 active:scale-[0.98]',
        'transition-all duration-200',
        'cursor-pointer',
        // Focus styles
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'rounded-lg',
        // Padding for touch target - más compacto en móvil
        'py-0.5 px-1 sm:py-1 sm:px-2',
        // Responsive layout
        'min-w-0',
      ].join(' ')}
      aria-label={`Plan de carrera: ${levelName}, ${formatProgressPercentage(progress.progressPercentage)} completado`}
      type="button"
    >
      {/* Nivel actual - oculto en pantallas muy pequeñas, visible desde sm */}
      <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap text-text-secondary shrink-0">
        {levelName}
      </span>

      {/* Barra de progreso visual - responsive width, siempre visible */}
      <div className="flex items-center w-12 xs:w-14 sm:w-16 md:w-20 lg:w-24 flex-shrink-0">
        <div className="relative w-full h-1.5 sm:h-2 bg-border rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${visualProgressPercentage}%` }}
          />
        </div>
      </div>

      {/* Info condensada - oculta en pantallas medianas, visible en grandes */}
      <span className="hidden lg:inline text-xs text-text-muted whitespace-nowrap truncate">
        {formatLevelPercentage(commissionPercentage)} •{' '}
        {formatProgressPercentage(progress.progressPercentage)}
      </span>

      {/* Info completa - solo en pantallas extra grandes */}
      <span className="hidden xl:inline text-xs text-text-muted whitespace-nowrap">
        / {formatAnnualGoal(goalUsd)}
      </span>
    </button>
  );
}
