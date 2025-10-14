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
        <div style={{ display: 'grid', gap: 16 }}>
          <p>
            Sesión: {user.fullName || user.email} — Rol: <strong>{user.role}</strong>
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 16,
            marginTop: 16
          }}>
            {/* Card Contactos */}
            <div style={{ 
              padding: 24, 
              backgroundColor: '#f3f4f6', 
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>📇 Contactos</h3>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                Gestiona tu base de clientes con ficha 360
              </p>
              <Link 
                href="/contacts"
                style={{ 
                  display: 'inline-block',
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                Ver Contactos →
              </Link>
            </div>


            {/* Card Comparación Mensual */}
            <div style={{ 
              padding: 24, 
              backgroundColor: '#f3f4f6', 
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>📊 Comparación Mensual</h3>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                Sistema de gestión del maestro "Balanz Cactus 2025"
              </p>
              <Link 
                href="/comparacion-mensual"
                style={{ 
                  display: 'inline-block',
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                Gestionar Maestro →
              </Link>
            </div>

            
          </div>

          <div style={{ marginTop: 24 }}>
            {user.role === 'admin' || user.role === 'manager' ? (
              <div style={{ padding: 16, backgroundColor: '#ecfdf5', borderRadius: 8, border: '1px solid #10b981' }}>
                <p style={{ fontWeight: 500, color: '#059669' }}>✓ Permisos de administración/manager activos</p>
                <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  Tienes acceso completo a todas las funcionalidades del CRM
                </p>
              </div>
            ) : (
              <div style={{ padding: 16, backgroundColor: '#eff6ff', borderRadius: 8, border: '1px solid #3b82f6' }}>
                <p style={{ fontWeight: 500, color: '#2563eb' }}>👤 Vista de asesor</p>
                <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  Acceso a pipeline y clientes asignados
                </p>
              </div>
            )}
          </div>

          <button 
            onClick={logout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              marginTop: 16
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </main>
  );
}


