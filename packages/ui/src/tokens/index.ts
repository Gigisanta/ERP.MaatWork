export type Theme = 'light' | 'dark' | 'high-contrast';

export interface ThemeConfig {
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

// Maat Brand Colors v2.0
// Primary: #5900FF (Purple - CTAs, buttons, highlights)
// Secondary: #000000 (Black - Professional base, text)
// Accent: #00E676 (Green - Growth, success)

export const themes: Record<Theme, ThemeConfig> = {
  light: {
    name: 'light',
    colors: {
      // Brand colors - Purple is PRIMARY for actions
      primary: '#5900ff',
      primaryHover: '#4700cc',
      primaryActive: '#3600a3',
      secondary: '#000000',
      secondaryHover: '#1e1e1e',
      accent: '#00e676',
      accentHover: '#00c858',
      // Semantic colors
      success: '#4caf50',
      warning: '#ffc107',
      error: '#f44336',
      info: '#2196f3',
      // Surface colors
      background: '#ffffff',
      surface: '#fafafa',
      surfaceHover: '#f5f5f5',
      // Text colors
      text: '#000000',
      textSecondary: '#424242',
      textMuted: '#757575',
      textInverse: '#ffffff',
      // Border colors
      border: '#e0e0e0',
      borderHover: '#bdbdbd',
    },
  },
  dark: {
    name: 'dark',
    colors: {
      // Brand colors - Purple lighter for dark mode
      primary: '#771eff',
      primaryHover: '#953cff',
      primaryActive: '#b77fff',
      secondary: '#ffffff',
      secondaryHover: '#e0e0e0',
      accent: '#00e676',
      accentHover: '#3cffb2',
      // Semantic colors
      success: '#66bb6a',
      warning: '#ffca28',
      error: '#ef5350',
      info: '#42a5f5',
      // Surface colors
      background: '#0a0a0a',
      surface: '#141414',
      surfaceHover: '#1e1e1e',
      // Text colors
      text: '#ffffff',
      textSecondary: '#b0b0b0',
      textMuted: '#757575',
      textInverse: '#000000',
      // Border colors
      border: '#2d2d2d',
      borderHover: '#424242',
    },
  },
  'high-contrast': {
    name: 'high-contrast',
    colors: {
      // Brand colors - Purple for actions
      primary: '#5900ff',
      primaryHover: '#4700cc',
      primaryActive: '#3600a3',
      secondary: '#000000',
      secondaryHover: '#000000',
      accent: '#00aa3a',
      accentHover: '#008c1c',
      // Semantic colors
      success: '#107314',
      warning: '#c38500',
      error: '#b80700',
      info: '#0d47a1',
      // Surface colors
      background: '#ffffff',
      surface: '#ffffff',
      surfaceHover: '#f5f5f5',
      // Text colors
      text: '#000000',
      textSecondary: '#000000',
      textMuted: '#424242',
      textInverse: '#ffffff',
      // Border colors
      border: '#000000',
      borderHover: '#000000',
    },
  },
};

// Export color tokens for direct access
export const brandColors = {
  primary: {
    base: '#5900ff',
    hover: '#4700cc',
    active: '#3600a3',
    light: '#771eff',
    lighter: '#953cff',
    subtle: '#f3e8ff',
  },
  secondary: {
    base: '#000000',
    hover: '#1e1e1e',
    light: '#3c3c3c',
    lighter: '#6b6b6b',
    subtle: '#f5f5f5',
  },
  accent: {
    base: '#00e676',
    hover: '#00c858',
    light: '#1eff94',
    lighter: '#3cffb2',
    subtle: '#e8fff3',
  },
};

export const semanticColors = {
  success: {
    base: '#4caf50',
    light: '#88eb8c',
    lighter: '#6acd6e',
    dark: '#2e9132',
    darker: '#107314',
    subtle: '#e8f5e9',
  },
  warning: {
    base: '#ffc107',
    light: '#fffd43',
    lighter: '#ffdf25',
    dark: '#e1a300',
    darker: '#c38500',
    subtle: '#fff8e1',
  },
  error: {
    base: '#f44336',
    light: '#ff7f72',
    lighter: '#ff6154',
    dark: '#d62518',
    darker: '#b80700',
    subtle: '#ffebee',
  },
};
