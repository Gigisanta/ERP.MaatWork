/**
 * Sistema de Colores Centralizado - Identidad Cactus
 * 
 * Este archivo define la paleta de colores oficial basada en la identidad Cactus.
 * Todos los componentes deben usar estos colores para mantener consistencia visual.
 */

// Sistema de Colores Cactus Dashboard V2
// Nueva paleta semántica inspirada en la naturaleza del desierto

// Paleta de colores primarios
export const cactusColors = {
  // Cactus (Verde Principal - Color de Marca)
  cactus: {
    50: '#F0FFF6',
    100: '#DFFBEA',
    200: '#C8F6DC',
    300: '#A6EDC8',
    400: '#7FE5B0',
    500: '#55DFA0', // Color principal de marca
    600: '#2CCB86',
    700: '#16B273',
    800: '#0E8E5B',
    900: '#0C7048',
    950: '#0A5A3A',
    main: '#55DFA0',
  },

  // Oasis (Azul Agua)
  oasis: {
    500: '#2AADC7',
    600: '#1E92AB',
    700: '#18778C',
    800: '#145E6F',
    main: '#2AADC7',
  },

  // Terracotta (Rojo Tierra)
  terracotta: {
    500: '#DC6A52',
    600: '#C45542',
    700: '#A34539',
    main: '#DC6A52',
  },

  // Pear (Violeta)
  pear: {
    500: '#8E63EB',
    600: '#7448D4',
    700: '#5F3CB1',
    main: '#8E63EB',
  },

  // Sunlight (Amarillo Dorado)
  sunlight: {
    500: '#FFB300',
    600: '#E79F00',
    700: '#C48600',
    main: '#FFB300',
  },

  // Error (Rojo Peligro)
  error: {
    600: '#BA3737',
    700: '#992E2E',
    main: '#BA3737',
  },

  // Colores Neutros (Sistema)
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAF9',
    100: '#F2F5F4',
    200: '#E6EBE9',
    300: '#D5DDDA',
    400: '#BFCBC7',
    500: '#A5B5B0',
    600: '#7F9190',
    700: '#5D6E6C',
    800: '#3B4A49',
    900: '#1E2726',
    950: '#0E1413',
  },

  // Colores semánticos para estados
  success: {
    main: '#55DFA0', // Mapea a cactus-500
    dark: '#16B273', // Mapea a cactus-700
  },

  warning: {
    main: '#FFB300', // Mapea a sunlight-500
    dark: '#C48600', // Mapea a sunlight-700
  },

  info: {
    main: '#2AADC7', // Mapea a oasis-500
    dark: '#18778C', // Mapea a oasis-700
  },

  danger: {
    main: '#BA3737', // Mapea a error-600
    dark: '#992E2E', // Mapea a error-700
  },

  // Colores de fondo semánticos
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAF9',
    tertiary: '#F2F5F4',
    accent: '#F0FFF6',
    overlay: 'rgba(30, 39, 38, 0.5)',
  },

  // Colores de texto semánticos
  text: {
    primary: '#1E2726',
    secondary: '#3B4A49',
    muted: '#5D6E6C',
    inverse: '#FFFFFF',
    accent: '#55DFA0',
    brand: '#55DFA0',
  },

  // Colores de borde semánticos
  border: {
    light: '#E6EBE9',
    medium: '#D5DDDA',
    dark: '#BFCBC7',
    accent: '#55DFA0',
    focus: '#2CCB86',
  },
};

/**
 * Mapeo de colores para estados específicos
 */
export const StatusColors = {
  // Estados de contactos CRM
  contact: {
    prospecto: cactusColors.sunlight.main,
    contactado: cactusColors.oasis.main,
    'primera-reunion': cactusColors.cactus.main,
    'segunda-reunion': cactusColors.pear.main,
    'reunion-cierre': cactusColors.terracotta.main,
    apertura: cactusColors.success.main,
    cliente: cactusColors.success.main,
    'cuenta-vacia': cactusColors.neutral[400],
  },

  // Estados de tareas
  task: {
    pending: cactusColors.sunlight.main,
    'in-progress': cactusColors.oasis.main,
    completed: cactusColors.success.main,
    cancelled: cactusColors.danger.main,
  },

  // Prioridades
  priority: {
    high: cactusColors.danger.main,
    medium: cactusColors.sunlight.main,
    low: cactusColors.success.main,
  },

  // Estados de usuario
  user: {
    active: cactusColors.success.main,
    inactive: cactusColors.danger.main,
    pending: cactusColors.sunlight.main,
  },
} as const;

// Mapeo de colores para diferentes estados de contactos
export const contactStatusColors = {
  'Prospecto': cactusColors.sunlight.main,
  'Cliente Activo': cactusColors.success.main,
  'Cliente Inactivo': cactusColors.neutral[400],
  'Lead Caliente': cactusColors.terracotta.main,
  'Lead Frío': cactusColors.oasis.main,
  'Seguimiento': cactusColors.cactus.main,
} as const;

