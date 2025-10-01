import { ContactStatus } from '../types/crm';

// Configuración de estados personalizable por el usuario
export interface StatusConfiguration {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
  order: number;
  isActive: boolean;
}

// Configuración por defecto de estados
export const DEFAULT_STATUS_CONFIG: Record<ContactStatus, StatusConfiguration> = {
  'Prospecto': {
    id: 'prospecto',
    label: 'Prospecto',
    color: 'text-cactus-700',
    bgColor: 'bg-cactus-50',
    borderColor: 'border-cactus-200',
    emoji: '🎯',
    order: 1,
    isActive: true
  },
  'Contactado': {
    id: 'contactado',
    label: 'Contactado',
    color: 'text-oasis-700',
    bgColor: 'bg-oasis-50',
    borderColor: 'border-oasis-200',
    emoji: '📞',
    order: 2,
    isActive: true
  },
  'Primera Reunion': {
    id: 'primera-reunion',
    label: 'Primera Reunión',
    color: 'text-sunlight-700',
    bgColor: 'bg-sunlight-50',
    borderColor: 'border-sunlight-200',
    emoji: '🤝',
    order: 3,
    isActive: true
  },
  'Segunda Reunion': {
    id: 'segunda-reunion',
    label: 'Segunda Reunión',
    color: 'text-terracotta-700',
    bgColor: 'bg-terracotta-50',
    borderColor: 'border-terracotta-200',
    emoji: '💼',
    order: 4,
    isActive: true
  },
  'Apertura': {
    id: 'apertura',
    label: 'Apertura',
    color: 'text-cactus-800',
    bgColor: 'bg-cactus-100',
    borderColor: 'border-cactus-300',
    emoji: '🔓',
    order: 5,
    isActive: true
  },
  'Cliente': {
    id: 'cliente',
    label: 'Cliente',
    color: 'text-oasis-800',
    bgColor: 'bg-oasis-100',
    borderColor: 'border-oasis-300',
    emoji: '✅',
    order: 6,
    isActive: true
  },
  'Caido': {
    id: 'caido',
    label: 'Caído',
    color: 'text-error-700',
    bgColor: 'bg-error-50',
    borderColor: 'border-error-200',
    emoji: '❌',
    order: 7,
    isActive: true
  },
  'Cuenta Vacia': {
    id: 'cuenta-vacia',
    label: 'Cuenta Vacía',
    color: 'text-neutral-700',
    bgColor: 'bg-neutral-50',
    borderColor: 'border-neutral-200',
    emoji: '📭',
    order: 8,
    isActive: true
  }
};

// Configuración de flujos personalizables
export interface StatusFlowConfiguration {
  name: string;
  description: string;
  flow: ContactStatus[];
  isDefault: boolean;
}

export const DEFAULT_FLOWS: StatusFlowConfiguration[] = [
  {
    name: 'Flujo Principal',
    description: 'Flujo estándar de ventas',
    flow: ['Prospecto', 'Contactado', 'Primera Reunion', 'Segunda Reunion', 'Apertura', 'Cliente'],
    isDefault: true
  },
  {
    name: 'Flujo Rápido',
    description: 'Para clientes que avanzan rápidamente',
    flow: ['Prospecto', 'Contactado', 'Apertura', 'Cliente'],
    isDefault: false
  },
  {
    name: 'Flujo Completo',
    description: 'Incluye todos los estados posibles',
    flow: ['Prospecto', 'Contactado', 'Primera Reunion', 'Segunda Reunion', 'Apertura', 'Cliente', 'Caido', 'Cuenta Vacia'],
    isDefault: false
  }
];

// Funciones para gestionar la configuración
export class StatusConfigManager {
  private static STORAGE_KEY = 'cactus_crm_status_config';
  private static FLOW_STORAGE_KEY = 'cactus_crm_flow_config';

  // Obtener configuración de estados (desde localStorage o por defecto)
  static getStatusConfig(): Record<ContactStatus, StatusConfiguration> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Error al cargar configuración de estados:', error);
    }
    return DEFAULT_STATUS_CONFIG;
  }

  // Guardar configuración de estados
  static saveStatusConfig(config: Record<ContactStatus, StatusConfiguration>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error al guardar configuración de estados:', error);
    }
  }

  // Obtener configuración de flujos
  static getFlowConfig(): StatusFlowConfiguration[] {
    try {
      const stored = localStorage.getItem(this.FLOW_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Error al cargar configuración de flujos:', error);
    }
    return DEFAULT_FLOWS;
  }

  // Guardar configuración de flujos
  static saveFlowConfig(flows: StatusFlowConfiguration[]): void {
    try {
      localStorage.setItem(this.FLOW_STORAGE_KEY, JSON.stringify(flows));
    } catch (error) {
      console.error('Error al guardar configuración de flujos:', error);
    }
  }

  // Obtener flujo por defecto
  static getDefaultFlow(): ContactStatus[] {
    const flows = this.getFlowConfig();
    const defaultFlow = flows.find(f => f.isDefault);
    return defaultFlow ? defaultFlow.flow : DEFAULT_FLOWS[0].flow;
  }

  // Resetear a configuración por defecto
  static resetToDefault(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.FLOW_STORAGE_KEY);
  }
}

// Hook para usar la configuración de estados
export const useStatusConfig = () => {
  const getConfig = () => StatusConfigManager.getStatusConfig();
  const saveConfig = (config: Record<ContactStatus, StatusConfiguration>) => {
    StatusConfigManager.saveStatusConfig(config);
  };
  
  const getFlows = () => StatusConfigManager.getFlowConfig();
  const saveFlows = (flows: StatusFlowConfiguration[]) => {
    StatusConfigManager.saveFlowConfig(flows);
  };

  const getDefaultFlow = () => StatusConfigManager.getDefaultFlow();
  
  return {
    getConfig,
    saveConfig,
    getFlows,
    saveFlows,
    getDefaultFlow,
    resetToDefault: StatusConfigManager.resetToDefault
  };
};