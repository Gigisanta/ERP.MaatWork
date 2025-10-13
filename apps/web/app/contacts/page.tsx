"use client";
import { useAuth } from '../auth/AuthContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  // lifecycleStage eliminado - ahora usamos solo pipelineStageId
  pipelineStageId?: string;
  assignedAdvisorId?: string;
  nextStep?: string;
  tags?: Tag[];
  createdAt: string;
  updatedAt: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

// Componente para selector de etiquetas
function TagSelector({ 
  contact, 
  allTags, 
  onAddTag, 
  onRemoveTag, 
  token, 
  apiUrl 
}: {
  contact: Contact;
  allTags: Tag[];
  onAddTag: (contactId: string, tagName: string) => Promise<void>;
  onRemoveTag: (contactId: string, tagId: string) => Promise<void>;
  token: string | null;
  apiUrl: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const handleAddExistingTag = async (tag: Tag) => {
    if (contact.tags?.some(t => t.id === tag.id)) return; // Ya tiene esta etiqueta
    
    await onAddTag(contact.id, tag.name);
    setShowDropdown(false);
  };

  const handleAddNewTag = async () => {
    if (!newTagName.trim()) return;
    
    setIsAddingTag(true);
    try {
      await onAddTag(contact.id, newTagName.trim());
      setNewTagName('');
      setShowDropdown(false);
    } finally {
      setIsAddingTag(false);
    }
  };

  const availableTags = allTags.filter(tag => 
    !contact.tags?.some(contactTag => contactTag.id === tag.id)
  );

  return (
    <div style={{ position: 'relative', minHeight: 32 }}>
      {/* Etiquetas existentes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
        {contact.tags && contact.tags.length > 0 ? (
          contact.tags.map((tag) => (
            <span
              key={tag.id}
              style={{
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 500,
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                border: `1px solid ${tag.color}40`,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {tag.icon && <span>{tag.icon}</span>}
              <span>{tag.name}</span>
              <button
                onClick={() => onRemoveTag(contact.id, tag.id)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: tag.color,
                  cursor: 'pointer',
                  fontSize: 10,
                  padding: 0,
                  marginLeft: 2,
                  borderRadius: 2,
                  width: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Remover etiqueta"
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span style={{ color: '#9ca3af', fontSize: 12 }}>Sin etiquetas</span>
        )}
      </div>

      {/* Botón para agregar etiquetas */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 500,
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          border: '1px solid #e5e7eb',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        + Agregar etiqueta
      </button>

      {/* Dropdown de etiquetas */}
      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxHeight: 200,
            overflowY: 'auto',
            padding: 8
          }}
        >
          {/* Etiquetas existentes disponibles */}
          {availableTags.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>
                Etiquetas existentes:
              </div>
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAddExistingTag(tag)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    marginBottom: 2,
                    borderRadius: 4,
                    fontSize: 11,
                    backgroundColor: `${tag.color}10`,
                    color: tag.color,
                    border: `1px solid ${tag.color}30`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  {tag.icon && <span>{tag.icon}</span>}
                  <span>{tag.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Crear nueva etiqueta */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>
              Crear nueva etiqueta:
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nombre de la etiqueta"
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  borderRadius: 4,
                  fontSize: 11,
                  border: '1px solid #d1d5db',
                  outline: 'none'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddNewTag();
                  }
                }}
              />
              <button
                onClick={handleAddNewTag}
                disabled={!newTagName.trim() || isAddingTag}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  backgroundColor: newTagName.trim() && !isAddingTag ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  cursor: newTagName.trim() && !isAddingTag ? 'pointer' : 'not-allowed'
                }}
              >
                {isAddingTag ? '...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para cerrar dropdown */}
      {showDropdown && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}

export default function ContactsPage() {
  const { user, token } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [pipelineStage, setPipelineStage] = useState<string>('');
  
  // Panel de gestión de etiquetas
  const [showTagManager, setShowTagManager] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6B7280');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchContacts = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (pipelineStage) {
        if (pipelineStage === 'sin-etapa') {
          params.append('pipelineStageId', 'null');
        } else {
          params.append('pipelineStageId', pipelineStage);
        }
      }

      const response = await fetch(
        `${apiUrl}/contacts?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      setContacts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async () => {
    if (!token) return;
    
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

      if (!response.ok) {
        throw new Error('Failed to fetch stages');
      }

      const data = await response.json();
      setStages(data.data || []);
    } catch (err) {
      console.error('Error fetching stages:', err);
    }
  };

  const handleStageChange = async (contactId: string, newStageId: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/pipeline/move`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            contactId, 
            toStageId: newStageId,
            reason: 'Cambio manual desde lista de contactos'
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar la etapa');
      }

      // Actualizar el contacto en el estado local
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === contactId 
            ? { ...contact, pipelineStageId: newStageId }
            : contact
        )
      );
    } catch (err) {
      console.error('Error updating stage:', err);
      alert(err instanceof Error ? err.message : 'Error al actualizar la etapa del contacto');
    }
  };

  // Funciones para gestión de etiquetas
  const fetchAllTags = async () => {
    if (!token) {
      console.log('No token available for fetchAllTags');
      return;
    }
    
    try {
      console.log('Fetching all tags...');
      const response = await fetch(`${apiUrl}/tags?scope=contact`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Tags response status:', response.status);
      console.log('Tags response content-type:', response.headers.get('content-type'));
      
      // Verificar si la respuesta es JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Non-JSON response received for tags:', responseText.substring(0, 500));
        console.error('El servidor no está respondiendo correctamente para las etiquetas');
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('Tags fetched:', data.data);
        setAllTags(data.data || []);
      } else {
        console.error('Error fetching tags, status:', response.status);
        try {
          const errorData = await response.json();
          console.error('Error data:', errorData);
        } catch (parseError) {
          console.error('Error parsing tags error response:', parseError);
        }
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        console.error('Error de conexión: No se pudo conectar con el servidor para obtener etiquetas');
      }
    }
  };

  const createTag = async (retryCount = 0) => {
    if (!newTagName.trim() || !token) return;
    
    try {
      console.log('Creating tag:', { name: newTagName.trim(), color: newTagColor, retry: retryCount });
      
      const response = await fetch(`${apiUrl}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scope: 'contact',
          name: newTagName.trim(),
          color: newTagColor
        })
      });
      
      console.log('Response status:', response.status);
      console.log('Response content-type:', response.headers.get('content-type'));
      
      // Verificar si la respuesta es JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Non-JSON response received:', responseText.substring(0, 500));
        
        // Si es un error 500 y no hemos reintentado, intentar una vez más
        if (response.status >= 500 && retryCount < 1) {
          console.log('Reintentando crear etiqueta...');
          setTimeout(() => createTag(retryCount + 1), 1000);
          return;
        }
        
        alert('Error: El servidor no está respondiendo correctamente. Por favor, verifica que la API esté funcionando.');
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('Tag created successfully:', data);
        setAllTags(prev => [...prev, data.data]);
        setNewTagName('');
        setNewTagColor('#6B7280');
        
        // También actualizar la lista de contactos para reflejar la nueva etiqueta
        fetchContacts();
      } else {
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          
          // Si es un error de autenticación, intentar una vez más
          if (response.status === 401 && retryCount < 1) {
            console.log('Error de autenticación, reintentando...');
            setTimeout(() => createTag(retryCount + 1), 500);
            return;
          }
          
          alert(`Error al crear etiqueta: ${errorData.error || 'Error desconocido'}`);
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          alert(`Error al crear etiqueta (status ${response.status}): ${response.statusText}`);
        }
      }
    } catch (err) {
      console.error('Error creating tag:', err);
      
      // Si es un error de red y no hemos reintentado, intentar una vez más
      if (err instanceof TypeError && err.message.includes('fetch') && retryCount < 1) {
        console.log('Error de red, reintentando crear etiqueta...');
        setTimeout(() => createTag(retryCount + 1), 1000);
        return;
      }
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        alert('Error de conexión: No se pudo conectar con el servidor. Verifica que la API esté funcionando.');
      } else {
        alert(`Error de conexión: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      }
    }
  };

  const deleteTag = async (tagId: string) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${apiUrl}/tags/${tagId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setAllTags(prev => prev.filter(tag => tag.id !== tagId));
      }
    } catch (err) {
      console.error('Error deleting tag:', err);
    }
  };

  // Función para actualizar el próximo paso
  const handleNextStepChange = async (contactId: string, nextStep: string) => {
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/contacts/${contactId}/next-step`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nextStep })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el próximo paso');
      }

      // Actualizar el estado local
      setContacts(prev => prev.map(contact => 
        contact.id === contactId 
          ? { ...contact, nextStep }
          : contact
      ));
    } catch (err) {
      console.error('Error updating next step:', err);
      alert('Error al actualizar el próximo paso');
    }
  };

  // Función para actualizar etiquetas de un contacto
  const handleContactTagsUpdate = async (contactId: string, tagIds: string[]) => {
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/tags/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          add: tagIds,
          remove: [] // Por ahora solo agregamos, no removemos
        })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar etiquetas');
      }

      const data = await response.json();
      
      // Actualizar el estado local
      setContacts(prev => prev.map(contact => 
        contact.id === contactId 
          ? { ...contact, tags: data.data }
          : contact
      ));
    } catch (err) {
      console.error('Error updating contact tags:', err);
      alert('Error al actualizar etiquetas del contacto');
    }
  };

  // Función para agregar una etiqueta a un contacto
  const addTagToContact = async (contactId: string, tagName: string) => {
    if (!token) return;

    try {
      // Primero buscar o crear la etiqueta
      let tagId = allTags.find(tag => 
        tag.name.toLowerCase() === tagName.toLowerCase()
      )?.id;

      if (!tagId) {
        // Crear nueva etiqueta
        const createResponse = await fetch(`${apiUrl}/tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            scope: 'contact',
            name: tagName,
            color: '#6B7280'
          })
        });

        if (!createResponse.ok) {
          throw new Error('Error al crear etiqueta');
        }

        const createData = await createResponse.json();
        tagId = createData.data.id;
        
        // Actualizar lista de etiquetas disponibles
        setAllTags(prev => [...prev, createData.data]);
      }

      // Agregar etiqueta al contacto
      if (tagId) {
        await handleContactTagsUpdate(contactId, [tagId]);
      }
    } catch (err) {
      console.error('Error adding tag to contact:', err);
      alert('Error al agregar etiqueta');
    }
  };

  // Función para remover una etiqueta de un contacto
  const removeTagFromContact = async (contactId: string, tagId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/tags/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          add: [],
          remove: [tagId]
        })
      });

      if (!response.ok) {
        throw new Error('Error al remover etiqueta');
      }

      const data = await response.json();
      
      // Actualizar el estado local
      setContacts(prev => prev.map(contact => 
        contact.id === contactId 
          ? { ...contact, tags: data.data }
          : contact
      ));
    } catch (err) {
      console.error('Error removing tag from contact:', err);
      alert('Error al remover etiqueta del contacto');
    }
  };

  useEffect(() => {
    if (token) {
      fetchStages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    console.log('useEffect for fetchAllTags triggered:', { showTagManager, hasToken: !!token });
    if (token) {
      fetchAllTags();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pipelineStage]);

  if (!user) {
    return (
      <main style={{ padding: 16 }}>
        <p>Debes iniciar sesión. <Link href="/login">Ir a login</Link></p>
      </main>
    );
  }

  // Función eliminada - ahora usamos getStageInfo que obtiene el color de la etapa de pipeline

  const getStageInfo = (stageId?: string) => {
    if (!stageId) return { name: 'Sin etapa', color: '#6b7280' };
    const stage = stages.find(s => s.id === stageId);
    return stage ? { name: stage.name, color: stage.color } : { name: 'Sin etapa', color: '#6b7280' };
  };

  // Función eliminada - ya no necesitamos mapear entre lifecycle y pipeline stages

  return (
    <>
      <Head>
        <link rel="stylesheet" href="/css/tags.css" />
        <script src="/js/tag-select.js" defer></script>
      </Head>
      <main style={{ padding: 16, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>Contactos</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/" style={{ color: '#3b82f6' }}>← Volver al inicio</Link>
          <span style={{ color: '#6b7280' }}>|</span>
          <Link href="/contacts/new" style={{ color: '#10b981', fontWeight: 500 }}>
            + Agregar Contacto
          </Link>
          <span style={{ color: '#6b7280' }}>|</span>
          <button
            onClick={() => {
              console.log('Tag manager button clicked, current state:', showTagManager);
              setShowTagManager(!showTagManager);
            }}
            style={{ 
              color: '#8b5cf6', 
              fontWeight: 500, 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              fontSize: 16,
              padding: 0
            }}
          >
            🏷️ Gestionar Etiquetas
          </button>
          <span style={{ color: '#6b7280' }}>|</span>
          <Link href="/pipeline" style={{ color: '#3b82f6' }}>Ver Pipeline Kanban</Link>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ 
        marginBottom: 24, 
        padding: 16, 
        backgroundColor: '#f9fafb', 
        borderRadius: 8,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: 12, 
            fontWeight: 600, 
            marginBottom: 4,
            color: '#374151'
          }}>
            Filtrar por Etapa de Pipeline:
          </label>
          <select
            value={pipelineStage}
            onChange={(e) => setPipelineStage(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 14,
              minWidth: 200
            }}
          >
            <option value="">Todas las etapas</option>
            <option value="sin-etapa">Sin etapa</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>

        {pipelineStage && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ 
              fontSize: 12, 
              color: '#6b7280',
              backgroundColor: '#f3f4f6',
              padding: '4px 8px',
              borderRadius: 4
            }}>
              Filtro activo: {pipelineStage === 'sin-etapa' ? 'Sin etapa' : stages.find(s => s.id === pipelineStage)?.name || pipelineStage}
            </div>
            <button
              onClick={() => setPipelineStage('')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Limpiar Filtro
            </button>
          </div>
        )}
      </div>

      {/* Panel de Gestión de Etiquetas */}
      {showTagManager && (
        <div style={{
          marginBottom: 24,
          padding: 20,
          backgroundColor: '#f8fafc',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', margin: 0 }}>
              🏷️ Gestión de Etiquetas
            </h3>
            <button
              onClick={() => setShowTagManager(false)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              ✕ Cerrar
            </button>
          </div>

          {/* Crear nueva etiqueta */}
          <div style={{ 
            marginBottom: 20, 
            padding: 16, 
            backgroundColor: 'white', 
            borderRadius: 8,
            border: '1px solid #e5e7eb'
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>
              Crear Nueva Etiqueta
            </h4>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Nombre de la etiqueta"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  minWidth: 200
                }}
                onKeyPress={(e) => e.key === 'Enter' && createTag()}
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  cursor: 'pointer'
                }}
              />
              <button
                onClick={() => {
                  console.log('Create tag button clicked:', { name: newTagName, color: newTagColor, hasToken: !!token });
                  createTag();
                }}
                disabled={!newTagName.trim()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: newTagName.trim() ? '#10b981' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: newTagName.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 500
                }}
              >
                + Crear
              </button>
            </div>
          </div>

          {/* Lista de etiquetas existentes */}
          <div style={{ 
            padding: 16, 
            backgroundColor: 'white', 
            borderRadius: 8,
            border: '1px solid #e5e7eb'
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>
              Etiquetas Existentes ({allTags.length})
            </h4>
            {allTags.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
                No hay etiquetas creadas aún
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allTags.map((tag) => (
                  <div
                    key={tag.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                      border: `1px solid ${tag.color}40`,
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 500
                    }}
                  >
                    {tag.icon && <span>{tag.icon}</span>}
                    <span>{tag.name}</span>
                    <button
                      onClick={() => deleteTag(tag.id)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: tag.color,
                        cursor: 'pointer',
                        fontSize: 12,
                        padding: 2,
                        borderRadius: 2
                      }}
                      title="Eliminar etiqueta"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {loading && <p>Cargando contactos...</p>}
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
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Nombre</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Etiquetas</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Próximo paso</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Etapa Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                    No hay contactos {pipelineStage ? 'con este filtro' : 'registrados'}
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const stageInfo = getStageInfo(contact.pipelineStageId);
                  return (
                    <tr 
                      key={contact.id} 
                      style={{ borderBottom: '1px solid #e5e7eb' }}
                    >
                      <td style={{ padding: 12 }}>
                        <Link 
                          href={`/contacts/${contact.id}`}
                          style={{ color: '#3b82f6', fontWeight: 500, textDecoration: 'none' }}
                        >
                          {contact.fullName}
                        </Link>
                      </td>
                      <td style={{ padding: 12 }}>
                        <TagSelector 
                          contact={contact}
                          allTags={allTags}
                          onAddTag={addTagToContact}
                          onRemoveTag={removeTagFromContact}
                          token={token}
                          apiUrl={apiUrl}
                        />
                      </td>
                      <td style={{ padding: 12 }}>
                        <input
                          type="text"
                          placeholder="Ej: Llamar mañana, Enviar propuesta..."
                          defaultValue={contact.nextStep || ''}
                          style={{
                            width: '100%',
                            minWidth: 200,
                            padding: '6px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            border: '1px solid #d1d5db',
                            backgroundColor: '#ffffff',
                            color: '#374151',
                            outline: 'none',
                            transition: 'border-color 0.2s ease'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#3b82f6';
                            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.boxShadow = 'none';
                            // Guardar cuando el usuario sale del campo
                            if (e.target.value !== (contact.nextStep || '')) {
                              handleNextStepChange(contact.id, e.target.value);
                            }
                          }}
                          onKeyPress={(e) => {
                            // Guardar cuando el usuario presiona Enter
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                        />
                      </td>
                      <td style={{ padding: 12 }}>
                        <select
                          value={contact.pipelineStageId || ''}
                          onChange={(e) => handleStageChange(contact.id, e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            backgroundColor: `${stageInfo.color}20`,
                            color: stageInfo.color,
                            border: `1px solid ${stageInfo.color}40`,
                            cursor: 'pointer',
                            outline: 'none',
                            minWidth: 150
                          }}
                        >
                          {!contact.pipelineStageId && (
                            <option value="">Sin etapa</option>
                          )}
                          {stages.map((stage) => (
                            <option key={stage.id} value={stage.id}>
                              {stage.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {contacts.length > 0 && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              textAlign: 'center',
              color: '#6b7280',
              fontSize: 14
            }}>
              Mostrando {contacts.length} contacto(s)
            </div>
          )}
        </div>
      )}
      </main>
    </>
  );
}
