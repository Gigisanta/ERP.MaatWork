"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'advisor' | 'manager' | 'admin'>('advisor');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, role);
      // redirect según rol
      if (role === 'admin' || role === 'manager') router.replace('/');
      else router.replace('/');
    } catch (err: any) {
      setError(err?.message || 'Error de login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
      <h1>Iniciar sesión</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }} />
        </label>
        <label>
          Rol
          <select value={role} onChange={(e) => setRole(e.target.value as any)}>
            <option value="advisor">Advisor</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}


