import React, { useState, useEffect } from 'react';
import { X, Save, Tag, Paperclip, AlertCircle, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { useNotesStore, CreateNoteData, UpdateNoteData } from '../../store/notesStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
// Removed LayoutConfig import - using Cactus Dashboard palette

interface NotesEditorProps {
  contactId: string;
  noteId?: string; // Para edición
  onClose: () => void;
  onSave?: (note: any) => void;
}

const NOTE_TYPES = [
  { value: 'call', label: 'Llamada', icon: Phone, color: 'bg-cactus-100 dark:bg-cactus-900/30 text-cactus-700 dark:text-cactus-400' },
  { value: 'meeting', label: 'Reunión', icon: Calendar, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  { value: 'email', label: 'Email', icon: Mail, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  { value: 'general', label: 'General', icon: FileText, color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300' }
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Baja', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  { value: 'medium', label: 'Media', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  { value: 'high', label: 'Alta', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' }
];

export const NotesEditor: React.FC<NotesEditorProps> = ({
  contactId,
  noteId,
  onClose,
  onSave
}) => {
  const { 
    notes,
    isLoading: loading, 
    createNote, 
    updateNote,
    canEditNote,
    canCreateNote
  } = useNotesStore();
  
  const { user } = useAuthStore();
  
  const [content, setContent] = useState('');
  const [type, setType] = useState<'call' | 'meeting' | 'email' | 'general'>('general');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = Boolean(noteId);

  // Obtener la nota seleccionada
  const selectedNote = noteId ? notes.find(note => note.id === noteId) : null;

  // Cargar datos de la nota si estamos editando
  useEffect(() => {
    if (isEditing && selectedNote && selectedNote.id === noteId) {
      setContent(selectedNote.content);
      setType(selectedNote.type);
      setPriority(selectedNote.priority);
      setIsPrivate(selectedNote.is_private);
      // Cargar tags si existen
      if (selectedNote.tags) {
        setTags(selectedNote.tags.map(tag => tag.name));
      }
    }
  }, [isEditing, noteId, selectedNote, notes]);

  // Validación
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!content.trim()) {
      newErrors.content = 'El contenido de la nota es requerido';
    }
    
    if (content.trim().length < 10) {
      newErrors.content = 'El contenido debe tener al menos 10 caracteres';
    }
    
    if (content.trim().length > 5000) {
      newErrors.content = 'El contenido no puede exceder 5000 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar guardado
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Por favor corrige los errores antes de guardar');
      return;
    }

    setIsSaving(true);
    
    try {
      if (isEditing && noteId) {
        // Actualizar nota existente
        const updateData: UpdateNoteData = {
          content: content.trim(),
          type,
          priority,
          is_private: isPrivate,
          metadata: { tags }
        };
        
        const updatedNote = await updateNote(noteId, updateData);
        
        if (updatedNote) {
          onSave?.(updatedNote);
          onClose();
        }
      } else {
        // Crear nueva nota
        const noteData: CreateNoteData = {
          contact_id: contactId,
          content: content.trim(),
          type,
          priority,
          is_private: isPrivate,
          metadata: { tags }
        };
        
        const newNote = await createNote(noteData);
        
        if (newNote) {
          onSave?.(newNote);
          onClose();
        }
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Manejar adición de etiquetas
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Remover etiqueta
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Manejar teclas en el input de etiquetas
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Prevenir cierre del modal al hacer clic en el contenido
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const selectedTypeConfig = NOTE_TYPES.find(t => t.value === type);
  const selectedPriorityConfig = PRIORITY_LEVELS.find(p => p.value === priority);

  // Verificar permisos
  const hasPermission = isEditing 
    ? (selectedNote && canEditNote(selectedNote))
    : canCreateNote(contactId);

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Acceso Denegado</h3>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">Debes iniciar sesión para acceder a esta funcionalidad.</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Sin Permisos</h3>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            {isEditing 
              ? 'No tienes permisos para editar esta nota.'
              : 'No tienes permisos para crear notas en este contacto.'
            }
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={handleContentClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {isEditing ? 'Editar Nota' : 'Agregar Nueva Nota'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            disabled={isSaving}
          >
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Tipo y Prioridad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de nota */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Tipo de Nota
              </label>
              <div className="grid grid-cols-2 gap-2">
                {NOTE_TYPES.map((noteType) => {
                  const Icon = noteType.icon;
                  return (
                    <button
                      key={noteType.value}
                      type="button"
                      onClick={() => setType(noteType.value as any)}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        type === noteType.value
                          ? "border-cactus-500 bg-cactus-50 dark:bg-cactus-900/20 text-cactus-700 dark:text-cactus-400"
                          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{noteType.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Prioridad
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITY_LEVELS.map((priorityLevel) => (
                  <button
                    key={priorityLevel.value}
                    type="button"
                    onClick={() => setPriority(priorityLevel.value as any)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      priority === priorityLevel.value
                        ? "border-cactus-500 bg-cactus-50 dark:bg-cactus-900/20 text-cactus-700 dark:text-cactus-400"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <span className="text-sm font-medium">{priorityLevel.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contenido de la nota */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              Contenido de la Nota *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              placeholder="Escribe el contenido de tu nota aquí..."
              rows={8}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500 resize-none ${
                errors.content ? "border-red-500 dark:border-red-400" : "border-neutral-200 dark:border-neutral-700"
              } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100`}
              disabled={isSaving}
            />
            {errors.content && (
              <div className="mt-1 flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errors.content}
              </div>
            )}
            <div className="mt-1 text-right text-sm text-neutral-600 dark:text-neutral-400">
              {content.length}/5000 caracteres
            </div>
          </div>

          {/* Etiquetas */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              Etiquetas
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-cactus-100 dark:bg-cactus-900/30 text-cactus-700 dark:text-cactus-400 rounded-full text-sm"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:bg-cactus-200 dark:hover:bg-cactus-800 rounded-full p-0.5"
                    disabled={isSaving}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleTagKeyPress}
                placeholder="Agregar etiqueta..."
                className="flex-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-cactus-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                disabled={isSaving}
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim() || isSaving}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Opciones adicionales */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 text-cactus-600 border-neutral-200 dark:border-neutral-700 rounded focus:ring-2 focus:ring-cactus-500"
                disabled={isSaving}
              />
              <span className="text-sm text-neutral-900 dark:text-neutral-100">Nota privada</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            {selectedTypeConfig && (
              <span className={`px-2 py-1 rounded-full text-xs ${selectedTypeConfig.color}`}>
                {selectedTypeConfig.label}
              </span>
            )}
            {selectedPriorityConfig && (
              <span className={`px-2 py-1 rounded-full text-xs ${selectedPriorityConfig.color}`}>
                Prioridad {selectedPriorityConfig.label}
              </span>
            )}
            {isPrivate && (
              <span className="px-2 py-1 rounded-full text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                Privada
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !content.trim()}
              className="px-4 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Actualizar' : 'Guardar'} Nota
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesEditor;