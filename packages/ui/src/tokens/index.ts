// MaatWork Design System v2.3.0
// Single Source of Truth for Design Tokens

import core from './core.json';

export type Theme = 'light' | 'dark' | 'high-contrast';

interface ThemeConfig {
  name: Theme;
  colors: {
    // Brand colors
    primary: string;
    primaryHover: string;
    primaryActive: string;
    secondary: string;
    secondaryHover: string;
    accent: string;
    accentHover: string;
    // Semantic colors
    success: string;
    warning: string;
    error: string;
    info: string;
    // Surface colors
    background: string;
    surface: string;
    surfaceHover: string;
    // Text colors
    text: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;
    // Border colors
    border: string;
    borderHover: string;
  };
}

// MaatWork Brand Colors v2.3.0
// Primary: Soft Purple (Modern, Digital, Friendly)
// Secondary: Warm Stone/Black (Professional, Grounded)
// Accent: Soft Green (Growth, Success)

export const themes: Record<Theme, ThemeConfig> = {
  light: {
    name: 'light',
    colors: {
      // Brand colors
      primary: core.colors.primary[500],
      primaryHover: core.colors.primary[600],
      primaryActive: core.colors.primary[700],
      secondary: core.colors.secondary[900],
      secondaryHover: core.colors.secondary[800],
      accent: core.colors.accent[500],
      accentHover: core.colors.accent[600],
      // Semantic colors
      success: core.colors.success[500],
      warning: core.colors.warning[500],
      error: core.colors.error[500],
      info: core.colors.info[500],
      // Surface colors
      background: core.colors.surface.cream,
      surface: core.colors.surface.light,
      surfaceHover: core.colors.surface.white,
      // Text colors
      text: core.colors.secondary[900],
      textSecondary: core.colors.secondary[600],
      textMuted: core.colors.secondary[500],
      textInverse: core.colors.surface.white,
      // Border colors
      border: core.colors.secondary[200],
      borderHover: core.colors.secondary[300],
    },
  },
  dark: {
    name: 'dark',
    colors: {
      // Brand colors - Lighter purple for dark mode
      primary: core.colors.primary[400],
      primaryHover: core.colors.primary[300],
      primaryActive: core.colors.primary[200],
      secondary: core.colors.surface.white,
      secondaryHover: core.colors.secondary[100],
      accent: core.colors.accent[400],
      accentHover: core.colors.accent[300],
      // Semantic colors
      success: core.colors.success[400],
      warning: core.colors.warning[400],
      error: core.colors.error[400],
      info: core.colors.info[400],
      // Surface colors
      background: core.colors.surface.darker,
      surface: core.colors.surface.dark,
      surfaceHover: core.colors.secondary[800],
      // Text colors
      text: core.colors.surface.white,
      textSecondary: core.colors.secondary[400],
      textMuted: core.colors.secondary[600],
      textInverse: core.colors.secondary[900],
      // Border colors
      border: core.colors.secondary[800],
      borderHover: core.colors.secondary[700],
    },
  },
  'high-contrast': {
    name: 'high-contrast',
    colors: {
      // Brand colors
      primary: core.colors.primary[700],
      primaryHover: core.colors.primary[800],
      primaryActive: core.colors.primary[900],
      secondary: '#000000',
      secondaryHover: '#333333',
      accent: core.colors.accent[700],
      accentHover: core.colors.accent[800],
      // Semantic colors
      success: core.colors.success[700],
      warning: core.colors.warning[700],
      error: core.colors.error[700],
      info: core.colors.info[700],
      // Surface colors
      background: '#ffffff',
      surface: '#ffffff',
      surfaceHover: '#f5f5f5',
      // Text colors
      text: '#000000',
      textSecondary: '#000000',
      textMuted: '#333333',
      textInverse: '#ffffff',
      // Border colors
      border: '#000000',
      borderHover: '#000000',
    },
  },
};

// Export raw tokens for advanced usage
const tokens = core;

// Export specialized color scales
const brandColors = {
  primary: {
    base: core.colors.primary[500],
    hover: core.colors.primary[600],
    active: core.colors.primary[700],
    light: core.colors.primary[400],
    lighter: core.colors.primary[300],
    subtle: core.colors.primary[50],
  },
  secondary: {
    base: core.colors.secondary[900],
    hover: core.colors.secondary[800],
    light: core.colors.secondary[700],
    lighter: core.colors.secondary[500],
    subtle: core.colors.secondary[50],
  },
  accent: {
    base: core.colors.accent[500],
    hover: core.colors.accent[600],
    light: core.colors.accent[400],
    lighter: core.colors.accent[300],
    subtle: core.colors.accent[50],
  },
};
