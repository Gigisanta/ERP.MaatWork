export type Theme = 'light' | 'dark' | 'high-contrast';

export interface ThemeConfig {
  name: Theme;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
  };
}

export const themes: Record<Theme, ThemeConfig> = {
  light: {
    name: 'light',
    colors: {
      primary: 'oklch(60% 0.15 140)',
      secondary: 'oklch(70% 0.10 140)',
      background: 'oklch(98% 0.01 240)',
      surface: 'oklch(100% 0 0)',
      text: 'oklch(20% 0.02 240)',
    },
  },
  dark: {
    name: 'dark',
    colors: {
      primary: 'oklch(65% 0.15 140)',
      secondary: 'oklch(75% 0.10 140)',
      background: 'oklch(8% 0.01 240)',
      surface: 'oklch(12% 0.01 240)',
      text: 'oklch(95% 0.02 240)',
    },
  },
  'high-contrast': {
    name: 'high-contrast',
    colors: {
      primary: 'oklch(0% 0 0)',
      secondary: 'oklch(20% 0 0)',
      background: 'oklch(100% 0 0)',
      surface: 'oklch(95% 0 0)',
      text: 'oklch(0% 0 0)',
    },
  },
};


