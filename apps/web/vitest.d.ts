/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

// Asegurar que los tipos globales de Vitest estén disponibles
import type { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

declare global {
  const vi: typeof import('vitest').vi;
  const describe: typeof import('vitest').describe;
  const it: typeof import('vitest').it;
  const expect: typeof import('vitest').expect;
  const beforeEach: typeof import('vitest').beforeEach;
  const afterEach: typeof import('vitest').afterEach;
}