// Mapeo de colores para diferentes estados de tareas
export const taskStatusColors = {
  'Pendiente': cactusColors.sunlight.main,
  'En Progreso': cactusColors.oasis.main,
  'Completada': cactusColors.success.main,
  'Cancelada': cactusColors.neutral[400],
  'Vencida': cactusColors.danger.main,
} as const;

// Mapeo de colores para prioridades
export const priorityColors = {
  'Alta': cactusColors.danger.main,
  'Media': cactusColors.sunlight.main,
  'Baja': cactusColors.success.main,
} as const;

// Mapeo de colores para diferentes tipos de usuario
export const userRoleColors = {
  'Admin': cactusColors.cactus[600],
  'Manager': cactusColors.oasis[600],
  'Vendedor': cactusColors.success.main,
  'Soporte': cactusColors.pear[600],
} as const;

/**
 * Utilidades para generar clases de Tailwind con nueva paleta
 */
export const generateTailwindClasses = {
  // Generar clases de fondo
  bg: (color: keyof typeof cactusColors, shade: number | string = 500) => {
    return `bg-${color}-${shade}`;
  },
  
  // Generar clases de texto
  text: (color: keyof typeof cactusColors, shade: number | string = 500) => {
    return `text-${color}-${shade}`;
  },
  
  // Generar clases de borde
  border: (color: keyof typeof cactusColors, shade: number | string = 500) => {
    return `border-${color}-${shade}`;
  },
  
  // Generar clases de hover
  hover: {
    bg: (color: keyof typeof cactusColors, shade: number | string = 600) => {
      return `hover:bg-${color}-${shade}`;
    },
    text: (color: keyof typeof cactusColors, shade: number | string = 600) => {
      return `hover:text-${color}-${shade}`;
    },
  },
};

/**
 * Función para obtener colores de estado de contacto
 */
export const getContactStatusColor = (status: string): { bg: string; text: string } => {
  const statusKey = status.toLowerCase().replace(/\s+/g, '-') as keyof typeof StatusColors.contact;
  const bgColor = StatusColors.contact[statusKey] || cactusColors.neutral[200];
  
  return {
    bg: bgColor,
    text: cactusColors.text.primary,
  };
};

/**
 * Obtener color por estado con nueva paleta
 */
export const getStatusColor = (status: string, type: 'contact' | 'task' | 'priority' | 'user') => {
  const statusKey = status.toLowerCase().replace(/\s+/g, '-');
  return StatusColors[type][statusKey] || cactusColors.neutral[400];
};

/**
 * Función para obtener colores de prioridad
 */
export const getPriorityColor = (priority: 'high' | 'medium' | 'low'): string => {
  return StatusColors.priority[priority];
};

/**
 * Función para obtener colores de estado de tarea
 */
export const getTaskStatusColor = (status: string): { bg: string; text: string } => {
  const statusKey = status.replace(/\s+/g, '-') as keyof typeof StatusColors.task;
  const bgColor = StatusColors.task[statusKey] || cactusColors.neutral[200];
  
  return {
    bg: bgColor,
    text: cactusColors.text.primary,
  };
};

/**
 * Obtener color de contraste para texto
 */
export const getContrastColor = (backgroundColor: string): string => {
  // Lógica mejorada para determinar contraste con nueva paleta
  const lightColors = ['0', '50', '100', '200', '300'];
  const isLight = lightColors.some(shade => backgroundColor.includes(shade));
  return isLight ? cactusColors.text.primary : cactusColors.text.inverse;
};

/**
 * Paleta de colores para gráficos y charts con nueva paleta Cactus Dashboard
 */
export const chartColors = {
  primary: [
    cactusColors.cactus.main,
    cactusColors.oasis.main,
    cactusColors.terracotta.main,
    cactusColors.pear.main,
    cactusColors.sunlight.main
  ],
  pastel: [
    cactusColors.cactus[200],
    cactusColors.neutral[200],
    cactusColors.cactus[100],
    cactusColors.neutral[100],
    cactusColors.cactus[50]
  ],
  dark: [
    cactusColors.cactus[700],
    cactusColors.oasis[700],
    cactusColors.terracotta[700],
    cactusColors.pear[700],
    cactusColors.sunlight[700]
  ],
} as const;

/**
 * Configuración de Layout para resolver inconsistencias main/div
 */
export const LayoutConfig = {
  // Jerarquía de fondos
  backgrounds: {
    app: 'bg-gradient-to-br from-cactus-50 via-cactus-100 to-cactus-200',
    content: 'bg-transparent backdrop-blur-sm',
    card: 'bg-white/90 backdrop-blur-md',
  },
  
  // Consolidación del header
  header: {
    compact: true,
    spacing: 'space-x-2', // Reducido de space-x-4
    elements: {
      breadcrumb: 'text-sm text-cactus-700 hover:text-cactus-800',
      icon: 'w-4 h-4 text-cactus-600',
      separator: 'text-cactus-400',
    }
  }
} as const;

