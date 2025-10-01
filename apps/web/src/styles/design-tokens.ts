/**
 * Design Tokens - Paleta Cactus Dashboard
 * 
 * Sistema completo de colores basado en la nueva identidad Cactus Dashboard.
 * Incluye colores primarios, temáticos, semánticos, estados y soporte para modo oscuro.
 */

export const CactusDashboardTokens = {
  // Colores principales de la identidad Cactus
  colors: {
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
      950: '#0A5A3A'
    },
    
    // Oasis (Azul Agua)
    oasis: {
      500: '#2AADC7',
      600: '#1E92AB',
      700: '#18778C',
      800: '#145E6F'
    },
    
    // Terracotta (Rojo Tierra)
    terracotta: {
      500: '#DC6A52',
      600: '#C45542',
      700: '#A34539'
    },
    
    // Pear (Violeta)
    pear: {
      500: '#8E63EB',
      600: '#7448D4',
      700: '#5F3CB1'
    },
    
    // Sunlight (Amarillo Dorado)
    sunlight: {
      500: '#FFB300',
      600: '#E79F00',
      700: '#C48600'
    },
    
    // Error (Rojo Peligro)
    error: {
      600: '#BA3737',
      700: '#992E2E'
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
      950: '#0E1413'
    }
  },
  
  // Colores Semánticos
  semantics: {
    bg: 'neutral.50',
    surface: 'neutral.0',
    text: 'neutral.900',
    muted: 'neutral.600',
    brand: 'cactus.500',
    brandStrong: 'cactus.900',
    onBrandStrong: 'neutral.0'
  },
  
  // Estados del Sistema
  states: {
    info: 'oasis.700',
    success: 'cactus.700',
    warning: 'sunlight.700',
    danger: 'error.600',
    onState: 'neutral.0',
    bdSub: 'neutral.200',
    bdStrong: 'neutral.300'
  },
  
  // Modo Oscuro
  dark: {
    bg: 'neutral.950',
    surface: 'neutral.900',
    text: 'neutral.50',
    muted: 'neutral.300',
    brand: 'cactus.600',
    brandStrong: 'cactus.500'
  },
  
  // Colores para Gráficos
  charts: {
    ordinal: [
      '#16B273', // cactus-700
      '#18778C', // oasis-700
      '#A34539', // terracotta-700
      '#5F3CB1', // pear-700
      '#C48600', // sunlight-700
      '#0C7048', // cactus-900
      '#2AADC7', // oasis-500
      '#DC6A52', // terracotta-500
      '#8E63EB', // pear-500
      '#FFB300'  // sunlight-500
    ]
  },
  
  // Gradientes
  gradients: {
    brand: 'linear-gradient(135deg, #F0FFF6 0%, #55DFA0 40%, #0C7048 100%)'
  }
} as const;

/**
 * Función para resolver referencias de tokens
 * Convierte 'neutral.500' a '#A5B5B0'
 */
export const resolveToken = (tokenPath: string): string => {
  const [category, shade] = tokenPath.split('.');
  
  if (category === 'neutral' && shade in CactusDashboardTokens.colors.neutral) {
    return CactusDashboardTokens.colors.neutral[shade as unknown as keyof typeof CactusDashboardTokens.colors.neutral];
  }
  
  if (category === 'cactus' && shade in CactusDashboardTokens.colors.cactus) {
    return CactusDashboardTokens.colors.cactus[shade as unknown as keyof typeof CactusDashboardTokens.colors.cactus];
  }
  
  if (category === 'oasis' && shade in CactusDashboardTokens.colors.oasis) {
    return CactusDashboardTokens.colors.oasis[shade as unknown as keyof typeof CactusDashboardTokens.colors.oasis];
  }
  
  if (category === 'terracotta' && shade in CactusDashboardTokens.colors.terracotta) {
    return CactusDashboardTokens.colors.terracotta[shade as unknown as keyof typeof CactusDashboardTokens.colors.terracotta];
  }
  
  if (category === 'pear' && shade in CactusDashboardTokens.colors.pear) {
    return CactusDashboardTokens.colors.pear[shade as unknown as keyof typeof CactusDashboardTokens.colors.pear];
  }
  
  if (category === 'sunlight' && shade in CactusDashboardTokens.colors.sunlight) {
    return CactusDashboardTokens.colors.sunlight[shade as unknown as keyof typeof CactusDashboardTokens.colors.sunlight];
  }
  
  if (category === 'error' && shade in CactusDashboardTokens.colors.error) {
    return CactusDashboardTokens.colors.error[shade as unknown as keyof typeof CactusDashboardTokens.colors.error];
  }
  
  return tokenPath; // Fallback si no se encuentra
};

/**
 * Colores semánticos resueltos
 */
export const SemanticColors = {
  bg: resolveToken(CactusDashboardTokens.semantics.bg),
  surface: resolveToken(CactusDashboardTokens.semantics.surface),
  text: resolveToken(CactusDashboardTokens.semantics.text),
  muted: resolveToken(CactusDashboardTokens.semantics.muted),
  brand: resolveToken(CactusDashboardTokens.semantics.brand),
  brandStrong: resolveToken(CactusDashboardTokens.semantics.brandStrong),
  onBrandStrong: resolveToken(CactusDashboardTokens.semantics.onBrandStrong)
} as const;

/**
 * Estados del sistema resueltos
 */
export const StateColors = {
  info: resolveToken(CactusDashboardTokens.states.info),
  success: resolveToken(CactusDashboardTokens.states.success),
  warning: resolveToken(CactusDashboardTokens.states.warning),
  danger: resolveToken(CactusDashboardTokens.states.danger),
  onState: resolveToken(CactusDashboardTokens.states.onState),
  bdSub: resolveToken(CactusDashboardTokens.states.bdSub),
  bdStrong: resolveToken(CactusDashboardTokens.states.bdStrong)
} as const;

/**
 * Modo oscuro resuelto
 */
export const DarkModeColors = {
  bg: resolveToken(CactusDashboardTokens.dark.bg),
  surface: resolveToken(CactusDashboardTokens.dark.surface),
  text: resolveToken(CactusDashboardTokens.dark.text),
  muted: resolveToken(CactusDashboardTokens.dark.muted),
  brand: resolveToken(CactusDashboardTokens.dark.brand),
  brandStrong: resolveToken(CactusDashboardTokens.dark.brandStrong)
} as const;

export type ColorToken = keyof typeof CactusDashboardTokens.colors;
export type SemanticToken = keyof typeof SemanticColors;
export type StateToken = keyof typeof StateColors;
export type DarkModeToken = keyof typeof DarkModeColors;