import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ContactStatus, DEFAULT_STATUS_FLOW, ALTERNATIVE_STATUS_PATHS } from '../types/crm';
import { cn } from '../utils/cn';

interface StatusButtonProps {
  currentStatus: ContactStatus;
  onStatusChange: (newStatus: ContactStatus) => void;
  className?: string;
  disabled?: boolean;
}

// Configuración de colores para cada estado con gradientes modernos
const statusConfig: Record<ContactStatus, {
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
  label: string;
  gradient: string;
  hoverGradient: string;
}> = {
  'Prospecto': {
    color: 'text-cactus-800',
    bgColor: 'from-cactus-100 to-cactus-200',
    borderColor: 'border-cactus-300',
    gradient: 'bg-gradient-to-br from-cactus-50 via-cactus-100 to-cactus-150',
    hoverGradient: 'hover:from-cactus-100 hover:to-cactus-250',
    emoji: '🎯',
    label: 'Prospecto'
  },
  'Contactado': {
    color: 'text-oasis-800',
    bgColor: 'from-oasis-100 to-oasis-200',
    borderColor: 'border-oasis-300',
    gradient: 'bg-gradient-to-br from-oasis-50 via-oasis-100 to-oasis-150',
    hoverGradient: 'hover:from-oasis-100 hover:to-oasis-250',
    emoji: '📞',
    label: 'Contactado'
  },
  'Primera Reunion': {
    color: 'text-sunlight-800',
    bgColor: 'from-sunlight-100 to-sunlight-200',
    borderColor: 'border-sunlight-300',
    gradient: 'bg-gradient-to-br from-sunlight-50 via-sunlight-100 to-sunlight-150',
    hoverGradient: 'hover:from-sunlight-100 hover:to-sunlight-250',
    emoji: '🤝',
    label: 'Primera Reunión'
  },
  'Segunda Reunion': {
    color: 'text-terracotta-800',
    bgColor: 'from-terracotta-100 to-terracotta-200',
    borderColor: 'border-terracotta-300',
    gradient: 'bg-gradient-to-br from-terracotta-50 via-terracotta-100 to-terracotta-150',
    hoverGradient: 'hover:from-terracotta-100 hover:to-terracotta-250',
    emoji: '💼',
    label: 'Segunda Reunión'
  },
  'Apertura': {
    color: 'text-cactus-900',
    bgColor: 'from-cactus-200 to-cactus-300',
    borderColor: 'border-cactus-400',
    gradient: 'bg-gradient-to-br from-cactus-100 via-cactus-200 to-cactus-250',
    hoverGradient: 'hover:from-cactus-200 hover:to-cactus-350',
    emoji: '🔓',
    label: 'Apertura'
  },
  'Cliente': {
    color: 'text-oasis-900',
    bgColor: 'from-oasis-200 to-oasis-300',
    borderColor: 'border-oasis-400',
    gradient: 'bg-gradient-to-br from-oasis-100 via-oasis-200 to-oasis-250',
    hoverGradient: 'hover:from-oasis-200 hover:to-oasis-350',
    emoji: '✅',
    label: 'Cliente'
  },
  'Caido': {
    color: 'text-error-800',
    bgColor: 'from-error-100 to-error-200',
    borderColor: 'border-error-300',
    gradient: 'bg-gradient-to-br from-error-50 via-error-100 to-error-150',
    hoverGradient: 'hover:from-error-100 hover:to-error-250',
    emoji: '❌',
    label: 'Caído'
  },
  'Cuenta Vacia': {
    color: 'text-neutral-800',
    bgColor: 'from-neutral-100 to-neutral-200',
    borderColor: 'border-neutral-300',
    gradient: 'bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-150',
    hoverGradient: 'hover:from-neutral-100 hover:to-neutral-250',
    emoji: '📭',
    label: 'Cuenta Vacía'
  }
};

const StatusButton: React.FC<StatusButtonProps> = ({
  currentStatus,
  onStatusChange,
  className = '',
  disabled = false
}) => {
  const currentConfig = statusConfig[currentStatus];
  
  // Obtener el siguiente estado en el flujo principal
  const getNextStatus = (): ContactStatus | null => {
    const currentIndex = DEFAULT_STATUS_FLOW.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < DEFAULT_STATUS_FLOW.length - 1) {
      return DEFAULT_STATUS_FLOW[currentIndex + 1];
    }
    return null;
  };

  const nextStatus = getNextStatus();

  const handleQuickAdvance = () => {
    if (nextStatus && !disabled) {
      onStatusChange(nextStatus);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Botón principal unificado */}
      <button
        onClick={handleQuickAdvance}
        disabled={disabled || !nextStatus}
        className={cn(
          'group relative w-full flex items-center gap-3 px-5 py-4 text-sm font-semibold rounded-2xl border-2 transition-all duration-500 ease-out overflow-hidden',
          'shadow-lg hover:shadow-2xl transform hover:scale-[1.03] active:scale-[0.97]',
          currentConfig.gradient,
          currentConfig.color,
          currentConfig.borderColor,
          currentConfig.hoverGradient,
          !disabled && nextStatus && 'hover:brightness-105 cursor-pointer hover:-translate-y-0.5',
          disabled || !nextStatus ? 'opacity-50 cursor-not-allowed grayscale saturate-50' : '',
          'backdrop-blur-sm before:absolute before:inset-0 before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300'
        )}
        title={nextStatus ? `Avanzar a ${statusConfig[nextStatus].label}` : 'No hay siguiente estado'}
      >
        {/* Efecto de brillo */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        
        <span className="relative text-xl drop-shadow-md filter brightness-110">{currentConfig.emoji}</span>
        <span className="relative flex-1 text-left font-bold tracking-wide text-shadow-sm">{currentConfig.label}</span>
        {nextStatus && (
          <div className="relative flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2 py-1 rounded-full">Siguiente</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        )}
      </button>


    </div>
  );
};

export default StatusButton;