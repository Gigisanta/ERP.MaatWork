'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getUserCareerProgress } from '@/lib/api/career-plan';
import type { UserCareerProgress } from '@/types/career-plan';
import { Text } from '@cactus/ui';
import { formatProgressPercentage, formatAnnualGoal, formatLevelPercentage } from '@/lib/utils/career-plan';

// Fetcher para SWR usando la función del cliente API
const fetcher = async (): Promise<UserCareerProgress> => {
  const response = await getUserCareerProgress();
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener progreso');
  }
  return response.data;
};

export default function CareerProgressBar() {
  const router = useRouter();
  const { data, error } = useSWR<UserCareerProgress>(
    'career-plan-user-progress',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache por 60 segundos
      shouldRetryOnError: false
    }
  );

  if (error || !data) {
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

  const handleClick = () => {
    router.push('/plandecarrera');
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
      aria-label="Ver plan de carrera"
      type="button"
    >
      {/* Nivel actual */}
      <span className="text-xs font-medium whitespace-nowrap ml-2">
        {levelName}
      </span>

      {/* Barra de progreso visual */}
      <div className="flex items-center mx-2 min-w-[100px] max-w-[150px] flex-shrink-0">
        <div className="relative w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${visualProgressPercentage}%` }}
          />
        </div>
      </div>

      {/* Porcentaje de comisión, progreso y objetivo en línea */}
      <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
        % Comisión: {formatLevelPercentage(commissionPercentage).replace('%', '')} • {formatProgressPercentage(progress.progressPercentage)} / {formatAnnualGoal(goalUsd)}
      </span>
    </button>
  );
}

