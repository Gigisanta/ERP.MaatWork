/**
 * Utilidades de Colores - Paleta Cactus Dashboard
 * 
 * Funciones helper para trabajar con la nueva paleta de colores,
 * incluyendo conversiones, validaciones y utilidades para modo oscuro.
 */

import { CactusDashboardTokens, resolveToken } from '../styles/design-tokens';

/**
 * Convierte un color hex a RGB
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Convierte RGB a formato CSS
 */
export const rgbToCss = (r: number, g: number, b: number, alpha?: number): string => {
  return alpha !== undefined ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
};

/**
 * Obtiene un color con opacidad
 */
export const getColorWithOpacity = (color: string, opacity: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  return rgbToCss(rgb.r, rgb.g, rgb.b, opacity);
};

/**
 * Obtiene el color de contraste apropiado (blanco o negro)
 */
export const getContrastColor = (backgroundColor: string): string => {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';
  
  // Fórmula de luminancia relativa
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

/**
 * Paleta de colores para estados
 */
export const getStateColor = (state: 'success' | 'warning' | 'error' | 'info', shade: 'light' | 'medium' | 'dark' = 'medium'): string => {
  const stateMap = {
    success: {
      light: CactusDashboardTokens.colors.cactus[400],
      medium: CactusDashboardTokens.colors.cactus[600],
      dark: CactusDashboardTokens.colors.cactus[800]
    },
    warning: {
      light: CactusDashboardTokens.colors.sunlight[500],
      medium: CactusDashboardTokens.colors.sunlight[600],
      dark: CactusDashboardTokens.colors.sunlight[700]
    },
    error: {
      light: CactusDashboardTokens.colors.terracotta[500],
      medium: CactusDashboardTokens.colors.error[600],
      dark: CactusDashboardTokens.colors.error[700]
    },
    info: {
      light: CactusDashboardTokens.colors.oasis[500],
      medium: CactusDashboardTokens.colors.oasis[600],
      dark: CactusDashboardTokens.colors.oasis[700]
    }
  };
  
  return stateMap[state][shade];
};

/**
 * Obtiene colores para gráficos con buena diferenciación
 */
export const getChartColors = (count: number): string[] => {
  const baseColors = CactusDashboardTokens.charts.ordinal;
  
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }
  
  // Si necesitamos más colores, generamos variaciones
  const colors: string[] = [...baseColors];
  const variations = ['400', '600', '800'];
  
  while (colors.length < count) {
    baseColors.forEach((_, index) => {
      if (colors.length >= count) return;
      
      const colorFamily = Object.keys(CactusDashboardTokens.colors)[index % 5]; // cactus, oasis, terracotta, pear, sunlight
      const variation = variations[Math.floor(colors.length / baseColors.length) % variations.length];
      
      if (colorFamily && CactusDashboardTokens.colors[colorFamily as keyof typeof CactusDashboardTokens.colors]) {
        const colorValue = (CactusDashboardTokens.colors[colorFamily as keyof typeof CactusDashboardTokens.colors] as any)[variation];
        if (colorValue) {
          colors.push(colorValue);
        }
      }
    });
  }
  
  return colors.slice(0, count);
};

/**
 * Genera gradiente CSS para un color específico
 */
export const generateGradient = (color: string, direction: string = '135deg', opacity: number = 1): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return `linear-gradient(${direction}, ${color}, ${color})`;
  
  const lightColor = rgbToCss(
    Math.min(255, rgb.r + 30),
    Math.min(255, rgb.g + 30),
    Math.min(255, rgb.b + 30),
    opacity
  );
  
  const darkColor = rgbToCss(
    Math.max(0, rgb.r - 30),
    Math.max(0, rgb.g - 30),
    Math.max(0, rgb.b - 30),
    opacity
  );
  
  return `linear-gradient(${direction}, ${lightColor} 0%, ${color} 50%, ${darkColor} 100%)`;
};

/**
 * Utilidades para modo oscuro
 */
export const getDarkModeColor = (lightColor: string): string => {
  // Mapeo de colores claros a oscuros
  const darkModeMap: Record<string, string> = {
    [CactusDashboardTokens.colors.neutral[50]]: CactusDashboardTokens.colors.neutral[950],
    [CactusDashboardTokens.colors.neutral[100]]: CactusDashboardTokens.colors.neutral[900],
    [CactusDashboardTokens.colors.neutral[200]]: CactusDashboardTokens.colors.neutral[800],
    [CactusDashboardTokens.colors.neutral[300]]: CactusDashboardTokens.colors.neutral[700],
    [CactusDashboardTokens.colors.neutral[400]]: CactusDashboardTokens.colors.neutral[600],
    [CactusDashboardTokens.colors.neutral[0]]: CactusDashboardTokens.colors.neutral[900],
    [CactusDashboardTokens.colors.cactus[500]]: CactusDashboardTokens.colors.cactus[600],
    [CactusDashboardTokens.colors.cactus[600]]: CactusDashboardTokens.colors.cactus[500]
  };
  
  return darkModeMap[lightColor] || lightColor;
};

/**
 * Valida si un color es válido
 */
export const isValidColor = (color: string): boolean => {
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const rgbPattern = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
  const rgbaPattern = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[01]?(?:\.\d+)?\s*\)$/;
  
  return hexPattern.test(color) || rgbPattern.test(color) || rgbaPattern.test(color);
};

/**
 * Obtiene el color de borde apropiado basado en el fondo
 */
export const getBorderColor = (backgroundColor: string, intensity: 'light' | 'medium' | 'strong' = 'medium'): string => {
  const intensityMap = {
    light: CactusDashboardTokens.colors.neutral[200],
    medium: CactusDashboardTokens.colors.neutral[300],
    strong: CactusDashboardTokens.colors.neutral[400]
  };
  
  return intensityMap[intensity];
};

/**
 * Colores predefinidos para diferentes tipos de métricas
 */
export const getMetricColor = (type: 'revenue' | 'users' | 'conversion' | 'engagement' | 'performance'): string => {
  const metricColors = {
    revenue: CactusDashboardTokens.colors.cactus[600],
    users: CactusDashboardTokens.colors.oasis[600],
    conversion: CactusDashboardTokens.colors.sunlight[600],
    engagement: CactusDashboardTokens.colors.pear[600],
    performance: CactusDashboardTokens.colors.terracotta[600]
  };
  
  return metricColors[type];
};

/**
 * Exporta todos los colores de la paleta para fácil acceso
 */
export const CactusColors = {
  ...CactusDashboardTokens.colors,
  gradients: CactusDashboardTokens.gradients,
  charts: CactusDashboardTokens.charts
} as const;

export type CactusColorFamily = keyof typeof CactusColors;
export type CactusColorShade = keyof typeof CactusColors.cactus;