/**
 * Sistema de temas Cactus expandido
 */
export const CactusTheme = {
  // Colores de componentes específicos
  button: {
    primary: {
      bg: cactusColors.cactus[500],
      hover: cactusColors.cactus[600],
      text: 'white',
      classes: 'bg-cactus-500 hover:bg-cactus-600 text-white',
    },
    success: {
      bg: cactusColors.success.main,
      hover: cactusColors.success.dark,
      text: 'white',
      classes: 'bg-success-500 hover:bg-success-600 text-white',
    },
    error: {
      bg: cactusColors.error.main,
      hover: cactusColors.error[700],
      text: 'white',
      classes: 'bg-error-500 hover:bg-error-600 text-white',
    },
    warning: {
      bg: cactusColors.warning.main,
      hover: cactusColors.warning.dark,
      text: 'white',
      classes: 'bg-warning-500 hover:bg-warning-600 text-white',
    },
  },
  
  // Estados de CRM específicos
  crmStatus: {
    prospecto: {
      bg: cactusColors.cactus[100],
      border: cactusColors.cactus[200],
      text: cactusColors.cactus[800],
      classes: 'bg-cactus-100 border-cactus-200 text-cactus-800',
    },
    cliente: {
      bg: cactusColors.success.main,
      border: cactusColors.cactus[200],
      text: cactusColors.cactus[800],
      classes: 'bg-success-100 border-success-200 text-success-800',
    },
    contactado: {
      bg: cactusColors.oasis[500],
      border: cactusColors.oasis[600],
      text: cactusColors.neutral[0],
      classes: 'bg-info-100 border-info-200 text-info-800',
    },
    'primera-reunion': {
      bg: cactusColors.sunlight[500],
      border: cactusColors.sunlight[600],
      text: cactusColors.neutral[0],
      classes: 'bg-warning-100 border-warning-200 text-warning-800',
    },
  },
  
  // Métricas y rankings
  metrics: {
    excellent: {
      bg: cactusColors.cactus[100],
      text: cactusColors.cactus[800],
      classes: 'bg-success-100 text-success-800',
    },
    good: {
      bg: cactusColors.cactus[100],
      text: cactusColors.cactus[800],
      classes: 'bg-cactus-100 text-cactus-800',
    },
    average: {
      bg: cactusColors.sunlight[500],
      text: cactusColors.neutral[0],
      classes: 'bg-warning-100 text-warning-800',
    },
    poor: {
      bg: cactusColors.error[600],
      text: cactusColors.neutral[0],
      classes: 'bg-error-100 text-error-800',
    },
  },
} as const;

/**
 * Variables CSS para modo oscuro
 */
export const darkModeVariables = {
  '--color-bg': cactusColors.neutral[950],
  '--color-surface': cactusColors.neutral[900],
  '--color-text': cactusColors.neutral[50],
  '--color-muted': cactusColors.neutral[400],
  '--color-brand': cactusColors.cactus[400],
  '--color-brand-strong': cactusColors.cactus[300],
  '--color-success': cactusColors.cactus[400],
  '--color-warning': cactusColors.sunlight[400],
  '--color-danger': cactusColors.error[600],
  '--color-info': cactusColors.oasis[400],
} as const;

/**
 * Variables CSS para modo claro
 */
export const lightModeVariables = {
  '--color-bg': cactusColors.neutral[0],
  '--color-surface': cactusColors.neutral[50],
  '--color-text': cactusColors.neutral[900],
  '--color-muted': cactusColors.neutral[600],
  '--color-brand': cactusColors.cactus[500],
  '--color-brand-strong': cactusColors.cactus[600],
  '--color-success': cactusColors.cactus[500],
  '--color-warning': cactusColors.sunlight[500],
  '--color-danger': cactusColors.error[600],
  '--color-info': cactusColors.oasis[500],
} as const;

/**
 * Design Tokens centralizados
 */
export const DesignTokens = {
  color: {
    background: {
      primary: cactusColors.background.primary,
      secondary: cactusColors.background.secondary,
      card: cactusColors.neutral[0],
      gradient: 'linear-gradient(135deg, #F0FFF6 0%, #DFFBEA 50%, #C8F6DC 100%)',
    },
    text: {
      primary: cactusColors.text.primary,
      secondary: cactusColors.text.secondary,
      muted: cactusColors.text.muted,
      inverse: cactusColors.text.inverse,
    },
    border: {
      light: cactusColors.border.light,
      medium: cactusColors.border.medium,
      dark: cactusColors.border.dark,
    },
    semantic: {
      success: cactusColors.success.main,
      warning: cactusColors.warning.main,
      error: cactusColors.danger.main,
      info: cactusColors.info.main,
    },
  },
  spacing: {
    header: {
      compact: '0.5rem', // 8px
      normal: '1rem',     // 16px
    },
  },
} as const;

// Exportar como default para compatibilidad
export default cactusColors;

// Mantener exportación legacy para compatibilidad
export const CactusColors = cactusColors;