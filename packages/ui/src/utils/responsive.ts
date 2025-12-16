import { type ResponsiveProp } from '../tokens/breakpoints.js';

// Map breakpoint key to Tailwind class prefix
const prefixFor: Record<string, string> = {
  base: '',
  xs: 'xs:',
  sm: 'sm:',
  md: 'md:',
  lg: 'lg:',
  xl: 'xl:',
  '2xl': '2xl:',
};

type ResponsiveObject<T> = {
  base?: T;
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
};

function isResponsiveObject<T>(val: unknown): val is ResponsiveObject<T> {
  if (val === null || typeof val !== 'object' || Array.isArray(val)) return false;
  const keys = ['base', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
  return keys.some((k) => k in (val as Record<string, unknown>));
}

export function buildResponsiveClasses<T>(
  value: ResponsiveProp<T> | undefined,
  toClass: (val: T) => string
): string[] {
  if (value === undefined) return [];
  if (value === null) return [];
  if (Array.isArray(value)) return [];
  if (!isResponsiveObject<T>(value)) {
    // Si es un objeto pero no tiene keys de breakpoint válidas, retornar vacío
    if (typeof value === 'object') {
      return [];
    }
    return [toClass(value as T)];
  }
  const classes: string[] = [];
  const entries: Array<[keyof typeof prefixFor, T | undefined]> = [
    ['base', value.base],
    ['xs', value.xs],
    ['sm', value.sm],
    ['md', value.md],
    ['lg', value.lg],
    ['xl', value.xl],
    ['2xl', value['2xl']],
  ];
  for (const [bp, val] of entries) {
    if (val === undefined) continue;
    const p = prefixFor[bp as string];
    const cls = toClass(val);
    classes.push(p ? `${p}${cls}` : cls);
  }
  return classes;
}
