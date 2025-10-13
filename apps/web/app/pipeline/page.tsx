"use client";
import { useAuth } from '../auth/AuthContext';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface Contact {
  id: string;
  fullName: string;
  email?: string;
  // lifecycleStage eliminado - ahora usamos solo pipelineStageId
}

interface PipelineStage {
  id: string;
  name: string;
  description?: string;
  order: number;
  color: string;
  wipLimit?: number;
  contacts: Contact[];
  currentCount: number;
}

export default function PipelinePage() {
  const { user, token } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingOverStageId, setDraggingOverStageId] = useState<string | null>(null);
  const [movingContactId, setMovingContactId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/pipeline/board`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pipeline board');
      }

      const data = await response.json();
      setStages(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchBoard();
  }, [token, fetchBoard]);

  if (!user) {
    return (
      <main style={{ padding: 16 }}>
        <p>Debes iniciar sesión. <Link href="/login">Ir a login</Link></p>
      </main>
    );
  }

  const isWipLimitExceeded = (stage: PipelineStage) => {
    return stage.wipLimit !== null && stage.wipLimit !== undefined && stage.currentCount >= stage.wipLimit;
  };

  const moveContactLocal = (
    list: PipelineStage[],
    contactId: string,
    fromStageId: string,
    toStageId: string
  ): PipelineStage[] => {
    if (fromStageId === toStageId) return list;
    const next = list.map(s => ({ ...s, contacts: [...s.contacts] }));
    const from = next.find(s => s.id === fromStageId);
    const to = next.find(s => s.id === toStageId);
    if (!from || !to) return list;
    const idx = from.contacts.findIndex(c => c.id === contactId);
    if (idx === -1) return list;
    const [contact] = from.contacts.splice(idx, 1);
    to.contacts.unshift(contact);
    return next.map(s => ({
      ...s,
      currentCount: s.id === fromStageId ? Math.max(0, s.currentCount - 1) : s.id === toStageId ? s.currentCount + 1 : s.currentCount
    }));
  };

  const handleDrop = (toStageId: string) => async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDraggingOverStageId(null);
    setMoveError(null);
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    const { contactId, fromStageId } = JSON.parse(data) as { contactId: string; fromStageId: string };
    if (!contactId || !fromStageId) return;
    if (fromStageId === toStageId) return;

    // UI pre-check WIP
    const targetStage = stages.find(s => s.id === toStageId);
    if (targetStage && targetStage.wipLimit !== null && targetStage.wipLimit !== undefined && targetStage.currentCount >= targetStage.wipLimit) {
      setMoveError('WIP límite alcanzado en la etapa destino.');
      return;
    }

    // Optimistic move
    const previous = stages;
    setMovingContactId(contactId);
    setStages(prev => moveContactLocal(prev, contactId, fromStageId, toStageId));

    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/pipeline/move`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactId, toStageId }),
      });

      if (!resp.ok) {
        // Rollback
        setStages(previous);
        const payload = await resp.json().catch(() => ({} as any));
        setMoveError(payload?.error || 'No se pudo mover el contacto');
        return;
      }
      // Sync board
      await fetchBoard();
    } catch (err) {
      // Rollback on network error
      setStages(previous);
      setMoveError('Error de red al mover el contacto');
    } finally {
      setMovingContactId(null);
    }
  };

  return (
    <main style={{ padding: 16, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>Pipeline Kanban</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/" style={{ color: '#3b82f6' }}>← Volver al inicio</Link>
          <span style={{ color: '#6b7280' }}>|</span>
          <Link href="/contacts" style={{ color: '#3b82f6' }}>Ver Contactos</Link>
          <span style={{ color: '#6b7280' }}>|</span>
          <Link href="/pipeline/metrics" style={{ color: '#3b82f6' }}>Ver Métricas</Link>
        </div>
      </div>

      {loading && <p>Cargando pipeline...</p>}
      {error && <p style={{ color: '#ef4444' }}>Error: {error}</p>}

      {!loading && !error && (
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          overflowX: 'auto',
          paddingBottom: 16
        }}>
          {stages.length === 0 ? (
            <p style={{ color: '#6b7280', padding: 24 }}>
              No hay etapas configuradas en el pipeline.
            </p>
          ) : (
            stages.map((stage) => (
              <div 
                key={stage.id}
                style={{
                  minWidth: 280,
                  maxWidth: 320,
                  backgroundColor: '#f9fafb',
                  borderRadius: 8,
                  padding: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  flex: '0 0 auto',
                  borderTop: `4px solid ${stage.color}`
                }}
                onDragOver={(e) => { e.preventDefault(); setDraggingOverStageId(stage.id); }}
                onDragEnter={(e) => { e.preventDefault(); setDraggingOverStageId(stage.id); }}
                onDragLeave={() => { setDraggingOverStageId(prev => (prev === stage.id ? null : prev)); }}
                onDrop={handleDrop(stage.id)}
                aria-dropeffect="move"
              >
                {/* Header de la etapa */}
                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ 
                    fontSize: 18, 
                    fontWeight: 600, 
                    marginBottom: 4,
                    color: stage.color
                  }}>
                    {stage.name}
                  </h2>
                  
                  {stage.description && (
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                      {stage.description}
                    </p>
                  )}

                  <div style={{ 
                    display: 'flex', 
                    gap: 8, 
                    fontSize: 12,
                    color: '#6b7280',
                    marginTop: 8
                  }}>
                    <span style={{ 
                      fontWeight: 600,
                      color: isWipLimitExceeded(stage) ? '#ef4444' : '#374151'
                    }}>
                      {stage.currentCount} contacto(s)
                    </span>
                    {stage.wipLimit !== null && (
                      <span style={{ 
                        color: isWipLimitExceeded(stage) ? '#ef4444' : '#6b7280'
                      }}>
                        / WIP: {stage.wipLimit}
                      </span>
                    )}
                  </div>

                  {isWipLimitExceeded(stage) && (
                    <div style={{
                      marginTop: 8,
                      padding: 8,
                      backgroundColor: '#fef2f2',
                      borderRadius: 4,
                      fontSize: 11,
                      color: '#991b1b',
                      fontWeight: 500
                    }}>
                      ⚠️ WIP Limit Alcanzado
                    </div>
                  )}
                </div>

                {/* Lista de contactos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, outline: draggingOverStageId === stage.id ? `2px dashed ${stage.color}` : 'none', outlineOffset: 4, transition: 'outline 0.15s ease-in-out' }}>
                  {stage.contacts.length === 0 ? (
                    <div style={{
                      padding: 16,
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: 14,
                      backgroundColor: 'white',
                      borderRadius: 6,
                      border: '2px dashed #e5e7eb'
                    }}>
                      No hay contactos
                    </div>
                  ) : (
                    stage.contacts.slice(0, 10).map((contact) => (
                      <Link
                        key={contact.id}
                        href={`/contacts/${contact.id}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <div 
                          style={{
                            padding: 12,
                            backgroundColor: movingContactId === contact.id ? '#f3f4f6' : 'white',
                            opacity: movingContactId === contact.id ? 0.6 : 1,
                            borderRadius: 6,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            cursor: 'grab',
                            transition: 'all 0.2s',
                            border: '1px solid #e5e7eb'
                          }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', JSON.stringify({ contactId: contact.id, fromStageId: stage.id }));
                            e.dataTransfer.effectAllowed = 'move';
                            setMoveError(null);
                          }}
                          onDragEnd={() => setDraggingOverStageId(null)}
                          onMouseOver={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                          aria-grabbed={movingContactId === contact.id}
                        >
                          <div style={{ 
                            fontSize: 14, 
                            fontWeight: 500,
                            marginBottom: 4,
                            color: '#111827'
                          }}>
                            {contact.fullName}
                          </div>
                          {contact.email && (
                            <div style={{ 
                              fontSize: 12, 
                              color: '#6b7280',
                              marginBottom: 8
                            }}>
                              {contact.email}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))
                  )}

                  {stage.contacts.length > 10 && (
                    <div style={{
                      padding: 8,
                      textAlign: 'center',
                      fontSize: 12,
                      color: '#6b7280'
                    }}>
                      +{stage.contacts.length - 10} más
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Leyenda */}
      {moveError && (
        <div style={{
          marginTop: 12,
          padding: 12,
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          borderRadius: 6,
          border: '1px solid #fecaca'
        }}>
          {moveError}
        </div>
      )}
    </main>
  );
}

