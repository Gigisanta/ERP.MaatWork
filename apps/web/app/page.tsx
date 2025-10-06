"use client";
import Link from 'next/link';
import { useAuth } from './auth/AuthContext';

export default function HomePage() {
  const { user, logout } = useAuth();
  return (
    <main style={{ padding: 16 }}>
      <h1>CACTUS</h1>
      {!user ? (
        <p>
          No has iniciado sesión. <Link href="/login">Ir a login</Link>
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          <p>
            Sesión: {user.fullName || user.email} — Rol: <strong>{user.role}</strong>
          </p>
          <div>
            {user.role === 'admin' || user.role === 'manager' ? (
              <>
                <p>Sección de administración/manager visible.</p>
                <p>Puedes acceder a listados sensibles como usuarios.</p>
              </>
            ) : (
              <p>Vista de asesor: acceso a pipeline y clientes propios.</p>
            )}
          </div>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      )}
    </main>
  );
}


