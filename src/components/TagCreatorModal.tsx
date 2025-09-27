import React, { useState, useEffect } from 'react';
import { X, Tag as TagIcon, Plus, Edit2, Trash2, Save, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Tag } from '../types/crm';
import { cn } from '../utils/cn';
import { useCRMStore } from '../store/crmStore';
import { toast } from 'sonner';

interface TagCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditingTag {
  id: string;
  name: string;
  color: string;
  backgroundColor: string;
}

const TagCreatorModal: React.FC<TagCreatorModalProps> = ({ isOpen, onClose }) => {
  const { tags, createTag, deleteTag, updateTag } = useCRMStore();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#ffffff');
  const [newTagBgColor, setNewTagBgColor] = useState('#3b82f6');
  const [editingTag, setEditingTag] = useState<EditingTag | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Colores predefinidos para etiquetas
  const predefinedColors = [
    { bg: '#ef4444', text: '#ffffff', name: 'Rojo' },
    { bg: '#f97316', text: '#ffffff', name: 'Naranja' },
    { bg: '#eab308', text: '#000000', name: 'Amarillo' },
    { bg: '#22c55e', text: '#ffffff', name: 'Verde' },
    { bg: '#3b82f6', text: '#ffffff', name: 'Azul' },
    { bg: '#8b5cf6', text: '#ffffff', name: 'Púrpura' },
    { bg: '#ec4899', text: '#ffffff', name: 'Rosa' },
    { bg: '#6b7280', text: '#ffffff', name: 'Gris' }
  ];

  // Limpiar formulario
  const clearForm = () => {
    setNewTagName('');
    setNewTagColor('#ffffff');
    setNewTagBgColor('#3b82f6');
    setEditingTag(null);
  };

  // Limpiar feedback después de 3 segundos
  useEffect(() => {
    if (feedback.type) {
      const timer = setTimeout(() => {
        setFeedback({ type: null, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Crear nueva etiqueta
  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      setFeedback({ type: 'error', message: 'El nombre de la etiqueta es requerido' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createTag({
        name: newTagName.trim(),
        color: newTagColor,
        backgroundColor: newTagBgColor
      });

      if (result) {
        setFeedback({ type: 'success', message: 'Etiqueta creada correctamente' });
        clearForm();
      } else {
        setFeedback({ type: 'error', message: 'Error al crear la etiqueta' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Error inesperado al crear la etiqueta' });
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar edición de etiqueta
  const handleEditTag = (tag: Tag) => {
    setEditingTag({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      backgroundColor: tag.backgroundColor
    });
  };

  // Guardar edición de etiqueta
  const handleSaveEdit = async () => {
    if (!editingTag || !editingTag.name.trim()) {
      setFeedback({ type: 'error', message: 'El nombre de la etiqueta es requerido' });
      return;
    }

    setIsLoading(true);
    try {
      // Usar updateTag en lugar de eliminar y crear
      const result = await updateTag(editingTag.id, {
        name: editingTag.name.trim(),
        color: editingTag.color,
        backgroundColor: editingTag.backgroundColor
      });

      if (result) {
        setFeedback({ type: 'success', message: 'Etiqueta actualizada correctamente' });
        setEditingTag(null);
      } else {
        setFeedback({ type: 'error', message: 'Error al actualizar la etiqueta' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Error inesperado al actualizar la etiqueta' });
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar etiqueta
  const handleDeleteTag = async (tagId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta etiqueta? Se eliminará de todos los contactos.')) {
      setIsLoading(true);
      try {
        const result = await deleteTag(tagId);
        if (result && result.success) {
          setFeedback({ type: 'success', message: result.message || 'Etiqueta eliminada correctamente' });
        } else {
          setFeedback({ type: 'error', message: result?.error || 'Error al eliminar la etiqueta' });
        }
      } catch (error) {
        console.error('Error eliminando etiqueta:', error);
        setFeedback({ type: 'error', message: 'Error al eliminar la etiqueta' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Refrescar etiquetas
  const handleRefreshTags = async () => {
    setIsRefreshing(true);
    try {
      // Las etiquetas se cargan automáticamente con el store
      setFeedback({ type: 'success', message: 'Etiquetas actualizadas' });
    } catch (error) {
      console.error('Error refrescando etiquetas:', error);
      setFeedback({ type: 'error', message: 'Error al actualizar las etiquetas' });
    } finally {
      setIsRefreshing(false);
    }
  };
  const handleColorSelect = (color: { bg: string; text: string }) => {
    if (editingTag) {
      setEditingTag({
        ...editingTag,
        backgroundColor: color.bg,
        color: color.text
      });
    } else {
      setNewTagBgColor(color.bg);
      setNewTagColor(color.text);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <TagIcon className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Gestión de Etiquetas
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {/* Botón de restablecimiento sutil */}
            <button
              onClick={handleRefreshTags}
              disabled={isRefreshing || isLoading}
              className="p-2 text-gray-400 hover:text-cactus-600 dark:hover:text-cactus-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Restablecer etiquetas desde la base de datos"
            >
              <RefreshCw className={cn(
                "w-4 h-4",
                isRefreshing && "animate-spin"
              )} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Feedback */}
          {feedback.type && (
            <div className={cn(
              "mb-4 p-3 rounded-lg flex items-center space-x-2",
              feedback.type === 'success' 
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
            )}>
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="text-sm">{feedback.message}</span>
            </div>
          )}

          {/* Crear nueva etiqueta */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Crear Nueva Etiqueta
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre de la etiqueta
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Ej: Cliente VIP, Prospecto caliente..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled={isLoading}
                />
              </div>

              {/* Vista previa */}
              {newTagName && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Vista previa:</span>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: newTagBgColor,
                      color: newTagColor
                    }}
                  >
                    {newTagName}
                  </span>
                </div>
              )}

              {/* Colores predefinidos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Seleccionar color
                </label>
                <div className="flex flex-wrap gap-2">
                  {predefinedColors.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => handleColorSelect(color)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        newTagBgColor === color.bg
                          ? "border-gray-900 dark:border-white scale-110"
                          : "border-gray-300 dark:border-gray-600 hover:scale-105"
                      )}
                      style={{ backgroundColor: color.bg }}
                      title={color.name}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateTag}
                disabled={isLoading || !newTagName.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Creando...' : 'Crear Etiqueta'}</span>
              </button>
            </div>
          </div>

          {/* Lista de etiquetas existentes */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Etiquetas Existentes ({tags.length})
            </h3>
            
            {tags.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <TagIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay etiquetas creadas</p>
                <p className="text-sm">Crea tu primera etiqueta arriba</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    {editingTag?.id === tag.id ? (
                      // Modo edición
                      <div className="flex-1 flex items-center space-x-3">
                        <input
                          type="text"
                          value={editingTag.name}
                          onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          disabled={isLoading}
                        />
                        
                        {/* Colores para edición */}
                        <div className="flex space-x-1">
                          {predefinedColors.slice(0, 4).map((color, index) => (
                            <button
                              key={index}
                              onClick={() => handleColorSelect(color)}
                              className={cn(
                                "w-6 h-6 rounded-full border transition-all",
                                editingTag.backgroundColor === color.bg
                                  ? "border-gray-900 dark:border-white scale-110"
                                  : "border-gray-300 dark:border-gray-600"
                              )}
                              style={{ backgroundColor: color.bg }}
                              disabled={isLoading}
                            />
                          ))}
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={isLoading}
                            className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingTag(null)}
                            disabled={isLoading}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Modo vista
                      <>
                        <div className="flex items-center space-x-3">
                          <span
                            className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: tag.backgroundColor,
                              color: tag.color
                            }}
                          >
                            {tag.name}
                          </span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditTag(tag)}
                            className="p-1 text-gray-400 hover:text-cactus-600 transition-colors"
                            title="Editar etiqueta"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar etiqueta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagCreatorModal;