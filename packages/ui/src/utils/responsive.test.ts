import { describe, it, expect } from 'vitest';
import { buildResponsiveClasses } from './responsive';

describe('buildResponsiveClasses', () => {
  const toClass = (val: string) => `text-${val}`;

  describe('con valores simples', () => {
    it('debería convertir valor simple a clase', () => {
      const result = buildResponsiveClasses('red', toClass);
      expect(result).toEqual(['text-red']);
    });

    it('debería retornar array vacío cuando value es undefined', () => {
      const result = buildResponsiveClasses(undefined, toClass);
      expect(result).toEqual([]);
    });
  });

  describe('con objetos responsivos', () => {
    it('debería construir clases para breakpoint base', () => {
      const result = buildResponsiveClasses({ base: 'red' }, toClass);
      expect(result).toEqual(['text-red']);
    });

    it('debería construir clases para múltiples breakpoints', () => {
      const result = buildResponsiveClasses(
        {
          base: 'red',
          sm: 'blue',
          md: 'green',
        },
        toClass
      );
      expect(result).toEqual(['text-red', 'sm:text-blue', 'md:text-green']);
    });

    it('debería ignorar breakpoints undefined', () => {
      const result = buildResponsiveClasses(
        {
          base: 'red',
          sm: undefined,
          md: 'green',
        },
        toClass
      );
      expect(result).toEqual(['text-red', 'md:text-green']);
    });

    it('debería manejar todos los breakpoints', () => {
      const result = buildResponsiveClasses(
        {
          base: 'red',
          xs: 'orange',
          sm: 'yellow',
          md: 'green',
          lg: 'blue',
          xl: 'indigo',
          '2xl': 'purple',
        },
        toClass
      );
      expect(result).toEqual([
        'text-red',
        'xs:text-orange',
        'sm:text-yellow',
        'md:text-green',
        'lg:text-blue',
        'xl:text-indigo',
        '2xl:text-purple',
      ]);
    });

    it('debería mantener orden de breakpoints', () => {
      const result = buildResponsiveClasses(
        {
          lg: 'blue',
          base: 'red',
          md: 'green',
        },
        toClass
      );
      expect(result).toEqual(['text-red', 'md:text-green', 'lg:text-blue']);
    });
  });

  describe('validación de tipos', () => {
    it('debería rechazar arrays como objetos responsivos', () => {
      const result = buildResponsiveClasses(['red', 'blue'] as any, toClass);
      // Debería tratarlo como valor simple, no como objeto
      expect(result).toEqual([]);
    });

    it('debería rechazar null como objeto responsivo', () => {
      const result = buildResponsiveClasses(null as any, toClass);
      expect(result).toEqual([]);
    });

    it('debería rechazar objetos sin keys de breakpoint', () => {
      const result = buildResponsiveClasses({ other: 'red' } as any, toClass);
      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('debería manejar objeto responsivo vacío', () => {
      const result = buildResponsiveClasses({}, toClass);
      expect(result).toEqual([]);
    });

    it('debería manejar toClass que retorna string vacío', () => {
      const emptyToClass = () => '';
      const result = buildResponsiveClasses({ base: 'red' }, emptyToClass);
      expect(result).toEqual(['']);
    });

    it('debería manejar valores numéricos en objetos responsivos', () => {
      const numToClass = (val: number) => `w-${val}`;
      const result = buildResponsiveClasses({ base: 4, md: 8 }, numToClass);
      expect(result).toEqual(['w-4', 'md:w-8']);
    });
  });
});

