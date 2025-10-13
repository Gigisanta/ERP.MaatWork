"use client";
import { useAuth } from '../../auth/AuthContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  phoneSecondary?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  country?: string;
  dateOfBirth?: string;
  // lifecycleStage eliminado - ahora usamos solo pipelineStageId
  pipelineStageId?: string;
  source?: string;
  riskProfile?: string;
  assignedAdvisorId?: string;
  assignedTeamId?: string;
  notes?: string;
  customFields?: Record<string, any>;
  contactLastTouchAt?: string;
  pipelineStageUpdatedAt?: string;
  deletedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export default function ContactDetailPage() {
  const params = useParams();
  const { user, token } = useAuth();
  const [contact, setContact] = useState<Contact | null>(null);
  const [stages, setStages] = useState<Array<{id: string, name: string, color: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contactId = params.id as string;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!token || !contactId) return;

    const fetchContact = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(
          `${apiUrl}/contacts/${contactId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Contacto no encontrado');
          }
          throw new Error('Error al cargar el contacto');
        }

        const data = await response.json();
        setContact(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [token, contactId, apiUrl]);

  useEffect(() => {
    if (!token) return;

    const fetchStages = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/pipeline/stages`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setStages(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching stages:', err);
      }
    };

    fetchStages();
  }, [token, apiUrl]);

  if (!user) {
    return (
      <main style={{ padding: 16 }}>
        <p>Debes iniciar sesión. <Link href="/login">Ir a login</Link></p>
      </main>
    );
  }

  if (loading) {
    return (
      <main style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
        <p>Cargando contacto...</p>
      </main>
    );
  }

  if (error || !contact) {
    return (
      <main style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Link href="/contacts" style={{ color: '#3b82f6' }}>← Volver a Contactos</Link>
        </div>
        <p style={{ color: '#ef4444' }}>Error: {error || 'Contacto no encontrado'}</p>
      </main>
    );
  }

  // Función getStageColor eliminada - ahora usamos los colores de las etapas de pipeline

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return '#10b981';
      case 'mid': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <main style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/contacts" style={{ color: '#3b82f6', marginBottom: 16, display: 'inline-block' }}>
          ← Volver a Contactos
        </Link>
        <h1 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>
          {contact.fullName}
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {contact.pipelineStageId && (
            <span style={{
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: '#3b82f620',
              color: '#3b82f6'
            }}>
              {stages.find(s => s.id === contact.pipelineStageId)?.name || 'Etapa desconocida'}
            </span>
          )}
          {contact.riskProfile && (
            <span style={{
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: `${getRiskColor(contact.riskProfile)}20`,
              color: getRiskColor(contact.riskProfile)
            }}>
              Riesgo: {contact.riskProfile}
            </span>
          )}
        </div>
      </div>

      {/* Información de Contacto */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 24,
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
          Información de Contacto
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              Email
            </label>
            <p style={{ fontSize: 14, fontWeight: 500 }}>
              {contact.email || '—'}
            </p>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              Teléfono
            </label>
            <p style={{ fontSize: 14, fontWeight: 500 }}>
              {contact.phone || '—'}
            </p>
          </div>
          {contact.customFields?.dni && (
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                DNI
              </label>
              <p style={{ fontSize: 14, fontWeight: 500 }}>
                {contact.customFields.dni}
              </p>
            </div>
          )}
          {contact.source && (
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                Origen
              </label>
              <p style={{ fontSize: 14, fontWeight: 500 }}>
                {contact.source}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notas */}
      {contact.notes && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
            Notas
          </h2>
          <p style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap' }}>
            {contact.notes}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 16,
        fontSize: 12,
        color: '#6b7280'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <strong>Creado:</strong> {new Date(contact.createdAt).toLocaleDateString('es-AR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div>
            <strong>Última actualización:</strong> {new Date(contact.updatedAt).toLocaleDateString('es-AR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div>
            <strong>ID:</strong> {contact.id}
          </div>
          <div>
            <strong>Versión:</strong> {contact.version}
          </div>
        </div>
      </div>
    </main>
  );
}


