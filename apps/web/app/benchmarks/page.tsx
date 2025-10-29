"use client";
import { useRequireAuth } from '../auth/useRequireAuth';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Benchmark {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  componentCount: number;
  createdAt: string;
}

export default function BenchmarksPage() {
  const { user, token, loading } = useRequireAuth();
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchBenchmarks = async () => {
    if (!token) return;
    
    try {
      setDataLoading(true);
      
      const response = await fetch(`${apiUrl}/benchmarks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch benchmarks');
      }

      const data = await response.json();
      setBenchmarks(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBenchmarks();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  // Solo admin puede gestionar benchmarks
  if (user?.role !== 'admin') {
    return (
      <main style={{ padding: 16 }}>
        <p>No tienes permisos para gestionar benchmarks.</p>
        <Link href="/" style={{ color: '#3b82f6' }}>← Volver al inicio</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>📈 Benchmarks</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/" style={{ color: '#3b82f6' }}>← Volver al inicio</Link>
          <span style={{ color: '#6b7280' }}>|</span>
          <span style={{ fontSize: 14, color: '#6b7280' }}>
            Gestión de benchmarks para comparación de carteras
          </span>
        </div>
      </div>

      {loading && <p>Cargando benchmarks...</p>}
      {error && <p style={{ color: '#ef4444' }}>Error: {error}</p>}

      {!loading && !error && (
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
              {benchmarks.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                    No hay benchmarks configurados
                  </td>
                </tr>
              ) : (
                benchmarks.map((benchmark) => (
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
                ))
              )}
            </tbody>
          </table>

          {benchmarks.length > 0 && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              textAlign: 'center',
              color: '#6b7280',
              fontSize: 14
            }}>
              Mostrando {benchmarks.length} benchmark(s)
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
    </main>
  );
}
