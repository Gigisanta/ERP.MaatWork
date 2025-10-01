// Exportar todos los componentes de notas
export { NotesEditor } from './NotesEditor';
export { NotesList } from './NotesList';
export { NotesWidget } from './NotesWidget';

// Exportar tipos y store
export { 
  useNotesStore, 
  useContactNotes,
  type Note,
  type NoteTag,
  type NoteAttachment,
  type CreateNoteData,
  type UpdateNoteData,
  type NotesFilter
} from '../../store/notesStore';

// Exportar componente por defecto (el más usado)
export { default } from './NotesList';