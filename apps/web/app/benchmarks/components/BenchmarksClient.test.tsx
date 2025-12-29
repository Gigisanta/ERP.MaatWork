/**
 * Tests para BenchmarksClient
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BenchmarksClient from './BenchmarksClient';
import type { Benchmark } from '@/types';

// Mock dependencies
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockBenchmarks: Benchmark[] = [
  {
    id: 'b1',
    code: 'MERVAL',
    name: 'Índice Merval',
    description: 'Acciones líderes Argentina',
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'b2',
    code: 'SP500',
    name: 'S&P 500',
    description: 'Top 500 US companies',
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

describe('BenchmarksClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar tabla de benchmarks cuando hay datos', () => {
    render(<BenchmarksClient initialBenchmarks={mockBenchmarks} />);

    expect(screen.getByText(/Código/i)).toBeInTheDocument();
    // Buscar en la tabla específicamente o usar getAllByText
    const mervalElements = screen.getAllByText(/MERVAL/i);
    expect(mervalElements.length).toBeGreaterThan(0);
    
    expect(screen.getByText(/Índice Merval/i)).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay benchmarks', () => {
    render(<BenchmarksClient initialBenchmarks={[]} />);
    expect(screen.getByText(/No hay benchmarks configurados/i)).toBeInTheDocument();
  });

  it('debería mostrar badges de tipo de benchmark', () => {
    render(<BenchmarksClient initialBenchmarks={mockBenchmarks} />);
    // Debería haber badges de "Sistema" (isSystem: true)
    const systemBadges = screen.getAllByText(/Sistema/i);
    expect(systemBadges.length).toBeGreaterThan(0);
  });

  it('debería mostrar información de benchmarks del sistema', () => {
    render(<BenchmarksClient initialBenchmarks={mockBenchmarks} />);
    expect(screen.getByRole('heading', { name: /Benchmarks del Sistema/i })).toBeInTheDocument();
    
    const mervalElements = screen.getAllByText(/MERVAL/i);
    expect(mervalElements.length).toBeGreaterThan(0);
  });
});
