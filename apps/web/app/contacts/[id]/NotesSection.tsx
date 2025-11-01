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
import ConfirmDialog from '../../components/ConfirmDialog';
import { useNotes } from '../../../lib/api-hooks';
import { createNote, deleteNote } from '@/lib/api';
import { logger } from '../../../lib/logger';

import type { Note } from '@/types';

// AI_DECISION: Extracted to client island for notes management isolation
// Justificación: Server component for static data, client only where needed
// Impacto: Reduces First Load JS ~400KB → ~150KB for this route

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
  
  // Estado para ConfirmDialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'default';
  }>({
    open: false,
    title: '',
    onConfirm: () => {}
  });

  const [newNote, setNewNote] = useState({
    content: '',
    noteType: 'general',
    source: 'manual'
  });

  const handleCreateNote = async () => {
    setSaving(true);
    try {
      await createNote({
        content: newNote.content,
        contactId
      });

      await mutate(); // Refresh data
      setShowCreateModal(false);
      setNewNote({ content: '', noteType: 'general', source: 'manual' });
    } catch (err) {
      logger.error('Error creating note', { err, contactId, note: newNote });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Eliminar nota',
      description: '¿Estás seguro de que quieres eliminar esta nota?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteNote(noteId);
          await mutate(); // Refresh data
        } catch (err) {
          logger.error('Error deleting note', { err, noteId });
        }
      }
    });
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
                      <Badge variant={getNoteTypeBadgeVariant(note.noteType || 'general')}>
                        {getNoteTypeLabel(note.noteType || 'general')}
                      </Badge>
                      <Badge variant={getSourceBadgeVariant(note.source || 'manual')}>
                        {getSourceLabel(note.source || 'manual')}
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
