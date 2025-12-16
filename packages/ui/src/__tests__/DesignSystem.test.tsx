import { describe, it, expect } from 'vitest';
import { themes } from '../tokens/index.js';
import core from '../tokens/core.json';

describe('Design System Tokens', () => {
  describe('Core Colors', () => {
    it('should have correct primary color scale', () => {
      // Soft Purple 500
      expect(core.colors.primary['500']).toBe('#8b5cf6');
    });

    it('should have correct secondary color scale', () => {
      // Warm Stone 900
      expect(core.colors.secondary['900']).toBe('#1c1917');
    });

    it('should have correct accent color scale', () => {
      // Soft Green 500
      expect(core.colors.accent['500']).toBe('#10b981');
    });
  });

  describe('Themes', () => {
    it('should have light theme configured correctly', () => {
      expect(themes.light.colors.primary).toBe(core.colors.primary['500']);
      expect(themes.light.colors.background).toBe(core.colors.surface.cream);
    });

    it('should have dark theme configured correctly', () => {
      expect(themes.dark.colors.primary).toBe(core.colors.primary['400']);
      expect(themes.dark.colors.background).toBe(core.colors.surface.darker);
    });
  });

  describe('Typography', () => {
    it('should have correct font families', () => {
      expect(core.typography.fontFamily.display).toContain('Outfit');
      expect(core.typography.fontFamily.body).toContain('Plus Jakarta Sans');
    });
  });
});
