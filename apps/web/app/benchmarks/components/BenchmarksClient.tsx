'use client';

import Link from 'next/link';
import type { Benchmark } from '@/types';

// Extender Benchmark con campos adicionales de la respuesta de API
type BenchmarkWithCount = Benchmark & {
  componentCount?: number;
};

interface BenchmarksClientProps {
  initialBenchmarks: BenchmarkWithCount[];
}

/**
 * Client Component para interactividad de benchmarks
 * 
 * AI_DECISION: Extract client-side interactivity to separate component
 * Justificación: Allows Server Component to handle data fetching, reduces First Load JS
 * Impacto: Better performance, faster initial page load
 */
export default function BenchmarksClient({ initialBenchmarks }: BenchmarksClientProps) {
  return (
    <>
      {initialBenchmarks.length === 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderRadius: 8
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Código</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Nombre</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Tipo</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Componentes</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Creado</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                  No hay benchmarks configurados
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderRadius: 8
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Código</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Nombre</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Tipo</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Componentes</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Creado</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {initialBenchmarks.map((benchmark) => (
                <tr key={benchmark.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      fontFamily: 'monospace'
                    }}>
                      {benchmark.code}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        {benchmark.name}
                      </div>
                      {benchmark.description && (
                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                          {benchmark.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: benchmark.isSystem ? '#dbeafe' : '#fef3c7',
                      color: benchmark.isSystem ? '#1e40af' : '#92400e',
                      border: `1px solid ${benchmark.isSystem ? '#93c5fd' : '#fbbf24'}`
                    }}>
                      {benchmark.isSystem ? 'Sistema' : 'Custom'}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: '#f3f4f6',
                      color: '#374151'
                    }}>
                      {benchmark.componentCount} componentes
                    </span>
                  </td>
                  <td style={{ padding: 12, color: '#6b7280', fontSize: 14 }}>
                    {new Date(benchmark.createdAt).toLocaleDateString('es-AR')}
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link
                        href={`/benchmarks/${benchmark.id}`}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500
                        }}
                      >
                        Ver/Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {initialBenchmarks.length > 0 && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              textAlign: 'center',
              color: '#6b7280',
              fontSize: 14
            }}>
              Mostrando {initialBenchmarks.length} benchmark(s)
            </div>
          )}
        </div>
      )}

      {/* Información sobre benchmarks del sistema */}
      <div style={{
        marginTop: 32,
        padding: 20,
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 12
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          📊 Benchmarks del Sistema
        </h3>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
          Los benchmarks del sistema se crean automáticamente y no pueden ser modificados. 
          Incluyen índices locales argentinos e internacionales para comparación.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ padding: 12, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>🇦🇷 MERVAL</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Índice principal Argentina</div>
          </div>
          <div style={{ padding: 12, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>🇺🇸 S&P 500</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Índice principal USA</div>
          </div>
          <div style={{ padding: 12, backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>🌍 MSCI EM</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Mercados emergentes</div>
          </div>
        </div>
      </div>
    </>
  );
}

