"use client";
import { useAuth } from '../auth/AuthContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('El email es requerido');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await login(email);
      
      // Redirigir al inicio
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: 40,
        borderRadius: 8,
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: 400
      }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 'bold',
          marginBottom: 8,
          textAlign: 'center'
        }}>
          🌵 CACTUS CRM
        </h1>
        <p style={{
          color: '#6b7280',
          fontSize: 14,
          marginBottom: 24,
          textAlign: 'center'
        }}>
          Inicia sesión con tu email
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 4
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14
              }}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: 16,
              padding: 12,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              color: '#dc2626',
              fontSize: 14
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{
          marginTop: 24,
          padding: 16,
          backgroundColor: '#f9fafb',
          borderRadius: 6,
          fontSize: 12,
          color: '#6b7280'
        }}>
          <p style={{ marginBottom: 8 }}>
            <strong>Usuario de prueba:</strong>
          </p>
          <p>📧 test@example.com</p>
          <p style={{ marginTop: 8, fontSize: 11 }}>
            (Este sistema no usa contraseñas, solo email)
          </p>
        </div>

        <div style={{
          marginTop: 16,
          textAlign: 'center',
          fontSize: 12,
          color: '#6b7280'
        }}>
          <Link href="/" style={{ color: '#3b82f6' }}>
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
