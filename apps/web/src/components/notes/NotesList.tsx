import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, Calendar, User, Tag, Paperclip, Eye, EyeOff, Clock, AlertCircle, CheckCircle, CheckSquare, Star, Phone, Mail, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useNotesStore } from '../../store/notesStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import type { Note, NotesFilter } from '../../store/notesStore';
import NotesEditor from './NotesEditor';
// Removed LayoutConfig import - using Cactus Dashboard palette

interface NotesListProps {
  contactId: string;
  onNoteSelect?: (note: Note) => void;
}

const NOTE_TYPE_CONFIG = {
  call: { label: 'Llamada', icon: Phone, color: 'bg-cactus-100 dark:bg-cactus-900/30 text-cactus-700 dark:text-cactus-400 border-cactus-200 dark:border-cactus-700' },
  meeting: { label: 'Reunión', icon: Calendar, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700' },
  email: { label: 'Email', icon: Mail, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700' },
  task: { label: 'Tarea', icon: CheckSquare, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700' },
  note: { label: 'Nota', icon: FileText, color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700' }
};

const PRIORITY_CONFIG = {
  low: { label: 'Baja', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  medium: { label: 'Media', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  high: { label: 'Alta', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  urgent: { label: 'Urgente', color: 'bg-red-600 dark:bg-red-700 text-white' }
};

export const NotesList: React.FC<NotesListProps> = ({ contactId, onNoteSelect }) => {
  const {
    notes,
    isLoading: loading,
    error,
    fetchNotes,
    updateNote,
    deleteNote,
    canViewNote,
    canEditNote,
    canDeleteNote,
    canCreateNote
  } = useNotesStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showPrivateNotes, setShowPrivateNotes] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Cargar notas al montar el componente
  useEffect(() => {
    if (contactId) {
      fetchNotes(contactId);
    }
  }, [contactId, fetchNotes]);

  // Filtrar notas según criterios de búsqueda y filtros
  const filteredNotes = useMemo(() => {
    let filtered = notes.filter(note => 
      note.contact_id === contactId && canViewNote(note)
    );
    
    // Filtro de búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.content.toLowerCase().includes(query) ||
        note.author?.toLowerCase().includes(query)
      );
    }
    
    // Filtro por tipo
    if (selectedType !== 'all') {
      filtered = filtered.filter(note => note.type === selectedType);
    }
    
    // Filtro por prioridad
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(note => note.priority === selectedPriority);
    }
    
    // Filtro de notas privadas
    if (!showPrivateNotes) {
      filtered = filtered.filter(note => !note.is_private);
    }
    
    // Ordenar por fecha (más recientes primero)
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notes, contactId, searchQuery, selectedType, selectedPriority, showPrivateNotes, canViewNote]);

  // Manejar eliminación de nota
  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
      const success = await deleteNote(noteId);
      if (success) {
        toast.success('Nota eliminada exitosamente');
      }
    }
  };

  // Manejar edición de nota
  const handleEditNote = (noteId: string) => {
    setEditingNoteId(noteId);
    setShowEditor(true);
  };

  // Manejar creación de nueva nota
  const handleNewNote = () => {
    setEditingNoteId(null);
    setShowEditor(true);
  };

  // Cerrar editor
  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingNoteId(null);
  };

  // Expandir/contraer nota
  const toggleNoteExpansion = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)} horas`;
    } else if (diffInHours < 48) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Truncar contenido
  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <div className="w-5 h-5 border-2 border-cactus-600 border-t-transparent rounded-full animate-spin" />
          Cargando notas...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>Error al cargar las notas: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con búsqueda y filtros */}
      <div className="space-y-3">
        {/* Barra de búsqueda y botones */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar en notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${
              showFilters 
                ? "bg-cactus-50 dark:bg-cactus-900/20 border-cactus-200 dark:border-cactus-700 text-cactus-700 dark:text-cactus-400"
                 : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
          {canCreateNote(contactId) && (
            <button
              onClick={handleNewNote}
              className="px-4 py-2 bg-cactus-600 hover:bg-cactus-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Nota
            </button>
          )}
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro por tipo */}
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                  Tipo de Nota
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
                >
                  <option value="all">Todos los tipos</option>
                  {Object.entries(NOTE_TYPE_CONFIG).map(([value, config]) => (
                    <option key={value} value={value}>{config.label}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por prioridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500"
                >
                  <option value="all">Todas las prioridades</option>
                  {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                    <option key={value} value={value}>{config.label}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de notas privadas */}
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrivateNotes}
                    onChange={(e) => setShowPrivateNotes(e.target.checked)}
                    className="w-4 h-4 text-cactus-600 border-neutral-300 dark:border-neutral-600 rounded focus:ring-cactus-500"
                  />
                  <span className="text-sm text-neutral-900 dark:text-neutral-100">Mostrar notas privadas</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de notas */}
      <div className="space-y-3">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-8 text-neutral-600 dark:text-neutral-400">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-400 dark:text-neutral-500" />
            <p className="text-lg font-medium mb-1">No hay notas</p>
            <p className="text-sm">
              {notes.length === 0 
                ? 'Aún no se han creado notas para este contacto'
                : 'No se encontraron notas que coincidan con los filtros'
              }
            </p>
            {notes.length === 0 && canCreateNote(contactId) && (
              <button
                onClick={handleNewNote}
                className="mt-4 px-4 py-2 bg-cactus-600 hover:bg-cactus-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Crear primera nota
              </button>
            )}
          </div>
        ) : (
          filteredNotes.map((note) => {
            const typeConfig = NOTE_TYPE_CONFIG[note.type];
            const priorityConfig = PRIORITY_CONFIG[note.priority];
            const TypeIcon = typeConfig.icon;
            const isExpanded = expandedNotes.has(note.id);
            const shouldShowExpand = note.content.length > 150;

            return (
              <div
                key={note.id}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Header de la nota */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                        {note.is_private && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center gap-1">
                            <EyeOff className="w-3 h-3" />
                            Privada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(note.createdAt.toISOString())}
                        {note.author && (
                          <>
                            <span>•</span>
                            <User className="w-3 h-3" />
                            {note.author}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div className="flex items-center gap-1">
                    {canEditNote(note) && (
                      <button
                        onClick={() => handleEditNote(note.id)}
                        className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-cactus-600 dark:hover:text-cactus-400 hover:bg-cactus-50 dark:hover:bg-cactus-900/20 rounded-lg transition-colors"
                        title="Editar nota"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDeleteNote(note) && (
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Eliminar nota"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenido de la nota */}
                <div className="mb-3">
                  <p className="text-neutral-900 dark:text-neutral-100 leading-relaxed">
                    {isExpanded ? note.content : truncateContent(note.content)}
                  </p>
                  {shouldShowExpand && (
                    <button
                      onClick={() => toggleNoteExpansion(note.id)}
                      className="mt-2 text-cactus-600 dark:text-cactus-400 hover:text-cactus-700 dark:hover:text-cactus-300 text-sm font-medium flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Ver menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Ver más
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Etiquetas */}
                {note.metadata?.tags && note.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.metadata.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-xs"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Estadísticas */}
      {filteredNotes.length > 0 && (
        <div className="text-center text-sm text-neutral-600 dark:text-neutral-400 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          Mostrando {filteredNotes.length} de {notes.length} notas
        </div>
      )}

      {/* Editor de notas */}
      {showEditor && (
        <NotesEditor
          contactId={contactId}
          noteId={editingNoteId || undefined}
          onClose={handleCloseEditor}
          onSave={() => {
            if (contactId) {
              fetchNotes(contactId);
            }
          }}
        />
      )}
    </div>
  );
};

export default NotesList;