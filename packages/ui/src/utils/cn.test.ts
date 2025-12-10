import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('debería combinar clases correctamente', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('debería manejar clases condicionales', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz');
  });

  it('debería manejar objetos condicionales', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('debería manejar arrays', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('debería manejar valores undefined y null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('debería manejar strings vacíos', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });

  it('debería combinar múltiples tipos de inputs', () => {
    expect(cn('foo', { bar: true }, ['baz'], 'qux')).toBe('foo bar baz qux');
  });

  it('debería retornar string vacío cuando no hay inputs', () => {
    expect(cn()).toBe('');
  });

  it('debería manejar inputs anidados', () => {
    expect(cn(['foo', ['bar', 'baz']], 'qux')).toBe('foo bar baz qux');
  });
});
