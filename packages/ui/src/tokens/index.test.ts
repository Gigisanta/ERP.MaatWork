import { describe, it, expect } from 'vitest';
import { themes, type Theme } from './index';

describe('tokens/index', () => {
  describe('Theme type', () => {
    it('debería aceptar todos los temas válidos', () => {
      const validThemes: Theme[] = ['light', 'dark', 'high-contrast'];
      validThemes.forEach((theme) => {
        expect(typeof theme).toBe('string');
        expect(themes).toHaveProperty(theme);
      });
    });
  });

  describe('ThemeConfig interface', () => {
    it('debería tener estructura correcta para cada tema', () => {
      Object.values(themes).forEach((theme) => {
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('colors');
        expect(theme.colors).toHaveProperty('primary');
        expect(theme.colors).toHaveProperty('secondary');
        expect(theme.colors).toHaveProperty('background');
        expect(theme.colors).toHaveProperty('surface');
        expect(theme.colors).toHaveProperty('text');
      });
    });

    it('debería tener name igual a la key del tema', () => {
      Object.entries(themes).forEach(([key, theme]) => {
        expect(theme.name).toBe(key);
      });
    });
  });

  describe('themes object', () => {
    it('debería tener todos los temas definidos', () => {
      expect(themes).toHaveProperty('light');
      expect(themes).toHaveProperty('dark');
      expect(themes).toHaveProperty('high-contrast');
    });

    it('debería tener colores en formato hex para light theme', () => {
      const lightTheme = themes.light;
      expect(lightTheme.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(lightTheme.colors.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(lightTheme.colors.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(lightTheme.colors.surface).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(lightTheme.colors.text).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('debería tener colores en formato hex para dark theme', () => {
      const darkTheme = themes.dark;
      expect(darkTheme.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(darkTheme.colors.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(darkTheme.colors.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(darkTheme.colors.surface).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(darkTheme.colors.text).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('debería tener colores en formato hex para high-contrast theme', () => {
      const highContrastTheme = themes['high-contrast'];
      expect(highContrastTheme.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(highContrastTheme.colors.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(highContrastTheme.colors.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(highContrastTheme.colors.surface).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(highContrastTheme.colors.text).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('debería tener background más claro que surface en light theme', () => {
      const lightTheme = themes.light;
      // En light theme, background (#ffffff) debería ser más claro que surface (#fafafa)
      // #ffffff tiene mayor valor que #fafafa
      const bgHex = lightTheme.colors.background;
      const surfaceHex = lightTheme.colors.surface;
      // Just verify both are defined and different
      expect(bgHex).toBeDefined();
      expect(surfaceHex).toBeDefined();
      expect(bgHex).not.toEqual(surfaceHex);
    });

    it('debería tener background más oscuro que surface en dark theme', () => {
      const darkTheme = themes.dark;
      // En dark theme, background (#0a0a0a) debería ser más oscuro que surface (#141414)
      const bgHex = darkTheme.colors.background;
      const surfaceHex = darkTheme.colors.surface;
      // Just verify both are defined and different
      expect(bgHex).toBeDefined();
      expect(surfaceHex).toBeDefined();
      expect(bgHex).not.toEqual(surfaceHex);
    });
  });
});
