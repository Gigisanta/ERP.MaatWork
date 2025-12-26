'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Benchmark } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Text,
  EmptyState,
} from '@maatwork/ui';

// Extender Benchmark con campos adicionales de la respuesta de API
type BenchmarkWithCount = Benchmark & {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  createdAt: string | Date; // Explicitly include createdAt from TimestampedEntity for TypeScript resolution
  componentCount?: number;
};

interface BenchmarksClientProps {
  initialBenchmarks: BenchmarkWithCount[] | Benchmark[];
}

/**
 * Client Component para interactividad de benchmarks
 *
 * AI_DECISION: Converted from inline styles to Tailwind for consistency
 * Justificación: Maintains consistent styling across the app
 * Impacto: Better performance, faster initial page load, consistent UI
 */
export default function BenchmarksClient({ initialBenchmarks }: BenchmarksClientProps) {
  // Animation state for page transitions
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  if (initialBenchmarks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            title="No hay benchmarks configurados"
            description="Los benchmarks del sistema se crean automáticamente para comparar el rendimiento de carteras."
            animated
            floatingIcon
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Table */}
      <div
        className={`overflow-x-auto transition-all duration-500 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border bg-surface-hover">
                  <th className="p-3 text-left text-sm font-semibold text-text">Código</th>
                  <th className="p-3 text-left text-sm font-semibold text-text">Nombre</th>
                  <th className="p-3 text-left text-sm font-semibold text-text">Tipo</th>
                  <th className="p-3 text-left text-sm font-semibold text-text">Componentes</th>
                  <th className="p-3 text-left text-sm font-semibold text-text">Creado</th>
                  <th className="p-3 text-left text-sm font-semibold text-text">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {initialBenchmarks.map((benchmark, index) => {
                  const b = benchmark as BenchmarkWithCount;
                  return (
                    <tr
                      key={b.id}
                      className={`border-b border-border hover:bg-surface-hover transition-all duration-300 ${
                        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                      }`}
                      style={{ transitionDelay: `${100 + index * 50}ms` }}
                    >
                      <td className="p-3">
                        <Badge variant="default" className="font-mono text-xs">
                          {b.code}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div>
                          <Text weight="medium">{b.name}</Text>
                          {b.description && (
                            <Text size="sm" color="secondary" className="mt-0.5">
                              {b.description}
                            </Text>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={b.isSystem ? 'secondary' : 'warning'} className="text-xs">
                          {b.isSystem ? 'Sistema' : 'Custom'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="default" className="text-xs">
                          {b.componentCount ?? 0} componentes
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Text size="sm" color="secondary">
                          {new Date(b.createdAt).toLocaleDateString('es-AR')}
                        </Text>
                      </td>
                      <td className="p-3">
                        <Link href={`/benchmarks/${b.id}`}>
                          <Button variant="primary" size="sm">
                            Ver/Editar
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Text size="sm" color="secondary" className="text-center mt-3">
          Mostrando {initialBenchmarks.length} benchmark(s)
        </Text>
      </div>

      {/* System Benchmarks Info */}
      <div
        className={`transition-all duration-500 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: '200ms' }}
      >
        <Card className="bg-surface-hover border-border">
          <CardHeader>
            <CardTitle className="text-base">📊 Benchmarks del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <Text size="sm" color="secondary" className="mb-4">
              Los benchmarks del sistema se crean automáticamente y no pueden ser modificados.
              Incluyen índices locales argentinos e internacionales para comparación.
            </Text>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { emoji: '🇦🇷', name: 'MERVAL', desc: 'Índice principal Argentina' },
                { emoji: '🇺🇸', name: 'S&P 500', desc: 'Índice principal USA' },
                { emoji: '🌍', name: 'MSCI EM', desc: 'Mercados emergentes' },
              ].map((item, i) => (
                <Card
                  key={item.name}
                  className={`bg-surface hover-interactive transition-all duration-300 ${
                    mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                  }`}
                  style={{ transitionDelay: `${300 + i * 75}ms` }}
                >
                  <CardContent className="p-3">
                    <Text weight="semibold" className="mb-1">
                      {item.emoji} {item.name}
                    </Text>
                    <Text size="sm" color="secondary">
                      {item.desc}
                    </Text>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
