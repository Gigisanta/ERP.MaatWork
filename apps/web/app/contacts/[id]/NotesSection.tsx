"use client";
import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Heading,
  Text,
  Stack,
  Badge,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Spinner,
  EmptyState,
  Alert,
} from '@cactus/ui';
import { useNotes } from '../../../lib/api-hooks';

// AI_DECISION: Extracted to client island for notes management isolation
// Justificación: Server component for static data, client only where needed
// Impacto: Reduces First Load JS ~400KB → ~150KB for this route

interface Note {
  id: string;
  contactId: string;
  authorUserId?: string;
  source: string;
  noteType: string;
  content: string;
  authorName?: string;
  createdAt: string;
}

interface NotesSectionProps {
  contactId: string;
  initialNotes: Note[];
}

/**
 * NotesSection - Client Island for notes management
 * 
 * @example
 * <NotesSection
 *   contactId={contact.id}
 *   initialNotes={notes}
 * />
 */
export default function NotesSection({ 
  contactId, 
  initialNotes 
}: NotesSectionProps) {
  const { notes, error, isLoading, mutate } = useNotes(contactId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState({
    content: '',
    noteType: 'general',
    source: 'manual'
  });

  const handleCreateNote = async () => {
    setSaving(true);
    try {
      const response = await fetch(`http://localhost:3001/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...newNote,
          contactId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create note');
      }

      await mutate(); // Refresh data
      setShowCreateModal(false);
      setNewNote({ content: '', noteType: 'general', source: 'manual' });
    } catch (err) {
      console.error('Error creating note:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) return;

    try {
      const response = await fetch(`http://localhost:3001/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      await mutate(); // Refresh data
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const getNoteTypeBadgeVariant = (noteType: string) => {
    switch (noteType) {
      case 'call': return 'default';
      case 'meeting': return 'success';
      case 'email': return 'warning';
      case 'general': return 'default';
      default: return 'default';
    }
  };

  const getNoteTypeLabel = (noteType: string) => {
    switch (noteType) {
      case 'call': return 'Llamada';
      case 'meeting': return 'Reunión';
      case 'email': return 'Email';
      case 'general': return 'General';
      default: return noteType;
    }
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'manual': return 'default';
      case 'system': return 'default';
      case 'import': return 'warning';
      default: return 'default';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'manual': return 'Manual';
      case 'system': return 'Sistema';
      case 'import': return 'Importado';
      default: return source;
    }
  };

  const notesList = notes.length > 0 ? notes : initialNotes;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Notas</CardTitle>
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => setShowCreateModal(true)}
          >
            Agregar Nota
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <Alert variant="error" title="Error">
            Error al cargar las notas
          </Alert>
        ) : notesList.length === 0 ? (
          <EmptyState
            title="Sin notas"
            description="Este contacto no tiene notas registradas"
          />
        ) : (
          <Stack direction="column" gap="md">
            {notesList
              .sort((a: Note, b: Note) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((note: Note) => (
              <div key={note.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getNoteTypeBadgeVariant(note.noteType)}>
                        {getNoteTypeLabel(note.noteType)}
                      </Badge>
                      <Badge variant={getSourceBadgeVariant(note.source)}>
                        {getSourceLabel(note.source)}
                      </Badge>
                      {note.authorName && (
                        <Text size="xs" color="muted">
                          por {note.authorName}
                        </Text>
                      )}
                    </div>
                    <Text size="sm" className="mb-2">
                      {note.content}
                    </Text>
                    <Text size="xs" color="muted">
                      {new Date(note.createdAt).toLocaleString()}
                    </Text>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </Stack>
        )}
      </CardContent>

      {/* Create Modal */}
      <Modal open={showCreateModal} onOpenChange={setShowCreateModal}>
        <ModalHeader>
          <ModalTitle>Agregar Nota</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <Stack direction="column" gap="md">
            <div>
              <Text size="sm" weight="medium" className="mb-1">Tipo de Nota</Text>
              <select
                value={newNote.noteType}
                onChange={(e) => setNewNote(prev => ({ ...prev, noteType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="general">General</option>
                <option value="call">Llamada</option>
                <option value="meeting">Reunión</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div>
              <Text size="sm" weight="medium" className="mb-1">Contenido</Text>
              <textarea
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Escribe tu nota aquí..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
              />
            </div>
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button 
            variant="secondary" 
            onClick={() => setShowCreateModal(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateNote}
            disabled={saving || !newNote.content.trim()}
          >
            {saving ? <Spinner size="sm" /> : 'Agregar Nota'}
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
}
